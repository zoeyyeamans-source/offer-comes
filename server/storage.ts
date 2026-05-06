import { applications, dailyStats, type Application, type InsertApplication, type DailyStats } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getApplications(userId: string): Promise<Application[]>;
  getApplicationsByDate(userId: string, date: string): Promise<Application[]>;
  getApplication(id: number): Promise<Application | undefined>;
  createApplication(app: InsertApplication): Promise<Application>;
  updateApplication(id: number, app: Partial<InsertApplication>): Promise<Application | undefined>;
  deleteApplication(id: number): Promise<boolean>;
  getDailyStats(userId: string, date: string): Promise<DailyStats | undefined>;
  upsertDailyStats(userId: string, date: string, data: { totalApplied?: number; totalRejected?: number }): Promise<DailyStats>;
  getAllDailyStats(userId: string): Promise<DailyStats[]>;
  getOverviewStats(userId: string): Promise<{
    totalApplied: number;
    interviews: number;
    offers: number;
    refused: number;
    noAnswer: number;
    rejectedBeforeInterview: number;
    rejectedAfterInterview: number;
    accepted: number;
    declined: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getApplications(userId: string): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.userId, userId));
  }

  async getApplicationsByDate(userId: string, date: string): Promise<Application[]> {
    return db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.appliedDate, date)));
  }

  async getApplication(id: number): Promise<Application | undefined> {
    const [app] = await db.select().from(applications).where(eq(applications.id, id));
    return app;
  }

  async createApplication(app: InsertApplication): Promise<Application> {
    const [created] = await db.insert(applications).values(app).returning();
    return created;
  }

  async updateApplication(id: number, app: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updated] = await db.update(applications).set(app).where(eq(applications.id, id)).returning();
    return updated;
  }

  async deleteApplication(id: number): Promise<boolean> {
    const [deleted] = await db.delete(applications).where(eq(applications.id, id)).returning();
    return !!deleted;
  }

  async getDailyStats(userId: string, date: string): Promise<DailyStats | undefined> {
    const [stats] = await db.select().from(dailyStats).where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date)));
    return stats;
  }

  async upsertDailyStats(userId: string, date: string, data: { totalApplied?: number; totalRejected?: number }): Promise<DailyStats> {
    const existing = await this.getDailyStats(userId, date);
    if (existing) {
      const updateData: any = {};
      if (data.totalApplied !== undefined) updateData.totalApplied = data.totalApplied;
      if (data.totalRejected !== undefined) updateData.totalRejected = data.totalRejected;
      const [updated] = await db.update(dailyStats).set(updateData).where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date))).returning();
      return updated;
    } else {
      const [created] = await db.insert(dailyStats).values({
        userId,
        date,
        totalApplied: data.totalApplied ?? 0,
        totalRejected: data.totalRejected ?? 0,
      }).returning();
      return created;
    }
  }

  async syncDailyStatsWithApps(userId: string, date: string): Promise<void> {
    const apps = await this.getApplicationsByDate(userId, date);
    const totalAppsCount = apps.length;
    const rejectedCount = apps.filter(a => a.status === "rejected").length;

    const existing = await this.getDailyStats(userId, date);
    const currentApplied = existing?.totalApplied ?? 0;
    const currentRejected = existing?.totalRejected ?? 0;

    const newApplied = Math.max(currentApplied, totalAppsCount);
    const newRejected = Math.max(currentRejected, rejectedCount);

    if (newApplied !== currentApplied || newRejected !== currentRejected) {
      await this.upsertDailyStats(userId, date, { totalApplied: newApplied, totalRejected: newRejected });
    }
  }

  async getAllDailyStats(userId: string): Promise<DailyStats[]> {
    return db.select().from(dailyStats).where(eq(dailyStats.userId, userId));
  }

  async getFilteredStats(userId: string, startDate: string, endDate: string): Promise<{
    totalApplied: number;
    interviews: number;
    offers: number;
    refused: number;
    noAnswer: number;
    details: Array<{ date: string; company: string; position: string; status: string }>;
  }> {
    const allDailyStats = await this.getAllDailyStats(userId);
    const allApps = await this.getApplications(userId);

    const filteredDaily = allDailyStats.filter(d => d.date >= startDate && d.date <= endDate);
    const filteredApps = allApps.filter(a => a.appliedDate >= startDate && a.appliedDate <= endDate);

    const totalApplied = filteredDaily.reduce((sum, d) => sum + (d.totalApplied || 0), 0);
    const interviews = filteredApps.filter(a => a.status === "interview").length;
    const offers = filteredApps.filter(a => a.status === "offer").length;
    const refused = filteredDaily.reduce((sum, d) => sum + (d.totalRejected || 0), 0);
    const noAnswer = Math.max(totalApplied - refused - interviews, 0);

    return {
      totalApplied,
      interviews,
      offers,
      refused,
      noAnswer,
      details: filteredApps.map(a => ({ date: a.appliedDate, company: a.company, position: a.position, status: a.status })),
    };
  }

  async getOverviewStats(userId: string): Promise<{
    totalApplied: number;
    interviews: number;
    offers: number;
    refused: number;
    noAnswer: number;
    rejectedBeforeInterview: number;
    rejectedAfterInterview: number;
    accepted: number;
    declined: number;
  }> {
    const allDailyStats = await this.getAllDailyStats(userId);
    const allApps = await this.getApplications(userId);

    const totalApplied = allDailyStats.reduce((sum, d) => sum + (d.totalApplied || 0), 0);
    const totalRejected = allDailyStats.reduce((sum, d) => sum + (d.totalRejected || 0), 0);

    const companyMap = new Map<string, { hasInterview: boolean; hasOffer: boolean; hasRejected: boolean }>();
    for (const app of allApps) {
      const key = app.company.trim().toLowerCase();
      if (!companyMap.has(key)) companyMap.set(key, { hasInterview: false, hasOffer: false, hasRejected: false });
      const entry = companyMap.get(key)!;
      if (app.status === "interview" || app.interviewDate) entry.hasInterview = true;
      if (app.status === "offer") entry.hasOffer = true;
      if (app.status === "rejected") entry.hasRejected = true;
    }

    let interviewedCompanies = 0;
    let offers = 0;
    let rejectedAfterInterview = 0;
    for (const [, info] of companyMap) {
      const wentToInterview = info.hasInterview || info.hasOffer;
      if (wentToInterview) {
        interviewedCompanies++;
        if (info.hasOffer) offers++;
        else if (info.hasRejected) rejectedAfterInterview++;
      }
    }

    const rejectedBeforeInterview = Math.max(totalRejected - rejectedAfterInterview, 0);
    const noAnswer = Math.max(totalApplied - totalRejected - interviewedCompanies, 0);

    return {
      totalApplied,
      interviews: interviewedCompanies,
      offers,
      refused: totalRejected,
      noAnswer,
      rejectedBeforeInterview,
      rejectedAfterInterview,
      accepted: offers,
      declined: 0,
    };
  }
}

export const storage = new DatabaseStorage();

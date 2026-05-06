import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertApplicationSchema } from "@shared/schema";
// import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

function getUserId(req: any): string {
  if (req.user?.claims?.sub) return req.user.claims.sub;
  const anonId = req.headers["x-anon-id"];
  if (anonId) return `anon_${anonId}`;
  return "anon_default";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // await setupAuth(app);
  // registerAuthRoutes(app);
  app.get("/api/auth/user", async (_req, res) => {
  res.json({
    id: "anon_default",
    email: "demo@example.com",
    firstName: "Demo",
    lastName: "User",
    profileImageUrl: null,
  });
});

  app.get("/api/applications", async (req, res) => {
    const userId = getUserId(req);
    const apps = await storage.getApplications(userId);
    res.json(apps);
  });

  app.get("/api/applications/date/:date", async (req, res) => {
    const userId = getUserId(req);
    const apps = await storage.getApplicationsByDate(userId, req.params.date);
    res.json(apps);
  });

  app.get("/api/applications/stats", async (req, res) => {
    const userId = getUserId(req);
    const stats = await storage.getOverviewStats(userId);
    res.json(stats);
  });

  app.get("/api/applications/calendar", async (req, res) => {
    const userId = getUserId(req);
    const apps = await storage.getApplications(userId);
    const allDailyStats = await storage.getAllDailyStats(userId);
    const calendarData: Record<string, { count: number; hasInterview: boolean; interviewCompany?: string; interviewTime?: string }> = {};

    for (const ds of allDailyStats) {
      if (ds.totalApplied > 0) {
        calendarData[ds.date] = { count: ds.totalApplied, hasInterview: false };
      }
    }

    for (const app of apps) {
      if (app.status === "interview" && app.interviewDate) {
        const iKey = app.interviewDate;
        if (!calendarData[iKey]) {
          calendarData[iKey] = { count: 0, hasInterview: false };
        }
        calendarData[iKey].hasInterview = true;
        calendarData[iKey].interviewCompany = app.company;
        calendarData[iKey].interviewTime = app.interviewTime || undefined;
      }
    }
    res.json(calendarData);
  });

  app.get("/api/daily-stats/:date", async (req, res) => {
    const userId = getUserId(req);
    const stats = await storage.getDailyStats(userId, req.params.date);
    res.json(stats || { date: req.params.date, totalApplied: 0, totalRejected: 0 });
  });

  app.put("/api/daily-stats/:date", async (req, res) => {
    const userId = getUserId(req);
    const { totalApplied, totalRejected } = req.body;
    const stats = await storage.upsertDailyStats(userId, req.params.date, { totalApplied, totalRejected });
    res.json(stats);
  });

  app.get("/api/applications/report", async (req, res) => {
    const userId = getUserId(req);
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "start and end query params required" });
    }
    const stats = await storage.getFilteredStats(userId, startDate, endDate);
    res.json(stats);
  });

  app.post("/api/applications", async (req, res) => {
    const userId = getUserId(req);
    const body = { ...req.body, userId };
    const parsed = insertApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const app = await storage.createApplication(parsed.data);
    await storage.syncDailyStatsWithApps(userId, app.appliedDate);
    res.status(201).json(app);
  });

  app.patch("/api/applications/:id", async (req, res) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const existing = await storage.getApplication(id);
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    const oldDate = existing.appliedDate;
    const updated = await storage.updateApplication(id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    await storage.syncDailyStatsWithApps(userId, updated.appliedDate);
    if (oldDate !== updated.appliedDate) {
      await storage.syncDailyStatsWithApps(userId, oldDate);
    }
    res.json(updated);
  });

  app.delete("/api/applications/:id", async (req, res) => {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const existing = await storage.getApplication(id);
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    const appDate = existing.appliedDate;
    const deleted = await storage.deleteApplication(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    await storage.syncDailyStatsWithApps(userId, appDate);
    res.status(204).send();
  });

  return httpServer;
}

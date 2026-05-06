import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Clock, Calendar as CalendarIcon, FileText, CheckCircle2, XCircle, HelpCircle, Plus, ChevronRight, ChevronLeft, Printer, Filter, Search, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Application } from "@shared/schema";

const fireConfetti = () => {
  const duration = 2000;
  const end = Date.now() + duration;
  const colors = ['#4ade80', '#a78bfa', '#fbbf24', '#f472b6', '#60a5fa'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

export default function Dashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [expandedAppId, setExpandedId] = useState<number | null>(null);
  const { user } = useAuth();
  const [newCompany, setNewCompany] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("applied");
  const today = new Date();
  const [filterStart, setFilterStart] = useState(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [filterEnd, setFilterEnd] = useState(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const queryClient = useQueryClient();


  const selectedDateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : "";

  const { data: allApps = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const { data: dayApps = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications/date", selectedDateStr],
    queryFn: async () => {
      if (!selectedDateStr) return [];
      const res = await fetch(`/api/applications/date/${selectedDateStr}`, {
        credentials: "include",
        headers: { "X-Anon-Id": localStorage.getItem("offercome_anon_id") || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedDateStr,
  });

  const { data: stats = { totalApplied: 0, interviews: 0, offers: 0, refused: 0, noAnswer: 0, rejectedBeforeInterview: 0, rejectedAfterInterview: 0, accepted: 0, declined: 0 } } = useQuery({
    queryKey: ["/api/applications/stats"],
  });

  const { data: reportData = { totalApplied: 0, interviews: 0, offers: 0, refused: 0, noAnswer: 0, details: [] } } = useQuery<{
    totalApplied: number; interviews: number; offers: number; refused: number; noAnswer: number;
    details: Array<{ date: string; company: string; position: string; status: string }>;
  }>({
    queryKey: ["/api/applications/report", filterStart, filterEnd],
    queryFn: async () => {
      const res = await fetch(`/api/applications/report?start=${filterStart}&end=${filterEnd}`, {
        credentials: "include",
        headers: { "X-Anon-Id": localStorage.getItem("offercome_anon_id") || "" },
      });
      return res.json();
    },
  });

  const { data: calendarData = {} } = useQuery<Record<string, { count: number; hasInterview: boolean; interviewCompany?: string; interviewTime?: string }>>({
    queryKey: ["/api/applications/calendar"],
  });

  const { data: dailyStatsData = { totalApplied: 0, totalRejected: 0 } } = useQuery<{ totalApplied: number; totalRejected: number }>({
    queryKey: ["/api/daily-stats", selectedDateStr],
    queryFn: async () => {
      if (!selectedDateStr) return { totalApplied: 0, totalRejected: 0 };
      const res = await fetch(`/api/daily-stats/${selectedDateStr}`, {
        credentials: "include",
        headers: { "X-Anon-Id": localStorage.getItem("offercome_anon_id") || "" },
      });
      return res.json();
    },
    enabled: !!selectedDateStr,
  });

  const handleAuthError = (_error: Error) => {
  };

  const updateDailyStatsMutation = useMutation({
    mutationFn: async (data: { totalApplied?: number; totalRejected?: number }) => {
      const res = await apiRequest("PUT", `/api/daily-stats/${selectedDateStr}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/report"] });
    },
    onError: handleAuthError,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { company: string; position: string; appliedDate: string; status: string }) => {
      const res = await apiRequest("POST", "/api/applications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/date"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-stats"] });
      setNewCompany("");
      setNewPosition("");
      setNewStatus("applied");
    },
    onError: handleAuthError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await apiRequest("PATCH", `/api/applications/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/date"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-stats"] });
    },
    onError: handleAuthError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/date"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-stats"] });
    },
    onError: handleAuthError,
  });

  const getDayData = (dayDate: Date) => {
    const key = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
    const data = calendarData[key];
    if (!data) return null;
    return {
      apps: data.count,
      hasDetails: data.count > 0,
      interview: data.hasInterview,
      interviewCompany: data.interviewCompany,
      interviewTime: data.interviewTime,
    };
  };

  const handleAddApplication = () => {
    if (!newCompany.trim() || !selectedDateStr) return;
    createMutation.mutate({
      company: newCompany.trim(),
      position: newPosition.trim() || "General Application",
      appliedDate: selectedDateStr,
      status: newStatus,
    });
  };


  return (
    <div className="min-h-screen bg-muted/30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background flex flex-col">
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <span className="font-serif font-bold text-lg">Offercome</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              {user.profileImageUrl && (
                <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.firstName || user.email}</span>
              <a href="/api/logout">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" data-testid="button-logout">
                  Log out
                </Button>
              </a>
            </div>
          ) : (
            <a href="/api/login">
              <Button variant="outline" size="sm" data-testid="button-sign-in">Sign In</Button>
            </a>
          )}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
            ME
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-8 shadow-sm border-muted overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              {(() => {
                const viewDate = date || new Date();
                const year = viewDate.getFullYear();
                const month = viewDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const monthName = viewDate.toLocaleString('en-US', { month: 'long' });
                const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                const prevMonth = () => setDate(new Date(year, month - 1, 1));
                const nextMonth = () => setDate(new Date(year, month + 1, 1));

                const cells: (number | null)[] = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                while (cells.length % 7 !== 0) cells.push(null);

                return (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {monthName} {year}
                      </h2>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-border/40">
                      {weekdays.map(d => (
                        <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 p-2">
                      {cells.map((day, i) => {
                        if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
                        const cellDate = new Date(year, month, day);
                        const dayData = getDayData(cellDate);
                        const isSelected = date && date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        return (
                          <div
                            key={day}
                            data-testid={`calendar-day-${day}`}
                            onClick={() => setDate(cellDate)}
                            className={`aspect-square rounded-sm p-1.5 sm:p-2 cursor-pointer transition-all relative bg-gray-50/60 shadow-[2px_2px_5px_rgba(0,0,0,0.08)] hover:shadow-[3px_3px_8px_rgba(0,0,0,0.12)] hover:-translate-y-0.5
                              ${isSelected ? 'bg-white shadow-[3px_3px_8px_rgba(0,0,0,0.15)]' : ''}
                              ${isToday ? 'bg-white/90' : ''}
                            `}
                          >
                            <div className="flex items-start justify-start">
                              <span
                                className={`text-2xl sm:text-3xl font-bold leading-none ${isToday ? 'text-primary' : isSelected ? 'text-primary' : 'text-foreground/30'}`}
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                              >
                                {day}
                              </span>
                            </div>
                            <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
                              {dayData && dayData.hasDetails && (
                                <div data-testid={`badge-day-${day}`} className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold bg-blue-200/80 text-blue-700">
                                  {dayData.apps}
                                </div>
                              )}
                              {dayData?.interview && (
                                <div className="flex items-center gap-0.5 text-purple-600 bg-purple-50 rounded-full px-1.5 py-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span className="text-[8px] sm:text-[9px] font-semibold truncate max-w-[60px]">{dayData.interviewCompany || "Interview"}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-end">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" /> Applications
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-purple-500" /> Interview
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 shadow-sm border-muted h-full flex flex-col">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif" data-testid="text-selected-date">
                  {date ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Select a date'}
                </CardTitle>
                <button
                  data-testid="btn-search-toggle"
                  onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                >
                  {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {searchOpen && (
                <div className="relative mt-2">
                  <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg border border-gray-200 bg-gray-50/50 focus-within:ring-1 focus-within:ring-purple-300 focus-within:border-purple-300">
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      data-testid="input-search"
                      type="text"
                      placeholder="Search company or job..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-gray-400"
                    />
                  </div>
                  {searchQuery.trim().length > 0 && (() => {
                    const q = searchQuery.toLowerCase();
                    const results = allApps.filter(a =>
                      a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q)
                    ).slice(0, 8);
                    return results.length > 0 ? (
                      <div className="absolute z-20 top-9 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                        {results.map(a => (
                          <button
                            key={a.id}
                            data-testid={`search-result-${a.id}`}
                            onClick={() => {
                              const d = new Date(a.appliedDate + 'T00:00:00');
                              setDate(d);
                              setSearchQuery("");
                              setSearchOpen(false);
                              setTimeout(() => setExpandedId(a.id), 300);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors border-b last:border-b-0 border-gray-100"
                          >
                            <div className="text-sm font-medium text-gray-800">{a.company}</div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              <span>{a.position}</span>
                              <span className="text-gray-300">|</span>
                              <span>{a.appliedDate}</span>
                              <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${a.status === 'interview' ? 'bg-purple-100 text-purple-700' : a.status === 'offer' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="absolute z-20 top-9 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-xs text-gray-400">No results found</div>
                    );
                  })()}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="flex-1 h-[320px] md:h-[400px] overflow-y-auto p-4">
                <div className="flex gap-3 mb-6 items-end">
                  <div className="flex flex-col items-center justify-center border border-border/60 rounded-3xl bg-white shadow-sm w-32 h-32 hover:bg-gray-50 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[#827db8]"></div>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1 mt-2">Total</span>
                    <input 
                      data-testid="text-day-total"
                      type="number" 
                      defaultValue={dailyStatsData.totalApplied} 
                      key={`${selectedDateStr}-total-${dailyStatsData.totalApplied}`}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val !== dailyStatsData.totalApplied) {
                          updateDailyStatsMutation.mutate({ totalApplied: val });
                        }
                      }}
                      className="max-w-[110px] bg-transparent border-0 text-5xl font-sans font-bold text-center p-0 px-1 focus:outline-none text-[#827db8] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                  <div className="flex flex-col items-center justify-center border border-border/60 rounded-2xl bg-white shadow-sm w-[90px] h-[90px] hover:bg-gray-50 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#fca5a5]"></div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5 mt-1.5">Rejected</span>
                    <input 
                      data-testid="text-day-rejected"
                      type="number" 
                      defaultValue={dailyStatsData.totalRejected}
                      key={`${selectedDateStr}-rejected-${dailyStatsData.totalRejected}`}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val !== dailyStatsData.totalRejected) {
                          updateDailyStatsMutation.mutate({ totalRejected: val });
                        }
                      }}
                      className="max-w-[75px] bg-transparent border-0 text-2xl font-sans font-bold text-center p-0 px-1 focus:outline-none text-[#fca5a5] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                </div>
                
                {dayApps.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-apps">No applications for this date yet.</p>
                )}

                {dayApps.map((app) => (
                  <div key={app.id} data-testid={`card-app-${app.id}`} className="flex flex-col p-3 mb-3 border rounded-xl bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-start justify-between mb-2 cursor-pointer" onClick={() => setExpandedId(expandedAppId === app.id ? null : app.id)}>
                      <div className="w-full pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground w-12 font-medium">Company</span>
                          <input 
                            data-testid={`input-company-${app.id}`}
                            type="text" 
                            defaultValue={app.company} 
                            onClick={(e) => e.stopPropagation()} 
                            onBlur={(e) => {
                              if (e.target.value !== app.company) {
                                updateMutation.mutate({ id: app.id, company: e.target.value });
                              }
                            }}
                            className="flex-1 h-6 bg-transparent border-none text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -ml-1 text-gray-800" 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-12 font-medium">Job</span>
                          <input 
                            data-testid={`input-position-${app.id}`}
                            type="text" 
                            defaultValue={app.position} 
                            onClick={(e) => e.stopPropagation()} 
                            onBlur={(e) => {
                              if (e.target.value !== app.position) {
                                updateMutation.mutate({ id: app.id, position: e.target.value });
                              }
                            }}
                            className="flex-1 h-6 bg-transparent border-none text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -ml-1 text-gray-600" 
                          />
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform mt-1 ${expandedAppId === app.id ? 'rotate-90' : ''}`} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50">
                      <select 
                        data-testid={`select-status-${app.id}`}
                        className="h-6 text-xs bg-transparent border-none focus:outline-none cursor-pointer p-0 font-medium text-gray-700" 
                        value={app.status}
                        onChange={(e) => {
                           const newStatus = e.target.value;
                           updateMutation.mutate({ id: app.id, status: newStatus });
                           if (newStatus === 'applied') {
                             const el = e.target.closest('[data-testid^="card-app-"]');
                             if (el) {
                               const emoji = document.createElement('div');
                               emoji.textContent = '✅';
                               emoji.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;z-index:50;pointer-events:none;animation:checkPop 1.2s ease-out forwards;';
                               el.style.position = 'relative';
                               el.appendChild(emoji);
                               setTimeout(() => emoji.remove(), 1200);
                             }
                           }
                           if (newStatus === 'interview') {
                             setExpandedId(app.id);
                             const el = e.target.closest('[data-testid^="card-app-"]');
                             if (el) {
                               const emoji = document.createElement('div');
                               emoji.textContent = '😉';
                               emoji.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;z-index:50;pointer-events:none;animation:pumpUp 1.5s ease-out forwards;';
                               el.style.position = 'relative';
                               el.appendChild(emoji);
                               setTimeout(() => emoji.remove(), 1500);
                             }
                           }
                           if (newStatus === 'offer') {
                             fireConfetti();
                             const el = e.target.closest('[data-testid^="card-app-"]');
                             if (el) {
                               el.style.position = 'relative';
                               const dancer = document.createElement('div');
                               dancer.textContent = '🕺';
                               dancer.style.cssText = 'position:absolute;top:40%;left:80%;transform:translate(-50%,-50%);font-size:56px;z-index:50;pointer-events:none;animation:mjMoonwalk 3s ease-in-out forwards;';
                               const hat = document.createElement('div');
                               hat.textContent = '🎩';
                               hat.style.cssText = 'position:absolute;top:10%;left:80%;transform:translate(-50%,-50%);font-size:32px;z-index:51;pointer-events:none;animation:mjHat 3s ease-in-out forwards;';
                               el.appendChild(dancer);
                               el.appendChild(hat);
                               setTimeout(() => { dancer.remove(); hat.remove(); }, 3000);
                             }
                           }
                           if (newStatus === 'ghosted') {
                             const el = e.target.closest('[data-testid^="card-app-"]');
                             if (el) {
                               const emoji = document.createElement('div');
                               emoji.textContent = '👻';
                               emoji.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;z-index:50;pointer-events:none;animation:ghostFloat 2s ease-out forwards;';
                               el.style.position = 'relative';
                               el.appendChild(emoji);
                               setTimeout(() => emoji.remove(), 2000);
                             }
                           }
                           if (newStatus === 'rejected') {
                             const el = e.target.closest('[data-testid^="card-app-"]');
                             if (el) {
                               const emoji = document.createElement('div');
                               emoji.textContent = '😢';
                               emoji.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;z-index:50;pointer-events:none;animation:cryFade 1.5s ease-out forwards;';
                               el.style.position = 'relative';
                               el.appendChild(emoji);
                               setTimeout(() => emoji.remove(), 1500);
                             }
                           }
                        }}
                      >
                        <option value="applied">Applied</option>
                        <option value="interview">Interview</option>
                        <option value="rejected">Rejected</option>
                        <option value="ghosted">Ghosted</option>
                        <option value="offer">Offer</option>
                      </select>
                      <button 
                        data-testid={`button-remove-${app.id}`}
                        onClick={() => deleteMutation.mutate(app.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-destructive hover:underline font-medium"
                      >
                        Remove
                      </button>
                    </div>

                    {app.status === 'interview' && (
                      <div className="mt-3 pt-3 border-t border-border/50 bg-purple-50/50 -mx-3 -mb-3 px-3 pb-3 rounded-b-xl animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Schedule Interview</span>
                        </div>
                        <div className="flex gap-1 mb-2">
                          {[1, 2, 3, 4].map(r => (
                            <button
                              key={r}
                              data-testid={`btn-round-${r}-${app.id}`}
                              onClick={() => updateMutation.mutate({ id: app.id, interviewRound: r })}
                              className={`flex-1 h-6 text-[10px] font-medium rounded transition-colors ${(app.interviewRound || 1) === r ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`}
                            >
                              Round {r}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="flex flex-col gap-1">
                             <label className="text-[10px] text-muted-foreground font-medium">Date</label>
                             <input 
                               data-testid={`input-interview-date-${app.id}`}
                               type="date" 
                               defaultValue={app.interviewDate || ""} 
                               onChange={(e) => updateMutation.mutate({ id: app.id, interviewDate: e.target.value })}
                               className="h-7 text-xs rounded border-gray-200 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-purple-400" 
                             />
                           </div>
                           <div className="flex flex-col gap-1">
                             <label className="text-[10px] text-muted-foreground font-medium">Time</label>
                             <input 
                               data-testid={`input-interview-time-${app.id}`}
                               type="time" 
                               defaultValue={app.interviewTime || ""} 
                               onChange={(e) => updateMutation.mutate({ id: app.id, interviewTime: e.target.value })}
                               className="h-7 text-xs rounded border-gray-200 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-purple-400" 
                             />
                           </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                          <input type="checkbox" id={`sync-${app.id}`} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3 w-3" defaultChecked />
                          <label htmlFor={`sync-${app.id}`} className="text-[10px] text-gray-600 cursor-pointer">Sync to Calendar & Set Alarm</label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t bg-muted/10 mt-auto">
                <h4 className="text-sm font-medium mb-3">Add Application</h4>
                <div className="space-y-2 mb-3">
                  <input 
                    data-testid="input-new-company"
                    type="text" 
                    placeholder="Company Name" 
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full h-8 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                  />
                  <input 
                    data-testid="input-new-position"
                    type="text" 
                    placeholder="Job Title" 
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full h-8 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                  />
                  <select
                    data-testid="select-new-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                    <option value="ghosted">Ghosted</option>
                    <option value="offer">Offer</option>
                  </select>
                </div>
                <Button 
                  data-testid="button-add-application"
                  className="w-full" 
                  size="sm" 
                  onClick={handleAddApplication}
                  disabled={createMutation.isPending || !newCompany.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6" id="report-section">
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500" data-testid="text-stats-subtitle">Your application overview</span>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-print-report"
                className="text-xs gap-1.5"
                onClick={() => {
                  const printContent = document.getElementById('report-section');
                  if (!printContent) return;
                  const win = window.open('', '_blank');
                  if (!win) return;
                  win.document.write(`<html><head><title>Offercome Report</title><style>
                    body { font-family: 'DM Sans', 'Inter', sans-serif; padding: 40px; color: #333; }
                    h1 { font-size: 24px; margin-bottom: 4px; }
                    .subtitle { color: #888; font-size: 14px; margin-bottom: 24px; }
                    .stats { display: flex; gap: 32px; margin-bottom: 24px; }
                    .stat { text-align: center; }
                    .stat-num { font-size: 32px; font-weight: bold; }
                    .stat-label { font-size: 12px; color: #888; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
                    th { font-weight: 600; color: #666; text-transform: uppercase; font-size: 11px; }
                    .status { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
                  </style></head><body>
                    <h1>Offercome Report</h1>
                    <div class="subtitle">${filterStart} to ${filterEnd}</div>
                    <div class="stats">
                      <div class="stat"><div class="stat-num" style="color:#827db8">${reportData.totalApplied}</div><div class="stat-label">Applied</div></div>
                      <div class="stat"><div class="stat-num" style="color:#fca5a5">${reportData.refused}</div><div class="stat-label">Rejected</div></div>
                      <div class="stat"><div class="stat-num" style="color:#c4b5fd">${reportData.interviews}</div><div class="stat-label">Interviews</div></div>
                      <div class="stat"><div class="stat-num" style="color:#4ade80">${reportData.offers}</div><div class="stat-label">Offers</div></div>
                      <div class="stat"><div class="stat-num" style="color:#9ca3af">${reportData.noAnswer}</div><div class="stat-label">Ghosted</div></div>
                    </div>
                    <table><thead><tr><th>Date</th><th>Company</th><th>Position</th><th>Status</th></tr></thead><tbody>
                    ${reportData.details.map(d => `<tr><td>${d.date}</td><td>${d.company}</td><td>${d.position}</td><td>${d.status}</td></tr>`).join('')}
                    ${reportData.details.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No detailed entries for this period</td></tr>' : ''}
                    </tbody></table>
                  </body></html>`);
                  win.document.close();
                  win.print();
                }}
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                data-testid="input-filter-start"
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                data-testid="input-filter-end"
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-6 sm:gap-12 mb-8 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#f0eff5] flex items-center justify-center text-[#827db8]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Total Applied</div>
                  <div className="text-xl font-bold font-sans" data-testid="text-total-applied">{reportData.totalApplied}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-red-50 flex items-center justify-center text-red-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Rejected</div>
                  <div className="text-xl font-bold font-sans" data-testid="text-total-rejected">{reportData.refused}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-gray-100 flex items-center justify-center text-gray-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Interviews</div>
                  <div className="text-xl font-bold font-sans" data-testid="text-total-interviews">{reportData.interviews}</div>
                </div>
              </div>
            </div>

            <div className="relative h-32 w-full mt-4 flex items-end">
              <div className="absolute bottom-0 w-full h-[1px] bg-gray-200"></div>
              {(() => {
                const rMaxStat = Math.max(reportData.totalApplied, 1);
                return (
                  <div className="w-full flex justify-between items-end h-full px-2 lg:px-12 relative z-10">
                    <div className="flex flex-col items-center flex-1 group">
                      <span className="text-[11px] text-gray-500 font-medium mb-1.5">{reportData.totalApplied}</span>
                      <div className="w-[80%] max-w-[48px] bg-[#827db8] transition-all duration-300 hover:opacity-80 rounded-t-sm" style={{ height: `${Math.max((reportData.totalApplied / rMaxStat) * 100, 2)}px` }}></div>
                    </div>
                    <div className="flex flex-col items-center flex-1 group">
                      <span className="text-[11px] text-gray-500 font-medium mb-1.5">{reportData.noAnswer}</span>
                      <div className="w-[80%] max-w-[48px] bg-[#9ca3af] transition-all duration-300 hover:opacity-80 rounded-t-sm" style={{ height: `${Math.max((reportData.noAnswer / rMaxStat) * 100, 2)}px` }}></div>
                    </div>
                    <div className="flex flex-col items-center flex-1 group">
                      <span className="text-[11px] text-gray-500 font-medium mb-1.5">{reportData.refused}</span>
                      <div className="w-[80%] max-w-[48px] bg-[#fca5a5] transition-all duration-300 hover:opacity-80 rounded-t-sm" style={{ height: `${Math.max((reportData.refused / rMaxStat) * 100, 2)}px` }}></div>
                    </div>
                    <div className="flex flex-col items-center flex-1 group">
                      <span className="text-[11px] text-gray-500 font-medium mb-1.5">{reportData.interviews}</span>
                      <div className="w-[80%] max-w-[48px] bg-[#c4b5fd] transition-all duration-300 hover:opacity-80 rounded-t-sm" style={{ height: `${Math.max((reportData.interviews / rMaxStat) * 100, 2)}px` }}></div>
                    </div>
                    <div className="flex flex-col items-center flex-1 group">
                      <span className="text-[11px] text-gray-500 font-medium mb-1.5">{reportData.offers}</span>
                      <div className="w-[80%] max-w-[48px] bg-[#4ade80] transition-all duration-300 hover:opacity-80 rounded-t-sm" style={{ height: `${Math.max((reportData.offers / rMaxStat) * 100, 2)}px` }}></div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex justify-between px-2 lg:px-12 mt-3 text-[13px] text-gray-500 font-medium">
              <div className="flex-1 text-center">Applied</div>
              <div className="flex-1 text-center">Ghosted</div>
              <div className="flex-1 text-center">Refused</div>
              <div className="flex-1 text-center">Interview</div>
              <div className="flex-1 text-center">Offer</div>
            </div>

            {reportData.details.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detailed Entries</h4>
                <div className="space-y-1.5">
                  {reportData.details.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-gray-50">
                      <span className="text-gray-400 w-20">{d.date}</span>
                      <span className="font-medium text-gray-700 flex-1">{d.company}</span>
                      <span className="text-gray-500 flex-1">{d.position}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                        ${d.status === 'applied' ? 'bg-purple-50 text-purple-600' : ''}
                        ${d.status === 'interview' ? 'bg-violet-50 text-violet-600' : ''}
                        ${d.status === 'offer' ? 'bg-green-50 text-green-600' : ''}
                        ${d.status === 'rejected' ? 'bg-red-50 text-red-500' : ''}
                        ${d.status === 'ghosted' ? 'bg-gray-50 text-gray-400' : ''}
                      `}>{d.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-[17px] font-bold text-gray-800">Application Funnel</h3>
              <button className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </button>
            </div>

            {(() => {
              const total = stats.totalApplied || 1;
              const interviews = stats.interviews;
              const rejected = stats.rejectedBeforeInterview;
              const ghosted = stats.noAnswer;
              const offers = stats.offers;
              const noOffer = stats.rejectedAfterInterview;

              const W = 500;
              const H = 300;
              const barW = 8;
              const topPad = 70;

              const barsH = H - topPad;
              const leftBarX = 80;
              const midBarX = 170;
              const midBarX2 = midBarX + barW + 4;

              const intThick = Math.max((interviews / total) * barsH, interviews > 0 ? 6 : 0);
              const rejBarH = Math.max((rejected / total) * barsH, rejected > 0 ? 4 : 0);
              const ghostBarH = Math.max((ghosted / total) * barsH, ghosted > 0 ? 4 : 0);

              const intTotal = interviews || 1;
              const branches = [
                { label: "Offers", value: offers, color: "#3b82f6", thick: Math.max((offers / intTotal) * intThick, offers > 0 ? 3 : 0) },
                { label: "No Offer", value: noOffer, color: "#f97316", thick: Math.max((noOffer / intTotal) * intThick, noOffer > 0 ? 3 : 0) },
              ].filter(i => i.value > 0);

              const intNodeX = 240;
              const intNodeY = 15;

              let branchAccY = 0;
              const branchData = branches.map((b, idx) => {
                const startY = intNodeY + branchAccY;
                branchAccY += b.thick + 2;
                const endY = 8 + idx * 35;
                return { ...b, startY, endY, endX: W - 50 };
              });

              const sankeyPath = (sx: number, sy: number, sh: number, ex: number, ey: number, eh: number) => {
                const cx1 = sx + (ex - sx) * 0.5;
                const cx2 = ex - (ex - sx) * 0.5;
                return `M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ey}, ${ex} ${ey} L ${ex} ${ey + eh} C ${cx2} ${ey + eh}, ${cx1} ${sy + sh}, ${sx} ${sy + sh} Z`;
              };

              return (
                <>
                <div className="w-full flex justify-start py-4 mb-6">
                  <div className="w-full h-[300px] relative">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet">
                      {(() => {
                        let srcY = topPad;
                        const intSrcH = intThick;
                        const rejSrcH = (rejected / total) * barsH;
                        const ghostSrcH = (ghosted / total) * barsH;

                        const rejDestY = H - rejBarH - ghostBarH - 3;
                        const ghostDestY = H - ghostBarH;

                        return (
                          <>
                            <path d={sankeyPath(leftBarX + barW, srcY, intSrcH, intNodeX - 4, intNodeY, intThick)} fill="#f9a8d4" opacity="0.45" />

                            {rejected > 0 && (
                              <path d={sankeyPath(leftBarX + barW, srcY + intSrcH, rejSrcH, midBarX - 4, rejDestY, rejBarH)} fill="#fca5a5" opacity="0.3" />
                            )}

                            {ghosted > 0 && (
                              <path d={sankeyPath(leftBarX + barW, srcY + intSrcH + rejSrcH, ghostSrcH, midBarX2 - 4, ghostDestY, ghostBarH)} fill="#d1d5db" opacity="0.3" />
                            )}
                          </>
                        );
                      })()}

                      {branchData.map((b, idx) => (
                        <path key={`br-${idx}`} d={sankeyPath(intNodeX + barW + 2, b.startY, b.thick, b.endX, b.endY, b.thick)} fill={b.color} opacity="0.3" />
                      ))}

                      <rect x={leftBarX} y={topPad} width={barW} height={barsH} rx={4} fill="#ec4899" opacity="0.55" />

                      {interviews > 0 && (
                        <rect x={intNodeX} y={intNodeY} width={barW} height={intThick} rx={3} fill="#6b7280" opacity="0.5" />
                      )}

                      {rejected > 0 && (
                        <rect x={midBarX} y={H - rejBarH - ghostBarH - 3} width={barW} height={rejBarH} rx={4} fill="#f87171" opacity="0.6" />
                      )}

                      {ghosted > 0 && (
                        <rect x={midBarX2} y={H - ghostBarH} width={barW} height={ghostBarH} rx={4} fill="#9ca3af" opacity="0.6" />
                      )}

                      {branchData.map((b, idx) => (
                        <rect key={`be-${idx}`} x={b.endX} y={b.endY} width={14} height={Math.max(b.thick, 3)} rx={2} fill={b.color} opacity="0.8" />
                      ))}

                      <text x={leftBarX - 6} y={topPad + barsH / 2} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#4b5563" fontWeight="500">Applications</text>
                      <text x={leftBarX - 6} y={topPad + barsH / 2 + 16} textAnchor="end" dominantBaseline="middle" fontSize="15" fill="#4b5563" fontWeight="700" data-testid="text-funnel-total">{stats.totalApplied}</text>

                      {interviews > 0 && (
                        <>
                          <text x={intNodeX + barW + 6} y={intNodeY + intThick / 2 - 6} dominantBaseline="middle" fontSize="10" fill="#4b5563" fontWeight="500">Interview</text>
                          <text x={intNodeX + barW + 6} y={intNodeY + intThick / 2 + 8} dominantBaseline="middle" fontSize="13" fill="#4b5563" fontWeight="700">{interviews}</text>
                        </>
                      )}

                      {rejected > 0 && (
                        <>
                          <text x={midBarX + barW + 6} y={H - rejBarH - ghostBarH - 3 + rejBarH / 2 - 6} dominantBaseline="middle" fontSize="9" fill="#4b5563" fontWeight="500">Rejected</text>
                          <text x={midBarX + barW + 6} y={H - rejBarH - ghostBarH - 3 + rejBarH / 2 + 8} dominantBaseline="middle" fontSize="13" fill="#4b5563" fontWeight="700">{rejected}</text>
                        </>
                      )}

                      {ghosted > 0 && (
                        <>
                          <text x={midBarX2 + barW + 6} y={H - ghostBarH / 2 - 6} dominantBaseline="middle" fontSize="9" fill="#4b5563" fontWeight="500">Ghosted</text>
                          <text x={midBarX2 + barW + 6} y={H - ghostBarH / 2 + 8} dominantBaseline="middle" fontSize="13" fill="#4b5563" fontWeight="700">{ghosted}</text>
                        </>
                      )}

                      {branchData.map((b, idx) => {
                        const cy = b.endY + Math.max(b.thick, 3) / 2;
                        return (
                          <text key={`bl-${idx}`} x={b.endX + 18} y={cy} dominantBaseline="middle" fontSize="10" fill="#4b5563" fontWeight="500">{b.label} <tspan fontWeight="700">{b.value}</tspan></text>
                        );
                      })}

                    </svg>
                  </div>
                </div>

                <div className="flex justify-end mt-2 mb-4">
                  <div className="w-[220px]">
                    <div className="text-[11px] font-semibold text-gray-500 mb-2">Conversion Metrics</div>
                    {[
                      { label: "Interview Rate", value: (interviews / total) * 100, color: "#a78bfa" },
                      { label: "Offer Rate", value: (offers / total) * 100, color: "#4ade80" },
                      { label: "Offer-from-Interview", value: interviews > 0 ? (offers / interviews) * 100 : 0, color: "#3b82f6" },
                    ].map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-gray-500 w-[110px] text-right shrink-0">{m.label}</span>
                        <div className="flex-1 h-[8px] bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(m.value, 100)}%`, backgroundColor: m.color, opacity: 0.7 }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-600 w-[42px] text-right" data-testid={`text-metric-${idx}`}>{m.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                </>
              );
            })()}
          </div>
        </div>
      </main>

    </div>
  );
}

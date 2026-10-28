"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pill,
  AlertTriangle,
  Clock,
  FileCheck2,
  TrendingUp,
  Radio,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Frame,
  FramePanel,
  FrameHeader,
  FrameTitle,
  FrameDescription,
} from "@/components/ui/frame";
import {
  Meter,
  MeterLabel,
  MeterTrack,
  MeterIndicator,
  MeterValue,
} from "@/components/ui/meter";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StockMedicine {
  id: string;
  name: string;
  rfidUid: string;
  shelfLocation: string;
  currentCount: number;
  minStockCount: number;
  daysUntilExpiry: number;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  history: Array<{ date: string; count: number }>;
}

interface AlertItem {
  id: string;
  type: string;
  severity: "info" | "warning" | "destructive";
  title: string;
  message: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<StockMedicine[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [pendingPrescriptionCount, setPendingPrescriptionCount] = useState<number>(1);
  const [chartData, setChartData] = useState<Array<{ date: string; totalUnits: number }>>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockRes, alertsRes, rxRes] = await Promise.all([
        fetch("/api/stock"),
        fetch("/api/alerts?limit=6"),
        fetch("/api/prescription"),
      ]);

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        setMedicines(stockData.medicines || []);

        // Aggregate daily total units over past 7 days for the chart
        const dayMap: Record<string, number> = {};
        const days = ["7d ago", "5d ago", "3d ago", "Yesterday", "Today"];

        (stockData.medicines || []).forEach((med: StockMedicine) => {
          (med.history || []).forEach((h, idx) => {
            const label = days[idx] || h.date;
            dayMap[label] = (dayMap[label] || 0) + h.count;
          });
        });

        const series = Object.entries(dayMap).map(([date, totalUnits]) => ({
          date,
          totalUnits,
        }));
        setChartData(
          series.length > 0
            ? series
            : [
                { date: "7d ago", totalUnits: 1420 },
                { date: "5d ago", totalUnits: 1390 },
                { date: "3d ago", totalUnits: 1340 },
                { date: "Yesterday", totalUnits: 1290 },
                { date: "Today", totalUnits: 1260 },
              ]
        );
      }

      if (alertsRes.ok) {
        const alertData = await alertsRes.json();
        setAlerts(alertData.alerts || []);
      }

      if (rxRes.ok) {
        const rxData = await rxRes.json();
        const pending = (rxData.prescriptions || []).filter(
          (p: { status: string }) => p.status === "PENDING"
        ).length;
        setPendingPrescriptionCount(pending);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalMedicines = medicines.length;
  const lowStockCount = medicines.filter((m) => m.isLowStock).length;
  const expiringSoonCount = medicines.filter((m) => m.isExpiringSoon).length;
  const healthyCount = medicines.filter((m) => !m.isLowStock).length;
  const healthPercentage =
    totalMedicines > 0 ? Math.round((healthyCount / totalMedicines) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Pharmacist Verification Hub Banner (Matching Reference UI) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 p-6 sm:p-7 text-white shadow-md">
        {/* Subtle decorative glow overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-cyan-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -bottom-16 size-72 rounded-full bg-teal-400/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/95 backdrop-blur-xs border border-white/20">
              Pharmacist Verification Assistant
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
              Pharmacist Verification Hub
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-normal">
              ESP32-CAM prescriptions • RC522 RFID medicines • HX711 load-cell inventory
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-xs font-semibold text-white shadow-xs border border-white/25 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02]"
            >
              <Sparkles className="size-4 text-amber-300" />
              <span>Launch Hardware Simulator</span>
            </Link>
            <span className="text-[11px] text-teal-100/70">
              All decisions logged for audit
            </span>
          </div>
        </div>
      </div>

      {/* 4 Totals Cards with Blooming Hover Effect */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Medicines */}
        <div className="relative group transition-all duration-500 ease-out hover:-translate-y-1.5">
          {/* Ambient Blooming Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500/25 via-emerald-400/30 to-teal-600/25 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
          />
          <div className="relative rounded-2xl bg-gradient-to-b from-white/95 to-slate-50/80 p-1.5 border border-slate-200/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:border-teal-400/60 group-hover:shadow-[0_20px_35px_-10px_rgba(13,148,136,0.28)]">
            <div className="relative overflow-hidden rounded-xl bg-white p-5 shadow-2xs ring-1 ring-slate-100 flex flex-col justify-between h-full">
              {/* Corner ambient spotlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-teal-400/10 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:bg-teal-400/20"
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    Total Registered
                  </span>
                  <div className="inline-flex items-center justify-center size-9 rounded-lg bg-teal-50 ring-1 ring-teal-200/70 text-teal-600 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                    <Pill className="size-4.5" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
                      {totalMedicines}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                      Online
                    </Badge>
                  </div>
                )}
              </div>
              <div className="relative pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                <span>Across 7 shelf aisles</span>
                <span className="text-[11px] font-medium text-teal-600 font-mono">15 items</span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="relative group transition-all duration-500 ease-out hover:-translate-y-1.5">
          {/* Ambient Blooming Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-rose-500/25 via-red-400/30 to-rose-600/25 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
          />
          <div className="relative rounded-2xl bg-gradient-to-b from-white/95 to-slate-50/80 p-1.5 border border-slate-200/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:border-rose-400/60 group-hover:shadow-[0_20px_35px_-10px_rgba(239,68,68,0.28)]">
            <div className="relative overflow-hidden rounded-xl bg-white p-5 shadow-2xs ring-1 ring-slate-100 flex flex-col justify-between h-full">
              {/* Corner ambient spotlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-rose-400/10 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:bg-rose-400/20"
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    Low Stock Alerts
                  </span>
                  <div className="inline-flex items-center justify-center size-9 rounded-lg bg-rose-50 ring-1 ring-rose-200/70 text-rose-600 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                    <AlertTriangle className="size-4.5" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-destructive font-heading">
                      {lowStockCount}
                    </span>
                    {lowStockCount > 0 && (
                      <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 text-[10px] font-bold">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-red-500" />
                        ACTION
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="relative pt-3 mt-3 border-t border-white/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>Below minimum threshold</span>
                <span className="text-[11px] font-medium text-destructive">Restock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="relative group transition-all duration-500 ease-out hover:-translate-y-1.5">
          {/* Ambient Blooming Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/25 via-yellow-400/30 to-amber-600/25 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
          />
          <div className="relative rounded-2xl bg-gradient-to-b from-white/95 to-slate-50/80 p-1.5 border border-slate-200/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:border-amber-400/60 group-hover:shadow-[0_20px_35px_-10px_rgba(245,158,11,0.28)]">
            <div className="relative overflow-hidden rounded-xl bg-white p-5 shadow-2xs ring-1 ring-slate-100 flex flex-col justify-between h-full">
              {/* Corner ambient spotlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-amber-400/10 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:bg-amber-400/20"
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    Expiring Soon
                  </span>
                  <div className="inline-flex items-center justify-center size-9 rounded-lg bg-amber-50 ring-1 ring-amber-200/70 text-amber-600 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                    <Clock className="size-4.5" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-warning font-heading">
                      {expiringSoonCount}
                    </span>
                    <Badge variant="outline" className="border-warning/30 text-amber-700 bg-warning/10 text-[10px]">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
                      &lt; 30 days
                    </Badge>
                  </div>
                )}
              </div>
              <div className="relative pt-3 mt-3 border-t border-white/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>FEFO priority dispensing</span>
                <span className="text-[11px] font-medium text-amber-600">Urgent</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Prescriptions */}
        <div className="relative group transition-all duration-500 ease-out hover:-translate-y-1.5">
          {/* Ambient Blooming Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500/25 via-cyan-400/30 to-teal-600/25 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
          />
          <div className="relative rounded-2xl bg-gradient-to-b from-white/95 to-slate-50/80 p-1.5 border border-slate-200/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:border-teal-400/60 group-hover:shadow-[0_20px_35px_-10px_rgba(13,148,136,0.28)]">
            <div className="relative overflow-hidden rounded-xl bg-white p-5 shadow-2xs ring-1 ring-slate-100 flex flex-col justify-between h-full">
              {/* Corner ambient spotlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-teal-400/10 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:bg-teal-400/20"
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    Pending OCR Queue
                  </span>
                  <div className="inline-flex items-center justify-center size-9 rounded-lg bg-teal-50 ring-1 ring-teal-200/70 text-teal-600 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                    <FileCheck2 className="size-4.5" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
                      {pendingPrescriptionCount}
                    </span>
                    {pendingPrescriptionCount > 0 && (
                      <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50 text-[10px] font-semibold">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-teal-500" />
                        VERIFY
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="relative pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                <span>Awaiting clinical sign-off</span>
                <span className="text-[11px] font-medium text-teal-600">ESP32-CAM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Stock Health Section using Coss Meter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Overall Inventory Health</CardTitle>
              <CardDescription className="text-xs">
                Real-time stock sufficiency derived from ESP32 load cell weight telemetry
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-primary">
                {loading ? "--" : `${healthPercentage}%`}
              </span>
              <p className="text-[11px] text-muted-foreground">Optimal capacity</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <div className="space-y-2">
              <Meter value={healthPercentage} min={0} max={100} className="w-full">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <MeterLabel>Stock Safety Index</MeterLabel>
                  <MeterValue>{(val) => `${val}% compliant`}</MeterValue>
                </div>
                <MeterTrack className="h-3 rounded-full bg-secondary">
                  <MeterIndicator
                    className={
                      healthPercentage > 75
                        ? "bg-primary"
                        : healthPercentage > 50
                        ? "bg-warning"
                        : "bg-destructive"
                    }
                  />
                </MeterTrack>
              </Meter>

              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Healthy: {healthyCount} items</span>
                <span>Low Stock: {lowStockCount} items</span>
                <span>Threshold: Min 20-60 units</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frame with Recharts stock-over-time chart + Live Alerts Side-by-Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recharts chart in Frame */}
        <div className="lg:col-span-2">
          <Frame>
            <FramePanel>
              <FrameHeader className="flex flex-row items-center justify-between px-0 pt-0 pb-4">
                <div>
                  <FrameTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    7-Day Stock Consumption &amp; Dispensing Trend
                  </FrameTitle>
                  <FrameDescription className="text-xs text-muted-foreground">
                    Aggregated inventory unit counts across all shelf bins
                  </FrameDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  Load Cell Telemetry
                </Badge>
              </FrameHeader>

              <div className="h-64 w-full pt-2">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="date"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        domain={["auto", "auto"]}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalUnits"
                        name="Total Units in Stock"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorStock)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </FramePanel>
          </Frame>
        </div>

        {/* Live Alerts list using Coss Alert component */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Hardware Alerts</h2>
            <Link
              href="/alerts"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : alerts.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No recent hardware alerts. All inventory weights within safety parameters.
            </Card>
          ) : (
            <div className="space-y-3 max-h-[22rem] overflow-y-auto pe-1">
              {alerts.slice(0, 5).map((alert) => (
                <Alert
                  key={alert.id}
                  variant={alert.severity === "destructive" ? "error" : alert.severity === "warning" ? "warning" : "info"}
                  className="text-xs py-3"
                >
                  <AlertTitle className="text-xs font-bold leading-none mb-1">
                    {alert.title}
                  </AlertTitle>
                  <AlertDescription className="text-[11px] line-clamp-2">
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

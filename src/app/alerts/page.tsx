"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  Radio,
  FileText,
  Filter,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";

// Coss UI components:
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

interface AlertRecord {
  id: string;
  type: string;
  severity: "info" | "warning" | "destructive";
  title: string;
  message: string;
  medicineId: string | null;
  read: boolean;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [marking, setMarking] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/alerts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Alerts fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setMarking(true);
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toastManager.add({
          title: "Alerts Updated",
          description: "All notifications marked as read.",
          type: "success",
        });
        fetchAlerts();
      }
    } catch {
      toastManager.add({
        title: "Error",
        description: "Failed to mark alerts as read.",
        type: "error",
      });
    } finally {
      setMarking(false);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filter === "unread") return !alert.read;
      if (filter === "low_stock") return alert.type === "LOW_STOCK";
      if (filter === "expiring") return alert.type === "EXPIRING_SOON";
      if (filter === "prescription") return alert.type === "PRESCRIPTION";
      return true;
    });
  }, [alerts, filter]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
            Hardware &amp; Clinical Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time threshold violations from load cells, RC522 RFID scans, and expiry checks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || marking}
            className="gap-2"
          >
            <CheckCheck className="size-4" />
            <span>Mark All Read ({unreadCount})</span>
          </Button>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-2xl p-2.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2">
          <Filter className="size-3.5" />
          <span>Filter:</span>
        </div>

        <SegmentedControl size="sm">
          <SegmentedControlItem
            data-checked={filter === "all" ? true : undefined}
            onClick={() => setFilter("all")}
          >
            All Alerts ({alerts.length})
          </SegmentedControlItem>
          <SegmentedControlItem
            data-checked={filter === "unread" ? true : undefined}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </SegmentedControlItem>
          <SegmentedControlItem
            data-checked={filter === "low_stock" ? true : undefined}
            onClick={() => setFilter("low_stock")}
          >
            Low Stock
          </SegmentedControlItem>
          <SegmentedControlItem
            data-checked={filter === "expiring" ? true : undefined}
            onClick={() => setFilter("expiring")}
          >
            Expiring Soon
          </SegmentedControlItem>
          <SegmentedControlItem
            data-checked={filter === "prescription" ? true : undefined}
            onClick={() => setFilter("prescription")}
          >
            Prescriptions
          </SegmentedControlItem>
        </SegmentedControl>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card className="py-16">
            <Empty>
              <EmptyMedia variant="icon">
                <Bell className="size-6 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No Notifications</EmptyTitle>
              <EmptyDescription>
                {filter === "unread"
                  ? "All alerts have been reviewed. No unread items remain."
                  : "No notifications currently recorded for this filter category."}
              </EmptyDescription>
            </Empty>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const isDestructive = alert.severity === "destructive";
            const isWarning = alert.severity === "warning";

            return (
              <Alert
                key={alert.id}
                variant={isDestructive ? "error" : isWarning ? "warning" : "info"}
                className={cn(
                  "p-4 transition-all rounded-2xl",
                  !alert.read ? "border-l-4 shadow-xs" : "opacity-80"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTitle className="text-sm font-bold flex items-center gap-2">
                        {alert.title}
                      </AlertTitle>
                      {!alert.read && (
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-bold uppercase">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <AlertDescription className="text-xs text-muted-foreground">
                      {alert.message}
                    </AlertDescription>
                  </div>

                  <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </Alert>
            );
          })
        )}
      </div>
    </div>
  );
}


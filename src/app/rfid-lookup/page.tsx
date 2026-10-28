"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Radio,
  RefreshCw,
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Weight,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Command as CommandIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";

// Coss UI components:
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Meter,
  MeterLabel,
  MeterTrack,
  MeterIndicator,
  MeterValue,
} from "@/components/ui/meter";
import { Spinner } from "@/components/ui/spinner";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompletePopup,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
} from "@/components/ui/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";

interface LatestScanData {
  rfidUid: string;
  scannedAt: string;
  medicineId?: string;
  medicineName?: string;
  shelfLocation?: string;
  count?: number;
  minStockCount?: number;
  unitWeightGrams?: number;
  totalWeightGrams?: number;
  expiryDate?: string;
  daysUntilExpiry?: number;
  isLowStock?: boolean;
  notFound?: boolean;
  message?: string;
}

interface MedicineSummary {
  id: string;
  name: string;
  rfidUid: string;
  shelfLocation: string;
  unitWeightGrams: number;
  minStockCount: number;
  expiryDate: string;
  currentCount: number;
}

function RfidLookupContent() {
  const searchParams = useSearchParams();
  const initialUid = searchParams.get("uid");

  const [latestScan, setLatestScan] = useState<LatestScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Manual search
  const [allMedicines, setAllMedicines] = useState<MedicineSummary[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedicineSummary | null>(null);

  // Fetch latest scan state
  const fetchLatestScan = async () => {
    try {
      const res = await fetch("/api/rfid-scan");
      if (res.ok) {
        const data = await res.json();
        setLatestScan(data.latestScan);
      }
    } catch (err) {
      console.error("RFID poll error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all medicines for autocomplete
  const fetchMedicines = async () => {
    try {
      const res = await fetch("/api/medicines");
      if (res.ok) {
        const data = await res.json();
        setAllMedicines(data.medicines || []);

        if (initialUid) {
          const match = (data.medicines || []).find(
            (m: MedicineSummary) => m.rfidUid === initialUid
          );
          if (match) setSelectedMed(match);
        }
      }
    } catch (err) {
      console.error("Medicines fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLatestScan();
    fetchMedicines();

    // Live polling every 3 seconds when listening is true
    let interval: NodeJS.Timeout;
    if (listening) {
      interval = setInterval(fetchLatestScan, 3000);
    }
    return () => clearInterval(interval);
  }, [listening]);

  const handleSimulateScan = async (uid?: string) => {
    try {
      setSimulating(true);
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rfid", rfidUid: uid }),
      });

      if (res.ok) {
        const data = await res.json();
        setLatestScan(data.scanData);
        toastManager.add({
          title: "RFID Tag Scanned",
          description: `Detected tag ${data.scanData.rfidUid} (${data.scanData.medicineName})`,
          type: "success",
        });
      }
    } catch {
      toastManager.add({
        title: "Simulation Failed",
        description: "Failed to simulate RFID scan.",
        type: "error",
      });
    } finally {
      setSimulating(false);
    }
  };

  const displayedItem = selectedMed
    ? {
        rfidUid: selectedMed.rfidUid,
        medicineName: selectedMed.name,
        shelfLocation: selectedMed.shelfLocation,
        count: selectedMed.currentCount,
        minStockCount: selectedMed.minStockCount,
        unitWeightGrams: selectedMed.unitWeightGrams,
        totalWeightGrams: Math.round(selectedMed.currentCount * selectedMed.unitWeightGrams * 100) / 100,
        expiryDate: selectedMed.expiryDate,
        daysUntilExpiry: Math.ceil(
          (new Date(selectedMed.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
        isLowStock: selectedMed.currentCount < selectedMed.minStockCount,
        scannedAt: new Date().toISOString(),
      }
    : latestScan;

  const stockPercentage = displayedItem?.count !== undefined && displayedItem?.minStockCount
    ? Math.min(100, Math.round((displayedItem.count / (displayedItem.minStockCount * 2)) * 100))
    : 50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
            Live RFID &amp; Shelf Sensor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time container scan identification via RC522 reader and load cell weight sync.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={listening ? "default" : "outline"}
            size="sm"
            onClick={() => setListening(!listening)}
            className="gap-2"
          >
            {listening ? (
              <>
                <span className="size-2 rounded-full bg-white animate-pulse" />
                <span>Listening for Tag</span>
              </>
            ) : (
              <>
                <Radio className="size-3.5" />
                <span>Resume Listening</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSimulateScan()}
            loading={simulating}
            className="gap-2"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Simulate Hardware Tap</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Hardware Scan Card (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2 border-primary/30 shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Radio className="size-4 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">
                      {selectedMed ? "Manual Inspection Record" : "Latest Live Hardware RFID Scan"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {displayedItem?.scannedAt
                        ? `Scanned at ${new Date(displayedItem.scannedAt).toLocaleTimeString()}`
                        : "Awaiting physical container tap on RC522 reader"}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {listening && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card px-2.5 py-1 rounded-full border">
                      <Spinner className="size-3 text-primary" />
                      <span>RC522 Live</span>
                    </div>
                  )}
                  {selectedMed && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setSelectedMed(null)}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !displayedItem ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Spinner className="size-8 text-primary mb-3" />
                  <p className="font-semibold text-foreground">Waiting for RFID container scan...</p>
                  <p className="text-xs max-w-sm mt-1">
                    Hold an RFID-tagged pill bottle near the RC522 sensor or click &apos;Simulate Hardware Tap&apos; above.
                  </p>
                </div>
              ) : displayedItem.notFound ? (
                <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-2">
                  <AlertTriangle className="size-8 text-destructive mx-auto" />
                  <h3 className="font-bold text-foreground">Unregistered RFID Tag Detected</h3>
                  <code className="text-xs font-mono bg-background px-2 py-1 rounded border">
                    {displayedItem.rfidUid}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    This tag is not linked to any medication in the inventory database. Register it in Inventory.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Medicine title + Shelf */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        Identified Medication
                      </span>
                      <h2 className="text-2xl font-bold text-foreground">
                        {displayedItem.medicineName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 text-primary" />
                        <span className="font-medium text-foreground">{displayedItem.shelfLocation}</span>
                        <span>•</span>
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                          {displayedItem.rfidUid}
                        </code>
                      </div>
                    </div>

                    <div>
                      {displayedItem.isLowStock ? (
                        <Badge variant="destructive" className="text-xs py-1 px-2.5">
                          Low Stock Alert
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs py-1 px-2.5">
                          Stock Level Safe
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 3 Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border bg-card p-3.5 space-y-1">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <Layers className="size-3" />
                        Live Unit Count
                      </span>
                      <div className="text-2xl font-black text-foreground">
                        {displayedItem.count ?? 0}
                        <span className="text-xs font-normal text-muted-foreground ms-1">units</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Min threshold: {displayedItem.minStockCount} units
                      </p>
                    </div>

                    <div className="rounded-xl border bg-card p-3.5 space-y-1">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <Weight className="size-3" />
                        Measured Weight
                      </span>
                      <div className="text-2xl font-black text-foreground">
                        {displayedItem.totalWeightGrams ?? 0}
                        <span className="text-xs font-normal text-muted-foreground ms-1">g</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Unit tare: {displayedItem.unitWeightGrams}g
                      </p>
                    </div>

                    <div className="rounded-xl border bg-card p-3.5 space-y-1">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        Expiration Date
                      </span>
                      <div className="text-lg font-bold text-foreground">
                        {displayedItem.expiryDate
                          ? new Date(displayedItem.expiryDate).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <p
                        className={cn(
                          "text-[10px] font-medium",
                          (displayedItem.daysUntilExpiry ?? 999) <= 30
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        )}
                      >
                        {(displayedItem.daysUntilExpiry ?? 0) <= 0
                          ? "EXPIRED"
                          : `${displayedItem.daysUntilExpiry} days remaining`}
                      </p>
                    </div>
                  </div>

                  {/* Stock Level Meter */}
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 border">
                    <Meter value={stockPercentage} min={0} max={100} className="w-full">
                      <div className="flex justify-between text-xs">
                        <MeterLabel className="font-semibold">Stock Capacity Ratio</MeterLabel>
                        <span className="font-mono text-xs tabular-nums text-foreground">
                          {displayedItem.count} / {displayedItem.minStockCount ? displayedItem.minStockCount * 2 : 100} units
                        </span>
                      </div>
                      <MeterTrack className="h-2.5 rounded-full bg-secondary">
                        <MeterIndicator
                          className={
                            displayedItem.isLowStock ? "bg-destructive" : "bg-primary"
                          }
                        />
                      </MeterTrack>
                    </Meter>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Empty (0)</span>
                      <span>Warning ({displayedItem.minStockCount})</span>
                      <span>Optimal ({displayedItem.minStockCount ? displayedItem.minStockCount * 2 : 100})</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t bg-muted/10 flex justify-between text-xs text-muted-foreground py-3">
              <span>Hardware Link: HX711 Load Cell + RC522 SPI Bus</span>
              <span>API: /api/rfid-scan</span>
            </CardFooter>
          </Card>
        </div>

        {/* Manual Autocomplete & Quick Lookup Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Search className="size-4 text-primary" />
                Manual Medication Lookup
              </CardTitle>
              <CardDescription className="text-xs">
                Search inventory directly by drug name, chemical compound, or RFID tag.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Autocomplete
                items={allMedicines}
                onValueChange={(val) => {
                  if (val) setSelectedMed(val as unknown as MedicineSummary);
                }}
              >
                <AutocompleteInput
                  placeholder="Type drug name or RFID..."
                  startAddon={<Search className="size-4" />}
                />
                <AutocompletePopup>
                  <AutocompleteList>
                    <AutocompleteEmpty>No matching medication records.</AutocompleteEmpty>
                    {allMedicines.map((m) => (
                      <AutocompleteItem key={m.id} value={m}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-foreground text-xs">{m.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {m.shelfLocation} • {m.currentCount} units
                          </span>
                        </div>
                      </AutocompleteItem>
                    ))}
                  </AutocompleteList>
                </AutocompletePopup>
              </Autocomplete>

              <div className="rounded-xl border p-3 bg-muted/20 space-y-2 text-xs">
                <div className="font-semibold text-foreground">Quick Tap Demo Tags:</div>
                <div className="space-y-1.5">
                  {allMedicines.slice(0, 3).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSimulateScan(m.rfidUid)}
                      className="w-full text-left p-2 rounded-lg bg-card hover:bg-accent/40 border border-border/80 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-foreground">{m.name}</div>
                        <code className="text-[10px] text-muted-foreground">{m.rfidUid}</code>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Tap Tag
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RfidLookupPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <RfidLookupContent />
    </Suspense>
  );
}


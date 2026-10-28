"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Cpu,
  Radio,
  Camera,
  Weight,
  Sparkles,
  Key,
  Shield,
  HelpCircle,
  CheckCircle2,
  Sliders,
  Code2,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipPopup,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(30);
  const [simulating, setSimulating] = useState<string | null>(null);

  const handleSimulate = async (action: "stock" | "rfid" | "prescription") => {
    try {
      setSimulating(action);
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error("Hardware simulation failed");

      const data = await res.json();

      if (action === "stock") {
        toastManager.add({
          title: "ESP32 Load Cell Simulated",
          description: `Measured ${data.weightGrams}g (~${data.count} units) of ${data.medicineName}. ${data.isLowStock ? "[LOW STOCK TRIGGERED]" : ""}`,
          type: data.isLowStock ? "warning" : "success",
        });
      } else if (action === "rfid") {
        toastManager.add({
          title: "ESP32 RC522 Tap Simulated",
          description: `Read RFID UID ${data.scanData.rfidUid} (${data.scanData.medicineName}) at ${data.scanData.shelfLocation}.`,
          type: "success",
        });
      } else if (action === "prescription") {
        toastManager.add({
          title: "ESP32-CAM Upload Simulated",
          description: `Captured prescription and parsed ${data.prescription.items.length} items with Tesseract.js. Queued for verification.`,
          type: "info",
        });
      }
    } catch (err: any) {
      toastManager.add({
        title: "Simulation Error",
        description: err.message,
        type: "error",
      });
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
          System &amp; Hardware Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure telemetry parameters, visual preferences, and test ESP32 hardware integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: UI & Preferences */}
        <div className="space-y-6">
          {/* Appearance & Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                Application Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Display theme and live notification subscriptions.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Interface Theme Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Interface Theme
                    </span>
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">
                      Active
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clinical white theme optimized for pharmacy dispensing &amp; high ambient light
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground bg-muted px-2.5 py-1 rounded-md border">
                    Clinical White
                  </span>
                </div>
              </div>

              <Separator />

              {/* Hardware Notifications Switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Live Telemetry Notifications
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <HelpCircle className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipPopup>
                        Emits toast notifications whenever load cell drops below minimum count
                      </TooltipPopup>
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Display instant toasts on stock shortages and camera uploads
                  </p>
                </div>

                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <Separator />

              {/* Slider for Low-Stock Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      Default Low-Stock Threshold:{" "}
                      <strong className="text-primary font-mono">{lowStockThreshold} units</strong>
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Baseline inventory count before load cell issues a LOW_STOCK alert
                    </p>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setLowStockThreshold(30)}
                          aria-label="Reset threshold to default 30"
                        />
                      }
                    >
                      <HelpCircle className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipPopup>Reset to standard default (30 units)</TooltipPopup>
                  </Tooltip>
                </div>

                <div className="pt-2">
                  <Slider
                    value={[lowStockThreshold]}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      if (v !== undefined) setLowStockThreshold(v);
                    }}
                    min={5}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-1.5 font-mono">
                    <span>5 units</span>
                    <span>50 units</span>
                    <span>100 units</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hardware API Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Key className="size-4 text-primary" />
                ESP32 Hardware Authentication
              </CardTitle>
              <CardDescription className="text-xs">
                Header credentials required for ESP32 HTTP POST requests.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Header Name:</span>
                  <code className="font-mono bg-card px-2 py-0.5 rounded border text-[11px]">
                    x-api-key
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Secret Key:</span>
                  <code className="font-mono bg-card px-2 py-0.5 rounded border text-[11px] text-primary font-bold">
                    pharmalink_esp32_secret_key_2026
                  </code>
                </div>
              </div>

              <div className="space-y-1 text-muted-foreground text-[11px]">
                <div className="flex justify-between">
                  <span>Stock Endpoint:</span>
                  <code className="font-mono text-foreground">POST /api/stock</code>
                </div>
                <div className="flex justify-between">
                  <span>RFID Scan:</span>
                  <code className="font-mono text-foreground">POST /api/rfid-scan</code>
                </div>
                <div className="flex justify-between">
                  <span>Prescription:</span>
                  <code className="font-mono text-foreground">POST /api/prescription</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Hardware Simulators */}
        <div className="space-y-6">
          <Card className="border-2 border-primary/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Cpu className="size-4 text-primary" />
                    ESP32 Hardware Telemetry Simulators
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Test hardware workflows without physical microcontrollers attached.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px]">
                  DEMO MODE
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Simulator 1: Load Cell Weight Drop */}
              <div className="rounded-xl border p-4 bg-card hover:border-primary/40 transition-colors space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Weight className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Simulate Load Cell Weight (HX711)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Sends simulated shelf gram reading, recalculates count &amp; triggers low-stock alert.
                      </p>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          onClick={() => handleSimulate("stock")}
                          loading={simulating === "stock"}
                          className="shrink-0 gap-1.5"
                        />
                      }
                    >
                      <Sparkles className="size-3.5" />
                      <span>Trigger Weight</span>
                    </TooltipTrigger>
                    <TooltipPopup>Emulates load cell ADC weight drop</TooltipPopup>
                  </Tooltip>
                </div>
              </div>

              {/* Simulator 2: RFID Reader Tap */}
              <div className="rounded-xl border p-4 bg-card hover:border-primary/40 transition-colors space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-info/10 text-info">
                      <Radio className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Simulate RC522 RFID Tag Tap
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Emulates nurse/pharmacist touching medicine bottle against shelf scanner.
                      </p>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSimulate("rfid")}
                          loading={simulating === "rfid"}
                          className="shrink-0 gap-1.5"
                        />
                      }
                    >
                      <Sparkles className="size-3.5 text-info" />
                      <span>Tap Tag</span>
                    </TooltipTrigger>
                    <TooltipPopup>Emulates SPI RFID tag interrupt</TooltipPopup>
                  </Tooltip>
                </div>
              </div>

              {/* Simulator 3: ESP32-CAM Intake */}
              <div className="rounded-xl border p-4 bg-card hover:border-primary/40 transition-colors space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-warning/10 text-warning">
                      <Camera className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Simulate ESP32-CAM Intake &amp; OCR
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Captures prescription photo, triggers Tesseract.js, and matches drug names.
                      </p>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSimulate("prescription")}
                          loading={simulating === "prescription"}
                          className="shrink-0 gap-1.5"
                        />
                      }
                    >
                      <Sparkles className="size-3.5 text-warning" />
                      <span>Upload Rx</span>
                    </TooltipTrigger>
                    <TooltipPopup>Runs full camera OCR workflow</TooltipPopup>
                  </Tooltip>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t bg-muted/10 text-xs text-muted-foreground py-3">
              <span>All simulation requests interface with the actual Prisma SQLite database.</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}


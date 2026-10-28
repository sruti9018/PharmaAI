"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Search,
  ExternalLink,
  MapPin,
  Check,
  X,
  Upload,
  RefreshCw,
  Camera,
  Layers,
  Sparkles,
  Info,
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
  TableCaption,
} from "@/components/ui/table";
import {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardPopup,
} from "@/components/ui/preview-card";
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

interface PrescriptionItemData {
  id: string;
  extractedName: string;
  matchedMedicineId: string | null;
  inStock: boolean;
  matchedMedicine: {
    id: string;
    name: string;
    rfidUid: string;
    shelfLocation: string;
    unitWeightGrams: number;
    stockLogs?: Array<{ count: number; weightGrams: number }>;
  } | null;
}

interface PrescriptionRecord {
  id: string;
  imageUrl: string;
  extractedText: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  pharmacistNote: string | null;
  createdAt: string;
  items: PrescriptionItemData[];
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("PENDING");

  // Selected prescription in split view
  const [selectedRx, setSelectedRx] = useState<PrescriptionRecord | null>(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Alert Dialog for approve / reject
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REJECTED" | null>(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/prescription");
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error("Prescriptions fetch error:", err);
      toastManager.add({
        title: "Error",
        description: "Failed to load prescription queue.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => rx.status === activeTab);
  }, [prescriptions, activeTab]);

  // Keep selectedRx in sync with activeTab
  useEffect(() => {
    if (filteredPrescriptions.length > 0) {
      if (!selectedRx || !filteredPrescriptions.some((r) => r.id === selectedRx.id)) {
        setSelectedRx(filteredPrescriptions[0]);
        setNote(filteredPrescriptions[0].pharmacistNote || "");
      }
    } else {
      setSelectedRx(null);
      setNote("");
    }
  }, [filteredPrescriptions, activeTab, selectedRx]);

  const handleSelectPrescription = (rx: PrescriptionRecord) => {
    setSelectedRx(rx);
    setNote(rx.pharmacistNote || "");
  };

  const handleOpenDetail = (rx: PrescriptionRecord) => {
    setSelectedRx(rx);
    setNote(rx.pharmacistNote || "");
  };

  const handleConfirmAction = async () => {
    if (!selectedRx || !pendingAction) return;

    try {
      setUpdating(true);
      const res = await fetch(`/api/prescriptions/${selectedRx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: pendingAction,
          pharmacistNote: note,
        }),
      });

      if (!res.ok) throw new Error("Failed to update prescription status");

      toastManager.add({
        title: `Prescription ${pendingAction}`,
        description: `Prescription #${selectedRx.id.substring(selectedRx.id.length - 6)} marked as ${pendingAction}.`,
        type: pendingAction === "APPROVED" ? "success" : "warning",
      });

      setActionConfirmOpen(false);
      fetchPrescriptions();
    } catch (err: any) {
      toastManager.add({
        title: "Action Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  const pendingCount = prescriptions.filter((r) => r.status === "PENDING").length;
  const approvedCount = prescriptions.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = prescriptions.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
            Prescription Verification Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated image intake from ESP32-CAM with Tesseract.js OCR and inventory matching.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPrescriptions}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Coss Tabs Queue */}
      <Tabs value={activeTab} onValueChange={(val) => val && setActiveTab(val)}>
        <div className="flex items-center justify-between pb-2">
          <TabsList size="default">
            <TabsTab value="PENDING" className="gap-2">
              <Clock className="size-4" />
              <span>Pending Review</span>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1 font-bold">
                {pendingCount}
              </Badge>
            </TabsTab>
            <TabsTab value="APPROVED" className="gap-2">
              <CheckCircle2 className="size-4 text-success" />
              <span>Approved</span>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1">
                {approvedCount}
              </Badge>
            </TabsTab>
            <TabsTab value="REJECTED" className="gap-2">
              <XCircle className="size-4 text-destructive" />
              <span>Rejected / Referred</span>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1">
                {rejectedCount}
              </Badge>
            </TabsTab>
          </TabsList>
        </div>

        {/* Tab Panels */}
        {["PENDING", "APPROVED", "REJECTED"].map((tab) => (
          <TabsPanel key={tab} value={tab} className="space-y-6 pt-2">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : filteredPrescriptions.length === 0 ? (
              <Empty className="py-16 bg-card border rounded-2xl shadow-xs">
                <EmptyMedia variant="icon">
                  <FileText className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No {tab.toLowerCase()} prescriptions</EmptyTitle>
                <EmptyDescription>
                  {tab === "PENDING"
                    ? "The queue is clear. No prescriptions currently awaiting pharmacist review."
                    : `No prescriptions currently marked as ${tab.toLowerCase()}.`}
                </EmptyDescription>
              </Empty>
            ) : selectedRx ? (
              <div className="space-y-6">
                {/* Main Split Panel Workspace: Left = Image, Right = Details & Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Prescription Intake Picture */}
                  <div className="lg:col-span-5 flex flex-col space-y-4">
                    <Card className="flex flex-col h-full shadow-xs">
                      <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 font-heading">
                              <Camera className="size-4 text-primary" />
                              Prescription Intake Image
                            </CardTitle>
                            <CardDescription className="text-xs">
                              High-resolution capture via ESP32-CAM
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            #{selectedRx.id.substring(selectedRx.id.length - 8)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 flex-1 flex flex-col justify-center">
                        {/* High-res Image Container */}
                        <div className="relative rounded-xl border bg-black p-3 flex items-center justify-center flex-1 min-h-[420px] max-h-[560px] overflow-hidden group">
                          <img
                            src={selectedRx.imageUrl}
                            alt="ESP32-CAM Prescription Intake"
                            className="size-full object-contain max-h-[520px] rounded-lg shadow-2xs transition-transform duration-200 group-hover:scale-[1.02]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/samples/prescription-1.svg";
                            }}
                          />
                          <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-xs flex items-center gap-1">
                            <Camera className="size-3" />
                            <span>ESP32-CAM 1600x1200</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Other Details, Inventory Matching & Pharmacist Actions */}
                  <div className="lg:col-span-7 flex flex-col space-y-4">
                    <Card className="flex flex-col h-full justify-between shadow-xs">
                      <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm font-bold font-heading">
                              Medication Matching &amp; Dispensing Details
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Verify OCR extracted drugs with real-time pharmacy stock &amp; shelf location
                            </CardDescription>
                          </div>
                          <div>
                            {selectedRx.status === "PENDING" ? (
                              <Badge variant="outline">
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
                                Pending Verification
                              </Badge>
                            ) : selectedRx.status === "APPROVED" ? (
                              <Badge variant="outline">
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-red-500" />
                                Rejected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-5 flex-1 overflow-y-auto">
                        {/* Extracted Items */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                              Extracted Items ({selectedRx.items.length})
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {selectedRx.items.filter((it) => it.inStock).length}/{selectedRx.items.length} In Stock
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {selectedRx.items.map((item, idx) => {
                              const matched = item.matchedMedicine;
                              const latestCount = matched?.stockLogs?.[0]?.count ?? (item.inStock ? 20 : 0);

                              return (
                                <div
                                  key={idx}
                                  className="rounded-xl border bg-card p-3.5 space-y-2 text-xs shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                                        Item #{idx + 1}
                                      </span>
                                      <div className="font-bold text-sm text-foreground">
                                        {item.extractedName}
                                      </div>
                                    </div>

                                    {item.inStock ? (
                                      <Badge variant="outline">
                                        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                                        In Stock (~{latestCount} units)
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        <span aria-hidden="true" className="size-1.5 rounded-full bg-red-500" />
                                        Out of Stock
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between pt-2 border-t text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <span>Matched Record:</span>
                                      {matched ? (
                                        <span className="font-semibold text-foreground">
                                          {matched.name}
                                        </span>
                                      ) : (
                                        <span className="text-destructive font-semibold">
                                          Unmatched (Manual entry required)
                                        </span>
                                      )}
                                    </div>

                                    {matched && (
                                      <PreviewCard>
                                        <PreviewCardTrigger
                                          render={
                                            <span className="cursor-help inline-flex items-center gap-1 text-primary font-medium hover:underline" />
                                          }
                                        >
                                          <MapPin className="size-3" />
                                          <span>{matched.shelfLocation}</span>
                                        </PreviewCardTrigger>
                                        <PreviewCardPopup className="w-68">
                                          <div className="space-y-1.5 text-xs">
                                            <div className="font-bold text-foreground">{matched.name}</div>
                                            <div className="text-muted-foreground flex items-center gap-1">
                                              <MapPin className="size-3 text-primary" />
                                              {matched.shelfLocation}
                                            </div>
                                            <div className="flex justify-between pt-1 border-t text-[11px]">
                                              <span>RFID UID:</span>
                                              <code className="font-mono">{matched.rfidUid}</code>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                              <span>Unit Weight:</span>
                                              <span>{matched.unitWeightGrams}g</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-semibold text-primary">
                                              <span>Available On Shelf:</span>
                                              <span>{latestCount} units</span>
                                            </div>
                                          </div>
                                        </PreviewCardPopup>
                                      </PreviewCard>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Pharmacist Clinical Notes */}
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <span>Pharmacist Clinical Note &amp; Verification Details</span>
                          </label>
                          <Textarea
                            placeholder="Record allergy checks, dosage adjustments, brand substitutions, or reason for referral..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            disabled={selectedRx.status !== "PENDING"}
                          />
                        </div>
                      </CardContent>

                      {/* Action Bar */}
                      <CardFooter className="pt-3 pb-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          Intake: {new Date(selectedRx.createdAt).toLocaleDateString()} {new Date(selectedRx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>

                        {selectedRx.status === "PENDING" ? (
                          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setPendingAction("REJECTED");
                                setActionConfirmOpen(true);
                              }}
                              disabled={updating}
                              className="gap-1.5"
                            >
                              <XCircle className="size-4" />
                              <span>Reject / Refer</span>
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                setPendingAction("APPROVED");
                                setActionConfirmOpen(true);
                              }}
                              disabled={updating}
                              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <CheckCircle2 className="size-4" />
                              <span>Approve &amp; Dispense</span>
                            </Button>
                          </div>
                        ) : selectedRx.status === "APPROVED" ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 py-1 px-2.5">
                            <CheckCircle2 className="size-3.5 me-1 text-emerald-600" />
                            Dispensed &amp; Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 py-1 px-2.5">
                            <XCircle className="size-3.5 me-1 text-rose-600" />
                            Prescription Rejected
                          </Badge>
                        )}
                      </CardFooter>
                    </Card>
                  </div>
                </div>

                {/* Queue Summary Table Below Split View */}
                <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      All {tab} Prescriptions ({filteredPrescriptions.length})
                    </span>
                    <span className="text-[11px] text-muted-foreground">Click any row to load into split view</span>
                  </div>
                  <Table>
                    <TableCaption>A list of recent prescriptions processed by ESP32-CAM and Tesseract.js.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prescription ID</TableHead>
                        <TableHead>Intake Image</TableHead>
                        <TableHead>Extracted Items</TableHead>
                        <TableHead>Inventory Match</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead className="w-24 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPrescriptions.map((rx) => {
                        const inStockItems = rx.items.filter((it) => it.inStock).length;
                        const allInStock = rx.items.length > 0 && inStockItems === rx.items.length;
                        const hasUnmatched = rx.items.some((it) => !it.matchedMedicineId);
                        const isSelected = selectedRx?.id === rx.id;

                        return (
                          <TableRow
                            key={rx.id}
                            className={cn(
                              "hover:bg-muted/30 cursor-pointer transition-colors",
                              isSelected ? "bg-primary/5 font-semibold" : ""
                            )}
                            onClick={() => handleSelectPrescription(rx)}
                          >
                            {/* ID & Status */}
                            <TableCell className="font-medium">
                              <div className="font-mono text-xs font-bold text-foreground">
                                #{rx.id.substring(rx.id.length - 8)}
                              </div>
                              <div className="mt-1">
                                {rx.status === "PENDING" ? (
                                  <Badge variant="outline">
                                    <span
                                      aria-hidden="true"
                                      className="size-1.5 rounded-full bg-amber-500"
                                    />
                                    Pending Verification
                                  </Badge>
                                ) : rx.status === "APPROVED" ? (
                                  <Badge variant="outline">
                                    <span
                                      aria-hidden="true"
                                      className="size-1.5 rounded-full bg-emerald-500"
                                    />
                                    Approved
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    <span
                                      aria-hidden="true"
                                      className="size-1.5 rounded-full bg-red-500"
                                    />
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Image preview */}
                            <TableCell>
                              <div className="relative size-12 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                                <img
                                  src={rx.imageUrl}
                                  alt="Prescription"
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/samples/prescription-1.svg";
                                  }}
                                />
                              </div>
                            </TableCell>

                            {/* Items summary */}
                            <TableCell>
                              <div className="space-y-0.5">
                                {rx.items.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="text-xs text-foreground font-medium truncate max-w-xs">
                                    • {item.extractedName}
                                  </div>
                                ))}
                                {rx.items.length > 2 && (
                                  <div className="text-[11px] text-muted-foreground">
                                    +{rx.items.length - 2} more medications
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Inventory Match Status */}
                            <TableCell>
                              {hasUnmatched ? (
                                <Badge variant="outline">
                                  <span
                                    aria-hidden="true"
                                    className="size-1.5 rounded-full bg-amber-500"
                                  />
                                  Unmatched Drug
                                </Badge>
                              ) : allInStock ? (
                                <Badge variant="outline">
                                  <span
                                    aria-hidden="true"
                                    className="size-1.5 rounded-full bg-emerald-500"
                                  />
                                  All In Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <span
                                    aria-hidden="true"
                                    className="size-1.5 rounded-full bg-red-500"
                                  />
                                  Out of Stock
                                </Badge>
                              )}
                            </TableCell>

                            {/* Timestamp */}
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(rx.createdAt).toLocaleDateString()} {new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </TableCell>

                            {/* Open Review button */}
                            <TableCell className="text-right">
                              <Button
                                size="xs"
                                variant={isSelected ? "default" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectPrescription(rx);
                                }}
                              >
                                {isSelected ? "Viewing" : "Review"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3}>
                          Queue Total: {filteredPrescriptions.length} Prescriptions ({tab})
                        </TableCell>
                        <TableCell colSpan={3} className="text-right">
                          ESP32-CAM OCR Telemetry Active
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            ) : null}
          </TabsPanel>
        ))}
      </Tabs>

      {/* Coss AlertDialog for Confirmation */}
      <AlertDialog open={actionConfirmOpen} onOpenChange={setActionConfirmOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle className={pendingAction === "APPROVED" ? "text-success" : "text-destructive"}>
              {pendingAction === "APPROVED"
                ? "Approve Prescription for Dispensation?"
                : "Reject Prescription?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "APPROVED"
                ? `You are confirming that you have clinically reviewed the original prescription #${selectedRx?.id.substring(selectedRx.id.length - 6)} and verified drug identity and stock.`
                : `This will mark prescription #${selectedRx?.id.substring(selectedRx.id.length - 6)} as rejected or referred.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={
                <Button variant="outline" onClick={() => setActionConfirmOpen(false)}>
                  Cancel
                </Button>
              }
            />
            <AlertDialogClose
              render={
                <Button
                  variant={pendingAction === "APPROVED" ? "default" : "destructive"}
                  onClick={handleConfirmAction}
                  loading={updating}
                >
                  Confirm {pendingAction === "APPROVED" ? "Approval" : "Rejection"}
                </Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}


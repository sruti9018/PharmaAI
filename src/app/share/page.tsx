"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Clock,
  User,
  KeyRound,
  ExternalLink,
  Sparkles,
  Lock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// Coss UI components:
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, Radio } from "@/components/ui/radio-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Patient {
  id: string;
  name: string;
  phone: string;
  sharedRecords?: any[];
}

export default function MedicalShareGeneratorPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Sections to share
  const [shareMedications, setShareMedications] = useState(true);
  const [shareAllergies, setShareAllergies] = useState(true);
  const [sharePrescriptions, setSharePrescriptions] = useState(true);
  const [shareEmergency, setShareEmergency] = useState(true);

  // Expiry time (hours)
  const [expiryHours, setExpiryHours] = useState<string>("24");
  const [requireOtp, setRequireOtp] = useState(false);

  // Result state
  const [generatedShare, setGeneratedShare] = useState<{
    token: string;
    shareUrl: string;
    otp: string | null;
    expiresAt: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const { copyToClipboard, isCopied } = useCopyToClipboard();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("/api/patients");
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || []);
          if (data.patients && data.patients.length > 0) {
            setSelectedPatientId(data.patients[0].id);
          }
        }
      } catch (err) {
        console.error("Patients fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handleGenerateShare = async () => {
    if (!selectedPatientId) {
      toastManager.add({
        title: "Selection Required",
        description: "Please select a patient profile to share.",
        type: "error",
      });
      return;
    }

    const sections: string[] = [];
    if (shareMedications) sections.push("activeMedications");
    if (shareAllergies) sections.push("allergies");
    if (sharePrescriptions) sections.push("recentPrescriptions");
    if (shareEmergency) sections.push("emergencyContact");

    if (sections.length === 0) {
      toastManager.add({
        title: "No Data Selected",
        description: "Choose at least one category of clinical data to share.",
        type: "error",
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          sections,
          expiryHours: Number(expiryHours),
          requireOtp,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate secure share link");

      const data = await res.json();
      setGeneratedShare(data);

      // Generate QR Code data URL
      const qr = await QRCode.toDataURL(data.shareUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: "#0f766e",
          light: "#ffffff",
        },
      });
      setQrDataUrl(qr);

      toastManager.add({
        title: "Secure Link Created",
        description: "Medical share link generated with cryptographic token.",
        type: "success",
      });
    } catch (err: any) {
      toastManager.add({
        title: "Generation Error",
        description: err.message,
        type: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
          Secure Medical Share Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate temporary, time-expiring clinical summaries for patients and consulting physicians.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              Configure Medical Share Record
            </CardTitle>
            <CardDescription className="text-xs">
              Select verified patient, clinical segments to disclose, and access lifespan.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Patient Selector */}
            <Field>
              <FieldLabel>Select Patient Record *</FieldLabel>
              <div className="w-full">
                <Select
                  value={selectedPatientId}
                  onValueChange={(val) => val && setSelectedPatientId(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose patient profile..." />
                  </SelectTrigger>
                  <SelectPopup>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.phone})
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              <FieldDescription>
                Verified patient in the clinical directory
              </FieldDescription>
            </Field>

            {/* Checkbox Group: What to share */}
            <Fieldset className="space-y-3 rounded-xl border p-4 bg-muted/20">
              <FieldsetLegend className="text-xs font-bold uppercase tracking-wider text-foreground">
                Clinical Disclosure Segments
              </FieldsetLegend>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer text-xs">
                  <Checkbox
                    checked={shareMedications}
                    onCheckedChange={(checked) => setShareMedications(!!checked)}
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Active Medications &amp; Dosages
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Current daily regimens, pill quantities, and indications
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-xs">
                  <Checkbox
                    checked={shareAllergies}
                    onCheckedChange={(checked) => setShareAllergies(!!checked)}
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Known Drug Allergies &amp; Severe Reactions
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Documented hypersensitivities and contraindications
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-xs">
                  <Checkbox
                    checked={sharePrescriptions}
                    onCheckedChange={(checked) => setSharePrescriptions(!!checked)}
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Recent Prescription History &amp; Physician Notes
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Past orders, doctor comments, and verification logs
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-xs">
                  <Checkbox
                    checked={shareEmergency}
                    onCheckedChange={(checked) => setShareEmergency(!!checked)}
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Emergency Contacts &amp; Next of Kin
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Primary contact numbers and designated caregivers
                    </p>
                  </div>
                </label>
              </div>
            </Fieldset>

            {/* Expiry Time Radio Group */}
            <Fieldset className="space-y-2.5">
              <FieldsetLegend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Link Expiration Lifespan
              </FieldsetLegend>

              <RadioGroup
                value={expiryHours}
                onValueChange={(val) => val && setExpiryHours(val)}
                className="grid grid-cols-3 gap-2"
              >
                <label className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors text-center text-xs",
                  expiryHours === "1" ? "border-primary bg-primary/5 text-primary font-bold" : "bg-card text-muted-foreground"
                )}>
                  <Radio value="1" className="sr-only" />
                  <Clock className="size-4 mb-1" />
                  <span>1 Hour</span>
                  <span className="text-[10px] font-normal opacity-70">Emergency</span>
                </label>

                <label className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors text-center text-xs",
                  expiryHours === "24" ? "border-primary bg-primary/5 text-primary font-bold" : "bg-card text-muted-foreground"
                )}>
                  <Radio value="24" className="sr-only" />
                  <Clock className="size-4 mb-1" />
                  <span>24 Hours</span>
                  <span className="text-[10px] font-normal opacity-70">Consultation</span>
                </label>

                <label className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors text-center text-xs",
                  expiryHours === "168" ? "border-primary bg-primary/5 text-primary font-bold" : "bg-card text-muted-foreground"
                )}>
                  <Radio value="168" className="sr-only" />
                  <Clock className="size-4 mb-1" />
                  <span>7 Days</span>
                  <span className="text-[10px] font-normal opacity-70">Care Episode</span>
                </label>
              </RadioGroup>
            </Fieldset>

            {/* Optional OTP Switch */}
            <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" />
                  Require 4-Digit Pharmacist Verification PIN
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Viewers must provide a one-time PIN before clinical data is decrypted
                </p>
              </div>
              <Switch checked={requireOtp} onCheckedChange={setRequireOtp} />
            </div>

            <Button
              onClick={handleGenerateShare}
              loading={generating}
              className="w-full gap-2"
              size="lg"
            >
              <Sparkles className="size-4" />
              <span>Generate Secure Share Link &amp; QR Code</span>
            </Button>
          </CardContent>
        </Card>

        {/* Share Link & QR Result Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <QrCode className="size-4 text-primary" />
              Patient Access Credentials
            </CardTitle>
            <CardDescription className="text-xs">
              Direct access URL and scannable QR code for bedside verification or mobile handoff.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 flex-1">
            {!generatedShare ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <div className="size-16 rounded-2xl bg-muted/50 border flex items-center justify-center mb-3">
                  <ShieldCheck className="size-8 text-muted-foreground/60" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">No Active Share Link</h3>
                <p className="text-xs max-w-xs mt-1">
                  Configure disclosure segments on the left and click &apos;Generate Secure Share Link&apos;.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* QR Code */}
                {qrDataUrl && (
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 border rounded-2xl">
                    <img
                      src={qrDataUrl}
                      alt="Share QR Code"
                      className="size-44 rounded-xl border bg-white p-2 shadow-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Scan with smartphone camera for instant read-only view
                    </p>
                  </div>
                )}

                {/* Link Box with Coss useCopyToClipboard */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground">
                    Public Read-Only URL:
                  </span>
                  <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-2 text-xs">
                    <code className="flex-1 truncate font-mono text-primary text-[11px]">
                      {generatedShare.shareUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedShare.shareUrl)}
                      className="gap-1.5 shrink-0"
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5 text-success" />
                          <span className="text-xs">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span className="text-xs">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Optional OTP PIN Display */}
                {generatedShare.otp && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-warning flex items-center gap-1.5">
                        <Lock className="size-3.5" />
                        Verification Security PIN
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Provide this 4-digit code to the recipient
                      </p>
                    </div>
                    <code className="text-lg font-black font-mono tracking-widest bg-card px-3 py-1 rounded-lg border border-warning/40 text-foreground">
                      {generatedShare.otp}
                    </code>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Expires: {new Date(generatedShare.expiresAt).toLocaleString()}</span>
                  <a
                    href={generatedShare.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    Open Link
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  Pill,
  AlertTriangle,
  FileText,
  Phone,
  Clock,
  Lock,
  ArrowRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";

// Coss UI components:
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SharedContents {
  patient: {
    id?: string;
    name: string;
    phone: string;
    bloodGroup?: string;
    dob?: string;
  };
  activeMedications?: Array<{
    name: string;
    dosage: string;
    purpose?: string;
  }>;
  allergies?: Array<{
    allergen: string;
    severity: string;
  }>;
  recentPrescriptions?: Array<{
    date: string;
    doctor: string;
    notes: string;
  }>;
  emergencyContact?: {
    name: string;
    phone: string;
    relation?: string;
  };
}

function PublicMedicalShareViewContent() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [patientName, setPatientName] = useState("");
  const [contents, setContents] = useState<SharedContents | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Accordion active items (array as required by Base UI / Coss)
  const [accordionValue, setAccordionValue] = useState<string[]>([
    "medications",
    "allergies",
    "prescriptions",
    "emergency",
  ]);

  const loadRecord = async (otp?: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const url = `/api/share/${token}${otp ? `?otp=${otp}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to load medical record.");
        return;
      }

      if (data.requiresOtp) {
        setRequiresOtp(true);
        setPatientName(data.patientName || "Patient");
        setExpiresAt(data.expiresAt);
      } else {
        setRequiresOtp(false);
        setContents(data.contents);
        setExpiresAt(data.expiresAt);
      }
    } catch {
      setErrorMsg("Network error connecting to PharmaLink secure records.");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (token) loadRecord();
  }, [token]);

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length < 4) {
      toastManager.add({
        title: "Incomplete Code",
        description: "Please enter the full 4-digit verification PIN.",
        type: "error",
      });
      return;
    }
    setVerifying(true);
    loadRecord(otpValue);
  };

  if (loading && !requiresOtp && !contents) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground font-heading">Access Denied</h2>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button variant="outline" onClick={() => loadRecord()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  // OTP Verification Screen
  if (requiresOtp) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Lock className="size-6" />
            </div>
            <CardTitle className="text-lg font-bold">Verification PIN Required</CardTitle>
            <CardDescription className="text-xs">
              This record for <strong className="text-foreground">{patientName}</strong> is encrypted.
              Enter the 4-digit code provided by the pharmacist.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleVerifyOtp} className="space-y-6 flex flex-col items-center">
              <OTPField
                length={4}
                value={otpValue}
                onValueChange={(val: string) => setOtpValue(val)}
                size="lg"
                className="justify-center"
              >
                <OTPFieldInput />
                <OTPFieldInput />
                <OTPFieldInput />
                <OTPFieldInput />
              </OTPField>

              <Button type="submit" loading={verifying} className="w-full gap-2">
                <span>Decrypt &amp; Access Record</span>
                <ArrowRight className="size-4" />
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Demo Hint: If simulating, PIN is displayed on the pharmacist generation dashboard.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Decrypted Patient Medical View
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            PharmaLink AI • Certified Read-Only Summary
          </span>
          <h1 className="text-2xl font-bold text-foreground font-heading mt-0.5">
            {contents?.patient.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phone: {contents?.patient.phone} • Blood Group: {contents?.patient.bloodGroup || "O+"} • DOB: {contents?.patient.dob || "1984-06-14"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs py-1 px-2.5">
            <CheckCircle2 className="size-3.5 me-1" />
            Verified Record
          </Badge>
          {expiresAt && (
            <Badge variant="outline" className="text-xs py-1 px-2.5 text-muted-foreground">
              <Clock className="size-3 me-1" />
              Expires {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Badge>
          )}
        </div>
      </div>

      <Alert variant="info" className="text-xs bg-muted/40">
        <AlertTitle className="text-xs font-semibold">Clinical Information Notice</AlertTitle>
        <AlertDescription className="text-[11px]">
          This electronic summary is generated from verified pharmacy dispensing records for bedside or emergency clinical consultation.
        </AlertDescription>
      </Alert>

      {/* Accordion with sections */}
      <Card className="overflow-hidden p-2">
        <Accordion
          value={accordionValue}
          onValueChange={(val) => setAccordionValue(val as string[])}
          multiple
          className="divide-y"
        >
          {/* Section 1: Active Medications */}
          {contents?.activeMedications && (
            <AccordionItem value="medications">
              <AccordionTrigger className="text-base font-semibold px-4">
                <span className="flex items-center gap-2.5">
                  <Pill className="size-4.5 text-primary" />
                  Active Medications ({contents.activeMedications.length})
                </span>
              </AccordionTrigger>
              <AccordionPanel className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {contents.activeMedications.map((med, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-muted/20 space-y-1">
                      <div className="font-bold text-sm text-foreground">{med.name}</div>
                      <div className="text-xs text-primary font-medium">{med.dosage}</div>
                      {med.purpose && (
                        <div className="text-[11px] text-muted-foreground">Indication: {med.purpose}</div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionPanel>
            </AccordionItem>
          )}

          {/* Section 2: Allergies */}
          {contents?.allergies && (
            <AccordionItem value="allergies">
              <AccordionTrigger className="text-base font-semibold px-4">
                <span className="flex items-center gap-2.5">
                  <AlertTriangle className="size-4.5 text-destructive" />
                  Known Allergies &amp; Adverse Reactions ({contents.allergies.length})
                </span>
              </AccordionTrigger>
              <AccordionPanel className="px-4 pb-4">
                <div className="space-y-2 pt-2">
                  {contents.allergies.map((allergy, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-xs"
                    >
                      <span className="font-bold text-foreground text-sm">{allergy.allergen}</span>
                      <Badge variant="destructive" className="text-xs">
                        {allergy.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionPanel>
            </AccordionItem>
          )}

          {/* Section 3: Recent Prescriptions */}
          {contents?.recentPrescriptions && (
            <AccordionItem value="prescriptions">
              <AccordionTrigger className="text-base font-semibold px-4">
                <span className="flex items-center gap-2.5">
                  <FileText className="size-4.5 text-info" />
                  Recent Prescription Orders &amp; Notes ({contents.recentPrescriptions.length})
                </span>
              </AccordionTrigger>
              <AccordionPanel className="px-4 pb-4">
                <div className="space-y-2.5 pt-2">
                  {contents.recentPrescriptions.map((order, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-muted/20 space-y-1 text-xs">
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>{order.doctor}</span>
                        <span className="text-muted-foreground text-[11px]">{order.date}</span>
                      </div>
                      <p className="text-muted-foreground">{order.notes}</p>
                    </div>
                  ))}
                </div>
              </AccordionPanel>
            </AccordionItem>
          )}

          {/* Section 4: Emergency Contacts */}
          {contents?.emergencyContact && (
            <AccordionItem value="emergency">
              <AccordionTrigger className="text-base font-semibold px-4">
                <span className="flex items-center gap-2.5">
                  <Phone className="size-4.5 text-foreground" />
                  Designated Emergency Contact
                </span>
              </AccordionTrigger>
              <AccordionPanel className="px-4 pb-4">
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1 text-xs pt-2">
                  <div className="font-bold text-foreground text-sm">
                    {contents.emergencyContact.name}
                  </div>
                  <div className="text-primary font-mono font-medium">
                    {contents.emergencyContact.phone}
                  </div>
                  {contents.emergencyContact.relation && (
                    <div className="text-muted-foreground text-[11px]">
                      Relationship: {contents.emergencyContact.relation}
                    </div>
                  )}
                </div>
              </AccordionPanel>
            </AccordionItem>
          )}
        </Accordion>
      </Card>
    </div>
  );
}

export default function PublicMedicalShareViewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-12 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PublicMedicalShareViewContent />
    </Suspense>
  );
}


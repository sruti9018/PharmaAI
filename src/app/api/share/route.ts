import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const sharePayloadSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  sections: z.array(z.string()).min(1, "At least one section must be selected"),
  expiryHours: z.number().positive().default(24),
  requireOtp: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sharePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { patientId, sections, expiryHours, requireOtp } = parsed.data;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Build the contents based on selected sections
    const fullPatientData = {
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        bloodGroup: "O+",
        dob: "1984-06-14",
      },
      activeMedications: [
        { name: "Metformin 500mg", dosage: "1 tablet twice daily with meals", purpose: "Type 2 Diabetes" },
        { name: "Lisinopril 10mg", dosage: "1 tablet daily in morning", purpose: "Hypertension" },
        { name: "Atorvastatin 20mg", dosage: "1 tablet at bedtime", purpose: "Hyperlipidemia" },
      ],
      allergies: [
        { allergen: "Penicillin", severity: "Severe (Anaphylaxis risk)" },
        { allergen: "Sulfa Drugs", severity: "Moderate (Skin rash)" },
      ],
      recentPrescriptions: [
        { date: "2026-10-15", doctor: "Dr. Arthur Bell", notes: "HbA1c steady at 6.8%. Continue standard regimen." },
        { date: "2026-09-02", doctor: "Dr. Evelyn Reed", notes: "Blood pressure 124/82 mmHg. Well controlled." },
      ],
      emergencyContact: {
        name: "Thomas Vance (Spouse)",
        phone: "+1 (555) 234-8902",
        relation: "Next of Kin",
      },
    };

    const filteredContents: Record<string, any> = {
      patient: fullPatientData.patient,
    };

    if (sections.includes("activeMedications")) {
      filteredContents.activeMedications = fullPatientData.activeMedications;
    }
    if (sections.includes("allergies")) {
      filteredContents.allergies = fullPatientData.allergies;
    }
    if (sections.includes("recentPrescriptions")) {
      filteredContents.recentPrescriptions = fullPatientData.recentPrescriptions;
    }
    if (sections.includes("emergencyContact")) {
      filteredContents.emergencyContact = fullPatientData.emergencyContact;
    }

    const token = `rec_${crypto.randomBytes(6).toString("hex")}`;
    const otp = requireOtp ? Math.floor(1000 + Math.random() * 9000).toString() : null;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const record = await prisma.sharedRecord.create({
      data: {
        patientId: patient.id,
        token,
        otp,
        expiresAt,
        contents: JSON.stringify(filteredContents),
      },
    });

    const origin = request.nextUrl.origin || "http://localhost:3000";
    const shareUrl = `${origin}/share/${token}`;

    return NextResponse.json({
      success: true,
      token: record.token,
      otp: record.otp,
      expiresAt: record.expiresAt,
      shareUrl,
    });
  } catch (error) {
    console.error("Share creation error:", error);
    return NextResponse.json(
      { error: "Failed to generate share link", details: String(error) },
      { status: 500 }
    );
  }
}


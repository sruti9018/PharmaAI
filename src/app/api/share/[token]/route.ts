import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const providedOtp = url.searchParams.get("otp");

    const record = await prisma.sharedRecord.findUnique({
      where: { token },
      include: {
        patient: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Shared record not found or link has expired." },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "This secure medical share link has expired." },
        { status: 410 }
      );
    }

    // Check OTP requirement
    if (record.otp) {
      if (!providedOtp) {
        return NextResponse.json({
          success: true,
          requiresOtp: true,
          patientName: record.patient.name,
          expiresAt: record.expiresAt,
        });
      }

      if (providedOtp.trim() !== record.otp.trim()) {
        return NextResponse.json(
          { error: "Invalid verification OTP. Please try again." },
          { status: 403 }
        );
      }
    }

    // Mark accessed time
    await prisma.sharedRecord.update({
      where: { id: record.id },
      data: { accessedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      requiresOtp: false,
      contents: JSON.parse(record.contents),
      expiresAt: record.expiresAt,
      accessedAt: new Date(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load medical record", details: String(error) },
      { status: 500 }
    );
  }
}


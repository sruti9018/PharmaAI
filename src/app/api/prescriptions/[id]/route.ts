import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updatePrescriptionSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  pharmacistNote: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            matchedMedicine: {
              include: {
                stockLogs: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, prescription });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch prescription", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePrescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { status, pharmacistNote } = parsed.data;

    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        status,
        pharmacistNote: pharmacistNote ?? undefined,
      },
      include: {
        items: {
          include: {
            matchedMedicine: true,
          },
        },
      },
    });

    // Also create alert log of pharmacist action
    await prisma.alert.create({
      data: {
        type: "PRESCRIPTION",
        severity: status === "APPROVED" ? "info" : "warning",
        title: `Prescription #${id.substring(id.length - 6)} ${status}`,
        message: pharmacistNote
          ? `Pharmacist marked as ${status}: "${pharmacistNote}"`
          : `Pharmacist marked prescription as ${status}.`,
        read: true,
      },
    });

    return NextResponse.json({ success: true, prescription: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update prescription", details: String(error) },
      { status: 500 }
    );
  }
}


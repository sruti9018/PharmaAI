import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateMedicineSchema = z.object({
  name: z.string().min(2).optional(),
  shelfLocation: z.string().min(1).optional(),
  unitWeightGrams: z.number().positive().optional(),
  minStockCount: z.number().int().nonnegative().optional(),
  expiryDate: z.string().or(z.date()).optional(),
  addStockCount: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!medicine) {
      return NextResponse.json(
        { error: "Medicine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, medicine });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch medicine", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMedicineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      shelfLocation,
      unitWeightGrams,
      minStockCount,
      expiryDate,
      addStockCount,
    } = parsed.data;

    const current = await prisma.medicine.findUnique({
      where: { id },
      include: {
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        name: name ?? current.name,
        shelfLocation: shelfLocation ?? current.shelfLocation,
        unitWeightGrams: unitWeightGrams ?? current.unitWeightGrams,
        minStockCount: minStockCount ?? current.minStockCount,
        expiryDate: expiryDate ? new Date(expiryDate) : current.expiryDate,
      },
    });

    if (addStockCount !== undefined && addStockCount !== 0) {
      const currentCount = current.stockLogs[0]?.count ?? 0;
      const newCount = Math.max(0, currentCount + addStockCount);
      const newWeight = Math.round(newCount * updated.unitWeightGrams * 100) / 100;

      await prisma.stockLog.create({
        data: {
          medicineId: updated.id,
          count: newCount,
          weightGrams: newWeight,
        },
      });
    }

    return NextResponse.json({ success: true, medicine: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update medicine", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.medicine.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete medicine", details: String(error) },
      { status: 500 }
    );
  }
}


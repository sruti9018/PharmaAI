import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createMedicineSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  rfidUid: z.string().min(4, "RFID UID is required"),
  shelfLocation: z.string().min(2, "Shelf location is required"),
  unitWeightGrams: z.number().positive("Unit weight must be greater than 0"),
  minStockCount: z.number().int().nonnegative("Minimum stock cannot be negative"),
  expiryDate: z.string().or(z.date()),
  initialCount: z.number().int().nonnegative().optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const filter = url.searchParams.get("filter") || "all"; // all | low | expiring

    const medicines = await prisma.medicine.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { rfidUid: { contains: search } },
              { shelfLocation: { contains: search } },
            ],
          }
        : undefined,
      include: {
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    const now = Date.now();
    const result = medicines
      .map((med) => {
        const latestStock = med.stockLogs[0];
        const count = latestStock ? latestStock.count : 0;
        const weightGrams = latestStock ? latestStock.weightGrams : 0;
        const daysUntilExpiry = Math.ceil(
          (med.expiryDate.getTime() - now) / (1000 * 60 * 60 * 24)
        );

        let status: "OK" | "Low" | "Out" = "OK";
        if (count === 0) status = "Out";
        else if (count < med.minStockCount) status = "Low";

        return {
          id: med.id,
          name: med.name,
          rfidUid: med.rfidUid,
          shelfLocation: med.shelfLocation,
          unitWeightGrams: med.unitWeightGrams,
          minStockCount: med.minStockCount,
          expiryDate: med.expiryDate,
          daysUntilExpiry,
          currentCount: count,
          weightGrams,
          status,
          isLowStock: count < med.minStockCount,
          isExpiringSoon: daysUntilExpiry <= 30,
        };
      })
      .filter((item) => {
        if (filter === "low") return item.status === "Low" || item.status === "Out";
        if (filter === "expiring") return item.isExpiringSoon;
        if (filter === "ok") return item.status === "OK";
        return true;
      });

    return NextResponse.json({ success: true, medicines: result });
  } catch (error) {
    console.error("Fetch medicines error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medicines" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createMedicineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      rfidUid,
      shelfLocation,
      unitWeightGrams,
      minStockCount,
      expiryDate,
      initialCount,
    } = parsed.data;

    // Check if RFID UID already exists
    const existing = await prisma.medicine.findUnique({
      where: { rfidUid },
    });

    if (existing) {
      return NextResponse.json(
        { error: `RFID UID "${rfidUid}" is already assigned to ${existing.name}` },
        { status: 400 }
      );
    }

    const medicine = await prisma.medicine.create({
      data: {
        name,
        rfidUid,
        shelfLocation,
        unitWeightGrams,
        minStockCount,
        expiryDate: new Date(expiryDate),
      },
    });

    // Create initial stock log
    const initialWeight = Math.round(initialCount * unitWeightGrams * 100) / 100;
    await prisma.stockLog.create({
      data: {
        medicineId: medicine.id,
        weightGrams: initialWeight,
        count: initialCount,
      },
    });

    return NextResponse.json({
      success: true,
      medicine,
      message: "Medicine registered successfully",
    });
  } catch (error) {
    console.error("Create medicine error:", error);
    return NextResponse.json(
      { error: "Failed to create medicine", details: String(error) },
      { status: 500 }
    );
  }
}


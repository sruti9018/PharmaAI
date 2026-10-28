import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/authHardware";

const stockPayloadSchema = z.object({
  rfidUid: z.string().min(1, "RFID UID is required"),
  weightGrams: z.number().min(0, "Weight cannot be negative"),
});

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing x-api-key header" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = stockPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { rfidUid, weightGrams } = parsed.data;

    // Find medicine by rfidUid
    const medicine = await prisma.medicine.findUnique({
      where: { rfidUid },
      include: {
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!medicine) {
      return NextResponse.json(
        {
          error: `Medicine with RFID UID "${rfidUid}" not found in inventory`,
          rfidUid,
        },
        { status: 404 }
      );
    }

    // Calculate count from load cell weight: count = weight / unitWeightGrams
    const calculatedCount = Math.max(
      0,
      Math.floor(weightGrams / medicine.unitWeightGrams)
    );

    // Save StockLog
    const stockLog = await prisma.stockLog.create({
      data: {
        medicineId: medicine.id,
        weightGrams: Math.round(weightGrams * 100) / 100,
        count: calculatedCount,
      },
    });

    let alertCreated = null;
    const isLowStock = calculatedCount < medicine.minStockCount;

    if (isLowStock) {
      alertCreated = await prisma.alert.create({
        data: {
          type: "LOW_STOCK",
          severity: calculatedCount <= 5 ? "destructive" : "warning",
          title: `Hardware Alert: Low Stock for ${medicine.name}`,
          message: `Load cell measured ${weightGrams}g (~${calculatedCount} units) on ${medicine.shelfLocation}. Minimum required: ${medicine.minStockCount} units.`,
          medicineId: medicine.id,
          read: false,
        },
      });
    }

    // Update latest RFID scan state
    await prisma.hardwareState.upsert({
      where: { id: "latest_rfid_scan" },
      update: {
        value: JSON.stringify({
          rfidUid: medicine.rfidUid,
          scannedAt: new Date().toISOString(),
          medicineId: medicine.id,
          medicineName: medicine.name,
          shelfLocation: medicine.shelfLocation,
          count: calculatedCount,
          minStockCount: medicine.minStockCount,
          unitWeightGrams: medicine.unitWeightGrams,
          totalWeightGrams: weightGrams,
          expiryDate: medicine.expiryDate.toISOString(),
          isLowStock,
        }),
      },
      create: {
        id: "latest_rfid_scan",
        value: JSON.stringify({
          rfidUid: medicine.rfidUid,
          scannedAt: new Date().toISOString(),
          medicineId: medicine.id,
          medicineName: medicine.name,
          shelfLocation: medicine.shelfLocation,
          count: calculatedCount,
          minStockCount: medicine.minStockCount,
          unitWeightGrams: medicine.unitWeightGrams,
          totalWeightGrams: weightGrams,
          expiryDate: medicine.expiryDate.toISOString(),
          isLowStock,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      medicine: {
        id: medicine.id,
        name: medicine.name,
        shelfLocation: medicine.shelfLocation,
      },
      stockLogId: stockLog.id,
      weightGrams,
      calculatedCount,
      minStockCount: medicine.minStockCount,
      isLowStock,
      alert: alertCreated,
    });
  } catch (error) {
    console.error("Stock endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return latest stock per medicine and past 7 days aggregate for dashboard chart
    const medicines = await prisma.medicine.findMany({
      include: {
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 7,
        },
      },
    });

    const summary = medicines.map((med) => {
      const latestLog = med.stockLogs[0];
      const count = latestLog ? latestLog.count : 0;
      const daysUntilExpiry = Math.ceil(
        (med.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

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
        currentWeightGrams: latestLog ? latestLog.weightGrams : 0,
        isLowStock: count < med.minStockCount,
        isExpiringSoon: daysUntilExpiry <= 30,
        history: med.stockLogs.map((l) => ({
          date: l.createdAt.toISOString().split("T")[0],
          count: l.count,
        })),
      };
    });

    return NextResponse.json({ success: true, medicines: summary });
  } catch (error) {
    console.error("Stock GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock summary" },
      { status: 500 }
    );
  }
}


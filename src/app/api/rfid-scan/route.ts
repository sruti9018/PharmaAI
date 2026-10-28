import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/authHardware";

const rfidPayloadSchema = z.object({
  rfidUid: z.string().min(1, "RFID UID is required"),
});

export async function POST(request: NextRequest) {
  // Allow hardware calls with API key or simulator requests
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing x-api-key header" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = rfidPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { rfidUid } = parsed.data;

    // Look up medicine
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
      // Record unknown RFID attempt
      const scanData = {
        rfidUid,
        scannedAt: new Date().toISOString(),
        notFound: true,
        message: `Unknown RFID Tag detected: ${rfidUid}`,
      };

      await prisma.hardwareState.upsert({
        where: { id: "latest_rfid_scan" },
        update: { value: JSON.stringify(scanData) },
        create: { id: "latest_rfid_scan", value: JSON.stringify(scanData) },
      });

      return NextResponse.json(
        { error: "Medicine not registered for this RFID tag", rfidUid },
        { status: 404 }
      );
    }

    const latestStock = medicine.stockLogs[0];
    const currentCount = latestStock ? latestStock.count : 0;
    const currentWeightGrams = latestStock ? latestStock.weightGrams : 0;
    const isLowStock = currentCount < medicine.minStockCount;
    const daysUntilExpiry = Math.ceil(
      (medicine.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const scanData = {
      rfidUid: medicine.rfidUid,
      scannedAt: new Date().toISOString(),
      medicineId: medicine.id,
      medicineName: medicine.name,
      shelfLocation: medicine.shelfLocation,
      count: currentCount,
      minStockCount: medicine.minStockCount,
      unitWeightGrams: medicine.unitWeightGrams,
      totalWeightGrams: currentWeightGrams,
      expiryDate: medicine.expiryDate.toISOString(),
      daysUntilExpiry,
      isLowStock,
      notFound: false,
    };

    // Save as "latest scan" in HardwareState
    await prisma.hardwareState.upsert({
      where: { id: "latest_rfid_scan" },
      update: { value: JSON.stringify(scanData) },
      create: { id: "latest_rfid_scan", value: JSON.stringify(scanData) },
    });

    return NextResponse.json({
      success: true,
      medicine: {
        id: medicine.id,
        name: medicine.name,
        rfidUid: medicine.rfidUid,
        shelfLocation: medicine.shelfLocation,
        unitWeightGrams: medicine.unitWeightGrams,
        minStockCount: medicine.minStockCount,
        expiryDate: medicine.expiryDate,
        daysUntilExpiry,
      },
      currentStock: currentCount,
      totalWeightGrams: currentWeightGrams,
      isLowStock,
      scannedAt: scanData.scannedAt,
    });
  } catch (error) {
    console.error("RFID Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const state = await prisma.hardwareState.findUnique({
      where: { id: "latest_rfid_scan" },
    });

    if (!state) {
      return NextResponse.json({ success: true, latestScan: null });
    }

    const latestScan = JSON.parse(state.value);
    return NextResponse.json({ success: true, latestScan });
  } catch (error) {
    console.error("RFID GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest RFID scan" },
      { status: 500 }
    );
  }
}


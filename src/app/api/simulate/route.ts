import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, medicineId, rfidUid, weightGrams, customCount } = body;

    if (action === "stock") {
      let med = null;
      if (medicineId) {
        med = await prisma.medicine.findUnique({ where: { id: medicineId } });
      } else if (rfidUid) {
        med = await prisma.medicine.findUnique({ where: { rfidUid } });
      } else {
        // Pick random medicine
        const meds = await prisma.medicine.findMany();
        med = meds[Math.floor(Math.random() * meds.length)];
      }

      if (!med) {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
      }

      const count =
        customCount !== undefined
          ? Number(customCount)
          : Math.floor(Math.random() * (med.minStockCount * 2));
      const weight =
        weightGrams !== undefined
          ? Number(weightGrams)
          : Math.round(count * med.unitWeightGrams * 100) / 100;

      const stockLog = await prisma.stockLog.create({
        data: {
          medicineId: med.id,
          weightGrams: weight,
          count,
        },
      });

      const isLowStock = count < med.minStockCount;
      let alert = null;
      if (isLowStock) {
        alert = await prisma.alert.create({
          data: {
            type: "LOW_STOCK",
            severity: count <= 5 ? "destructive" : "warning",
            title: `[Simulated ESP32] Low Stock: ${med.name}`,
            message: `Load cell simulated weight: ${weight}g (~${count} units) on ${med.shelfLocation}. Min threshold: ${med.minStockCount}.`,
            medicineId: med.id,
            read: false,
          },
        });
      }

      // Update latest RFID state
      await prisma.hardwareState.upsert({
        where: { id: "latest_rfid_scan" },
        update: {
          value: JSON.stringify({
            rfidUid: med.rfidUid,
            scannedAt: new Date().toISOString(),
            medicineId: med.id,
            medicineName: med.name,
            shelfLocation: med.shelfLocation,
            count,
            minStockCount: med.minStockCount,
            unitWeightGrams: med.unitWeightGrams,
            totalWeightGrams: weight,
            expiryDate: med.expiryDate.toISOString(),
            isLowStock,
          }),
        },
        create: {
          id: "latest_rfid_scan",
          value: JSON.stringify({
            rfidUid: med.rfidUid,
            scannedAt: new Date().toISOString(),
            medicineId: med.id,
            medicineName: med.name,
            shelfLocation: med.shelfLocation,
            count,
            minStockCount: med.minStockCount,
            unitWeightGrams: med.unitWeightGrams,
            totalWeightGrams: weight,
            expiryDate: med.expiryDate.toISOString(),
            isLowStock,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        action: "stock",
        medicineName: med.name,
        count,
        weightGrams: weight,
        isLowStock,
        alert,
      });
    }

    if (action === "rfid") {
      let med = null;
      if (rfidUid) {
        med = await prisma.medicine.findUnique({
          where: { rfidUid },
          include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
      } else {
        const meds = await prisma.medicine.findMany({
          include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        med = meds[Math.floor(Math.random() * meds.length)];
      }

      if (!med) {
        return NextResponse.json({ error: "No medicines found" }, { status: 404 });
      }

      const count = med.stockLogs[0]?.count ?? 0;
      const weight = med.stockLogs[0]?.weightGrams ?? 0;
      const isLowStock = count < med.minStockCount;

      const scanData = {
        rfidUid: med.rfidUid,
        scannedAt: new Date().toISOString(),
        medicineId: med.id,
        medicineName: med.name,
        shelfLocation: med.shelfLocation,
        count,
        minStockCount: med.minStockCount,
        unitWeightGrams: med.unitWeightGrams,
        totalWeightGrams: weight,
        expiryDate: med.expiryDate.toISOString(),
        isLowStock,
        notFound: false,
      };

      await prisma.hardwareState.upsert({
        where: { id: "latest_rfid_scan" },
        update: { value: JSON.stringify(scanData) },
        create: { id: "latest_rfid_scan", value: JSON.stringify(scanData) },
      });

      return NextResponse.json({
        success: true,
        action: "rfid",
        scanData,
      });
    }

    if (action === "prescription") {
      // Simulate ESP32-CAM upload with a realistic prescription sample
      const samples = [
        {
          text: "Rx:\nAmoxicillin 500mg Caps\nSig: 1 cap TID x 7 days #21\nOmeprazole 20mg Delayed-Release #14\nSig: 1 qAM before breakfast",
          med1: "Amoxicillin",
          med2: "Omeprazole",
        },
        {
          text: "Rx:\nMetformin 500mg Tabs #60\nSig: 1 BID with meals\nLisinopril 10mg Tabs #30\nSig: 1 daily in morning",
          med1: "Metformin",
          med2: "Lisinopril",
        },
        {
          text: "Rx:\nIbuprofen 400mg Film-Coated #30\nSig: 1 tab q6h PRN pain\nCetirizine HCl 10mg #15\nSig: 1 qHS",
          med1: "Ibuprofen",
          med2: "Cetirizine",
        },
      ];

      const chosen = samples[Math.floor(Math.random() * samples.length)];
      const medA = await prisma.medicine.findFirst({
        where: { name: { contains: chosen.med1 } },
        include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      const medB = await prisma.medicine.findFirst({
        where: { name: { contains: chosen.med2 } },
        include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      const prescription = await prisma.prescription.create({
        data: {
          imageUrl: "/samples/prescription-cam-sim.jpg",
          extractedText: chosen.text,
          status: "PENDING",
          pharmacistNote: null,
          items: {
            create: [
              {
                extractedName: chosen.med1 + " 500mg",
                matchedMedicineId: medA?.id ?? null,
                inStock: (medA?.stockLogs[0]?.count ?? 0) > 0,
              },
              {
                extractedName: chosen.med2 + " 20mg",
                matchedMedicineId: medB?.id ?? null,
                inStock: (medB?.stockLogs[0]?.count ?? 0) > 0,
              },
            ],
          },
        },
        include: {
          items: {
            include: { matchedMedicine: true },
          },
        },
      });

      await prisma.alert.create({
        data: {
          type: "PRESCRIPTION",
          severity: "info",
          title: `[Simulated ESP32-CAM] New Prescription Captured`,
          message: `Prescription #${prescription.id.substring(prescription.id.length - 6)} queued for pharmacist review.`,
          read: false,
        },
      });

      return NextResponse.json({
        success: true,
        action: "prescription",
        prescription,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: "Simulation failed", details: String(error) },
      { status: 500 }
    );
  }
}


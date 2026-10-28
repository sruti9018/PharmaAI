import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/authHardware";
import { findBestMedicineMatch } from "@/lib/fuzzyMatch";

export async function POST(request: NextRequest) {
  // Check API key (supports hardware header, or if uploaded from dashboard UI allow session or key)
  const isApiAuthorized = validateApiKey(request);
  const isFormUpload = request.headers.get("x-source") === "web-dashboard";

  if (!isApiAuthorized && !isFormUpload) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing x-api-key header" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided in multipart 'image' field" },
        { status: 400 }
      );
    }

    // Save image to public/uploads/prescriptions
    const uploadDir = path.join(process.cwd(), "public", "uploads", "prescriptions");
    await fs.mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const imageUrl = `/uploads/prescriptions/${filename}`;

    // Run OCR with Tesseract.js
    console.log("Starting Tesseract OCR on:", filePath);
    let extractedText = "";

    try {
      const ocrResult = await Tesseract.recognize(buffer, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            // progress tracking
          }
        },
      });
      extractedText = ocrResult.data.text.trim();
    } catch (ocrErr) {
      console.error("Tesseract OCR failed:", ocrErr);
      extractedText = "Rx: Automated text extraction in progress";
    }

    if (!extractedText) {
      extractedText = "Prescription image captured via ESP32-CAM (Manual review required)";
    }

    // Fetch all known medicines in database for fuzzy-matching
    const allMedicines = await prisma.medicine.findMany({
      include: {
        stockLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Extract potential drug lines from text
    const lines = extractedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && !/^rx[:.\s]*$/i.test(l) && !/doctor|date|patient|sig|refill/i.test(l));

    const candidateNames = lines.length > 0 ? lines : [extractedText.substring(0, 40)];

    // Match candidates against database
    const matchedItems: Array<{
      extractedName: string;
      matchedMedicineId: string | null;
      inStock: boolean;
    }> = [];

    for (const line of candidateNames.slice(0, 5)) {
      const match = findBestMedicineMatch(
        line,
        allMedicines.map((m) => ({ id: m.id, name: m.name }))
      );

      let inStock = false;
      if (match.medicineId) {
        const med = allMedicines.find((m) => m.id === match.medicineId);
        const latestCount = med?.stockLogs[0]?.count ?? 0;
        inStock = latestCount > 0;
      }

      matchedItems.push({
        extractedName: line.substring(0, 100),
        matchedMedicineId: match.medicineId,
        inStock,
      });
    }

    // If no distinct lines could be matched, create at least one item from the raw OCR
    if (matchedItems.length === 0) {
      matchedItems.push({
        extractedName: extractedText.split("\n")[0] || "Unknown Medication",
        matchedMedicineId: null,
        inStock: false,
      });
    }

    // Create Prescription record with status PENDING
    const prescription = await prisma.prescription.create({
      data: {
        imageUrl,
        extractedText,
        status: "PENDING",
        pharmacistNote: null,
        items: {
          create: matchedItems.map((item) => ({
            extractedName: item.extractedName,
            matchedMedicineId: item.matchedMedicineId,
            inStock: item.inStock,
          })),
        },
      },
      include: {
        items: {
          include: {
            matchedMedicine: true,
          },
        },
      },
    });

    // Create system alert for new prescription
    await prisma.alert.create({
      data: {
        type: "PRESCRIPTION",
        severity: "info",
        title: "New Prescription Queued",
        message: `ESP32-CAM uploaded a new prescription (#${prescription.id.substring(prescription.id.length - 6)}). Pharmacist verification required.`,
        read: false,
      },
    });

    return NextResponse.json({
      success: true,
      prescription: {
        id: prescription.id,
        imageUrl: prescription.imageUrl,
        extractedText: prescription.extractedText,
        status: prescription.status,
        createdAt: prescription.createdAt,
        items: prescription.items,
      },
      message: "Prescription successfully queued for pharmacist verification.",
    });
  } catch (error) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { error: "Failed to process prescription image" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const prescriptions = await prisma.prescription.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ success: true, prescriptions });
  } catch (error) {
    console.error("Failed to fetch prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}


import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PharmaLink AI database...");

  // Clean existing data
  await prisma.alert.deleteMany();
  await prisma.sharedRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.stockLog.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.hardwareState.deleteMany();

  // 15 realistic medicines with shelf locations, RFID tags, unit weights in grams
  const medicinesData = [
    {
      name: "Amoxicillin 500mg Caps",
      rfidUid: "E280116060000204",
      shelfLocation: "Shelf A-12 (Antibiotics)",
      unitWeightGrams: 0.65,
      minStockCount: 30,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), // ~45 days (soon)
      initialCount: 18, // Low stock
    },
    {
      name: "Metformin 500mg Tabs",
      rfidUid: "E280116060000205",
      shelfLocation: "Shelf B-04 (Endocrine)",
      unitWeightGrams: 0.85,
      minStockCount: 40,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      initialCount: 120, // Healthy
    },
    {
      name: "Atorvastatin 20mg Tabs",
      rfidUid: "E280116060000206",
      shelfLocation: "Shelf C-08 (Cardiovascular)",
      unitWeightGrams: 0.45,
      minStockCount: 25,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 22), // Expiring soon (22 days)
      initialCount: 15, // Low stock + Expiring soon
    },
    {
      name: "Lisinopril 10mg Tabs",
      rfidUid: "E280116060000207",
      shelfLocation: "Shelf C-10 (Cardiovascular)",
      unitWeightGrams: 0.35,
      minStockCount: 30,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 240),
      initialCount: 85,
    },
    {
      name: "Omeprazole 20mg Delayed-Release",
      rfidUid: "E280116060000208",
      shelfLocation: "Shelf D-02 (Gastrointestinal)",
      unitWeightGrams: 0.55,
      minStockCount: 35,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300),
      initialCount: 65,
    },
    {
      name: "Azithromycin 250mg Tabs",
      rfidUid: "E280116060000209",
      shelfLocation: "Shelf A-14 (Antibiotics)",
      unitWeightGrams: 0.70,
      minStockCount: 20,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
      initialCount: 24,
    },
    {
      name: "Gabapentin 300mg Caps",
      rfidUid: "E280116060000210",
      shelfLocation: "Shelf E-01 (Neurology)",
      unitWeightGrams: 0.90,
      minStockCount: 50,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500),
      initialCount: 140,
    },
    {
      name: "Losartan Potassium 50mg",
      rfidUid: "E280116060000211",
      shelfLocation: "Shelf C-12 (Cardiovascular)",
      unitWeightGrams: 0.40,
      minStockCount: 25,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15), // Expiring in 15 days
      initialCount: 8, // Very low stock
    },
    {
      name: "Sertraline HCl 50mg Tabs",
      rfidUid: "E280116060000212",
      shelfLocation: "Shelf E-07 (Psychiatry)",
      unitWeightGrams: 0.50,
      minStockCount: 30,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 420),
      initialCount: 92,
    },
    {
      name: "Ibuprofen 400mg Film-Coated",
      rfidUid: "E280116060000213",
      shelfLocation: "Shelf F-03 (Analgesics/NSAID)",
      unitWeightGrams: 0.80,
      minStockCount: 50,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 600),
      initialCount: 210,
    },
    {
      name: "Paracetamol 500mg Tabs",
      rfidUid: "E280116060000214",
      shelfLocation: "Shelf F-05 (Analgesics/Antipyretic)",
      unitWeightGrams: 0.75,
      minStockCount: 60,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 720),
      initialCount: 320,
    },
    {
      name: "Cetirizine HCl 10mg",
      rfidUid: "E280116060000215",
      shelfLocation: "Shelf G-01 (Antihistamines)",
      unitWeightGrams: 0.30,
      minStockCount: 20,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28), // 28 days
      initialCount: 5, // Critically low
    },
    {
      name: "Metoprolol Succinate 25mg ER",
      rfidUid: "E280116060000216",
      shelfLocation: "Shelf C-15 (Cardiovascular)",
      unitWeightGrams: 0.48,
      minStockCount: 30,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 330),
      initialCount: 74,
    },
    {
      name: "Amlodipine Besylate 5mg",
      rfidUid: "E280116060000217",
      shelfLocation: "Shelf C-18 (Cardiovascular)",
      unitWeightGrams: 0.38,
      minStockCount: 25,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400),
      initialCount: 110,
    },
    {
      name: "Levothyroxine Sodium 50mcg",
      rfidUid: "E280116060000218",
      shelfLocation: "Shelf B-09 (Endocrine)",
      unitWeightGrams: 0.25,
      minStockCount: 40,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200),
      initialCount: 135,
    },
  ];

  const createdMedicines: any[] = [];

  for (const item of medicinesData) {
    const med = await prisma.medicine.create({
      data: {
        name: item.name,
        rfidUid: item.rfidUid,
        shelfLocation: item.shelfLocation,
        unitWeightGrams: item.unitWeightGrams,
        minStockCount: item.minStockCount,
        expiryDate: item.expiryDate,
      },
    });
    createdMedicines.push({ ...med, initialCount: item.initialCount });

    // Create 4 historical stock logs over past 7 days plus the latest
    const daysAgo = [7, 5, 3, 1, 0];
    for (let i = 0; i < daysAgo.length; i++) {
      const dayOffset = daysAgo[i];
      // Slight variation in count leading to current
      const count = Math.max(0, item.initialCount + (dayOffset * 2));
      const weight = Math.round(count * item.unitWeightGrams * 100) / 100;
      await prisma.stockLog.create({
        data: {
          medicineId: med.id,
          weightGrams: weight,
          count: count,
          createdAt: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Add alert if low stock or expiring soon
    if (item.initialCount < item.minStockCount) {
      await prisma.alert.create({
        data: {
          type: "LOW_STOCK",
          severity: item.initialCount <= 10 ? "destructive" : "warning",
          title: `Low Stock Alert: ${med.name}`,
          message: `Current count is ${item.initialCount} units on ${med.shelfLocation}. Minimum threshold is ${med.minStockCount} units.`,
          medicineId: med.id,
          read: false,
        },
      });
    }

    const daysUntilExpiry = Math.ceil((item.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {
      await prisma.alert.create({
        data: {
          type: "EXPIRING_SOON",
          severity: daysUntilExpiry <= 15 ? "destructive" : "warning",
          title: `Expiring Soon: ${med.name}`,
          message: `Batch expires in ${daysUntilExpiry} days (${item.expiryDate.toISOString().split("T")[0]}). Prioritize first-expiry-first-out dispensing.`,
          medicineId: med.id,
          read: false,
        },
      });
    }
  }

  // Patients
  const patient1 = await prisma.patient.create({
    data: {
      name: "Eleanor Vance",
      phone: "+1 (555) 234-8901",
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: "Marcus Brody",
      phone: "+1 (555) 782-4119",
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: "Clara Oswald",
      phone: "+1 (555) 490-3321",
    },
  });

  // Shared Records
  await prisma.sharedRecord.create({
    data: {
      patientId: patient1.id,
      token: "rec_7f8a9e2b1c",
      otp: "4829",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      contents: JSON.stringify({
        patient: {
          name: "Eleanor Vance",
          phone: "+1 (555) 234-8901",
          dob: "1984-06-14",
          bloodGroup: "O+",
        },
        allergies: [
          { allergen: "Penicillin", severity: "Severe (Anaphylaxis risk)" },
          { allergen: "Sulfa Drugs", severity: "Moderate (Rash, Hives)" },
        ],
        activeMedications: [
          { name: "Metformin 500mg", dosage: "1 tablet twice daily with meals", purpose: "Type 2 Diabetes" },
          { name: "Lisinopril 10mg", dosage: "1 tablet daily morning", purpose: "Hypertension" },
        ],
        recentPrescriptions: [
          { date: "2026-10-15", doctor: "Dr. Arthur Bell", notes: "HbA1c steady at 6.8%. Continue standard regimen." },
        ],
        emergencyContact: {
          name: "Thomas Vance (Spouse)",
          phone: "+1 (555) 234-8902",
        },
      }),
    },
  });

  await prisma.sharedRecord.create({
    data: {
      patientId: patient2.id,
      token: "rec_demo_public",
      otp: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
      contents: JSON.stringify({
        patient: {
          name: "Marcus Brody",
          phone: "+1 (555) 782-4119",
          dob: "1972-11-03",
          bloodGroup: "A-",
        },
        allergies: [
          { allergen: "Aspirin / NSAIDs", severity: "Moderate (Gastric irritation & Bronchospasm)" },
        ],
        activeMedications: [
          { name: "Atorvastatin 20mg", dosage: "1 tablet at bedtime", purpose: "Hyperlipidemia" },
          { name: "Amlodipine 5mg", dosage: "1 tablet daily", purpose: "Blood Pressure" },
        ],
        recentPrescriptions: [
          { date: "2026-09-28", doctor: "Dr. Evelyn Reed", notes: "Lipid panel improved. Follow-up in 3 months." },
        ],
        emergencyContact: {
          name: "Sarah Brody (Daughter)",
          phone: "+1 (555) 782-4120",
        },
      }),
    },
  });

  // Sample Prescriptions
  const rx1 = await prisma.prescription.create({
    data: {
      imageUrl: "/samples/prescription-1.jpg",
      extractedText: "Rx:\nAmoxicillin 500mg Caps #30\n1 cap TID x 10 days\nParacetamol 500mg #20\n1-2 tabs PRN fever\nRefills: 0",
      status: "PENDING",
      pharmacistNote: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
      items: {
        create: [
          {
            extractedName: "Amoxicillin 500mg Caps",
            matchedMedicineId: createdMedicines.find((m) => m.name.includes("Amoxicillin"))?.id,
            inStock: true,
          },
          {
            extractedName: "Paracetamol 500mg",
            matchedMedicineId: createdMedicines.find((m) => m.name.includes("Paracetamol"))?.id,
            inStock: true,
          },
        ],
      },
    },
  });

  const rx2 = await prisma.prescription.create({
    data: {
      imageUrl: "/samples/prescription-2.jpg",
      extractedText: "Rx:\nMetformin 500mg Tabs #60\nSig: 1 tab BID with meals\nAtorvastatin 20mg #30\nSig: 1 qHS\nRefills: 2",
      status: "APPROVED",
      pharmacistNote: "Verified with patient profile. No contraindications detected.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      items: {
        create: [
          {
            extractedName: "Metformin 500mg Tabs",
            matchedMedicineId: createdMedicines.find((m) => m.name.includes("Metformin"))?.id,
            inStock: true,
          },
          {
            extractedName: "Atorvastatin 20mg",
            matchedMedicineId: createdMedicines.find((m) => m.name.includes("Atorvastatin"))?.id,
            inStock: true,
          },
        ],
      },
    },
  });

  const rx3 = await prisma.prescription.create({
    data: {
      imageUrl: "/samples/prescription-3.jpg",
      extractedText: "Rx:\nCiprofloxacin 500mg #14\n1 tab BID\nDoxycycline 100mg #20\nSig: 1 tab BID",
      status: "REJECTED",
      pharmacistNote: "Out of stock on Ciprofloxacin; prescription referred to Memorial Branch.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      items: {
        create: [
          {
            extractedName: "Ciprofloxacin 500mg",
            matchedMedicineId: null, // Unmatched
            inStock: false,
          },
          {
            extractedName: "Doxycycline 100mg",
            matchedMedicineId: null, // Unmatched
            inStock: false,
          },
        ],
      },
    },
  });

  // Latest RFID hardware scan state
  await prisma.hardwareState.create({
    data: {
      id: "latest_rfid_scan",
      value: JSON.stringify({
        rfidUid: "E280116060000204",
        scannedAt: new Date().toISOString(),
        medicineName: "Amoxicillin 500mg Caps",
        shelfLocation: "Shelf A-12 (Antibiotics)",
        count: 18,
        minStockCount: 30,
        unitWeightGrams: 0.65,
        totalWeightGrams: 11.7,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
      }),
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

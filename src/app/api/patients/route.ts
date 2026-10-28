import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { name: "asc" },
      include: {
        sharedRecords: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    return NextResponse.json({ success: true, patients });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch patients", details: String(error) },
      { status: 500 }
    );
  }
}


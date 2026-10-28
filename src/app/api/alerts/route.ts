import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.alert.count({
      where: { read: false },
    });

    return NextResponse.json({
      success: true,
      alerts,
      unreadCount,
    });
  } catch (error) {
    console.error("Alerts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { alertId } = body;

    if (alertId) {
      await prisma.alert.update({
        where: { id: alertId },
        data: { read: true },
      });
    } else {
      // Mark all as read
      await prisma.alert.updateMany({
        where: { read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true, message: "Alerts marked as read" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update alerts", details: String(error) },
      { status: 500 }
    );
  }
}


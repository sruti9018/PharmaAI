import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ─── helpers ──────────────────────────────────────────────── */
function today() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntil(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/* ─── intent detection ─────────────────────────────────────── */
type Intent =
  | "greeting"
  | "stock_overview"
  | "low_stock"
  | "expiring"
  | "prescriptions"
  | "prescription_pending"
  | "alerts"
  | "medicine_search"
  | "inventory_report"
  | "dispensing_trends"
  | "help"
  | "unknown";

function detectIntent(msg: string): { intent: Intent; keyword?: string } {
  const q = msg.toLowerCase();

  if (/^(hi|hello|hey|good\s*(morning|evening|afternoon)|namaste|sup|yo)/.test(q))
    return { intent: "greeting" };

  if (/\b(help|what can you|what do you|features|commands|capabilities)\b/.test(q))
    return { intent: "help" };

  if (/\b(trend|dispensing|consum|usage|rate|over time|7.?day|week|history)\b/.test(q))
    return { intent: "dispensing_trends" };

  if (/\b(report|summary|overview|dashboard|stat|total|all medicine|everything)\b/.test(q))
    return { intent: "inventory_report" };

  if (/\b(low.?stock|out.?of.?stock|below.?min|restock|shortage|running low|depleted)\b/.test(q))
    return { intent: "low_stock" };

  if (/\b(expir|expire|expiry|fefo|batch|shelf.?life|date)\b/.test(q))
    return { intent: "expiring" };

  if (/\b(pending|approve|reject|ocr|queue|review|verify|verification)\b/.test(q))
    return { intent: "prescription_pending" };

  if (/\b(prescription|rx|script|doctor|patient|drug|medication)\b/.test(q))
    return { intent: "prescriptions" };

  if (/\b(alert|hardware|rfid|rc522|hx711|load.?cell|cam|esp32|sensor|telemetry|alarm)\b/.test(q))
    return { intent: "alerts" };

  if (/\b(stock|inventory|shelf|count|unit|quantity)\b/.test(q))
    return { intent: "stock_overview" };

  // Try to extract a medicine name for search
  const medicineKeywords = q.replace(/[^a-z0-9 ]/g, "").trim();
  if (medicineKeywords.length > 2)
    return { intent: "medicine_search", keyword: medicineKeywords };

  return { intent: "unknown" };
}

/* ─── response builders ────────────────────────────────────── */
async function handleGreeting() {
  const [meds, pending, unread] = await Promise.all([
    prisma.medicine.count(),
    prisma.prescription.count({ where: { status: "PENDING" } }),
    prisma.alert.count({ where: { read: false } }),
  ]);

  const lowStock = await prisma.medicine.findMany({
    include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const lowCount = lowStock.filter((m) => {
    const c = m.stockLogs[0]?.count ?? 0;
    return c < m.minStockCount;
  }).length;

  return `👋 Hello! I'm **PharmaLink AI**, your real-time smart pharmacy assistant.

Here's your current dashboard snapshot as of **${today()}**:
• 💊 **${meds} medicines** registered across 7 shelf aisles
• ⚠️ **${lowCount} low-stock alerts** need restocking
• 📋 **${pending} prescription(s)** pending pharmacist verification
• 🔔 **${unread} unread hardware alerts**

How can I help you today? You can ask me about stock levels, expiring medicines, prescriptions, alerts, or dispensing trends.`;
}

async function handleStockOverview() {
  const medicines = await prisma.medicine.findMany({
    include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  const rows = medicines.map((m) => {
    const count = m.stockLogs[0]?.count ?? 0;
    const status = count === 0 ? "❌ Out" : count < m.minStockCount ? "⚠️ Low" : "✅ OK";
    return `  • ${m.name} — **${count} units** (min: ${m.minStockCount}) [${status}] @ ${m.shelfLocation}`;
  });

  const total = medicines.reduce((s, m) => s + (m.stockLogs[0]?.count ?? 0), 0);
  const inStock = medicines.filter((m) => (m.stockLogs[0]?.count ?? 0) >= m.minStockCount).length;
  const low = medicines.length - inStock;

  return `📦 **Full Inventory Status** — ${today()}

${rows.join("\n")}

**Summary:** ${total} total units across ${medicines.length} medicines
✅ Sufficient: ${inStock} · ⚠️ Low/Out: ${low}`;
}

async function handleLowStock() {
  const medicines = await prisma.medicine.findMany({
    include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const lowItems = medicines
    .map((m) => ({ ...m, count: m.stockLogs[0]?.count ?? 0 }))
    .filter((m) => m.count < m.minStockCount)
    .sort((a, b) => a.count - b.count);

  if (lowItems.length === 0)
    return "✅ Great news! All medicines are currently above their minimum stock thresholds. No restocking required at this time.";

  const rows = lowItems.map((m) => {
    const urgency = m.count === 0 ? "🚨 OUT" : m.count <= 5 ? "🔴 Critical" : "🟡 Low";
    return `  • **${m.name}** — ${m.count}/${m.minStockCount} units [${urgency}] @ ${m.shelfLocation}`;
  });

  return `⚠️ **Low Stock Alert** — ${lowItems.length} medicine(s) need restocking:

${rows.join("\n")}

💡 Recommendation: Initiate a purchase order for the above items. Critical items (🚨🔴) should be escalated immediately to avoid dispensing failures.`;
}

async function handleExpiring() {
  const medicines = await prisma.medicine.findMany({
    orderBy: { expiryDate: "asc" },
  });

  const expiring90 = medicines.filter((m) => daysUntil(m.expiryDate) <= 90).sort(
    (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime()
  );

  if (expiring90.length === 0)
    return "✅ No medicines expiring within the next 90 days. All batches have ample shelf life remaining.";

  const critical = expiring90.filter((m) => daysUntil(m.expiryDate) <= 30);
  const soon = expiring90.filter((m) => daysUntil(m.expiryDate) > 30 && daysUntil(m.expiryDate) <= 90);

  const fmt90 = (items: typeof expiring90, tag: string) =>
    items.map((m) => `  • ${tag} **${m.name}** — expires ${fmt(m.expiryDate)} (${daysUntil(m.expiryDate)} days) @ ${m.shelfLocation}`).join("\n");

  return `📅 **Expiry Overview** — FEFO dispensing applies

${critical.length > 0 ? `**Critical (≤30 days):**\n${fmt90(critical, "🔴")}` : ""}
${soon.length > 0 ? `\n**Expiring soon (31–90 days):**\n${fmt90(soon, "🟡")}` : ""}

💡 Ensure FEFO (First-Expiry-First-Out) protocol is followed. Medicines expiring within 30 days should be prioritised for dispensing or returned to supplier.`;
}

async function handlePrescriptionsPending() {
  const prescriptions = await prisma.prescription.findMany({
    where: { status: "PENDING" },
    include: { items: { include: { matchedMedicine: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (prescriptions.length === 0)
    return "✅ The prescription queue is clear. No prescriptions are currently awaiting pharmacist verification.";

  const rows = prescriptions.map((rx, i) => {
    const drugs = rx.items.map((it) => it.extractedName).join(", ");
    const allInStock = rx.items.every((it) => it.inStock);
    const stockStatus = allInStock ? "✅ All In Stock" : "⚠️ Stock Issue";
    const rxId = rx.id.slice(-8).toUpperCase();
    const age = Math.round((Date.now() - new Date(rx.createdAt).getTime()) / 60000);
    return `  ${i + 1}. **#${rxId}** — ${drugs}\n     Status: ${stockStatus} | Received: ${age} min ago`;
  });

  return `📋 **Pending Prescriptions** — ${prescriptions.length} awaiting review

${rows.join("\n")}

💡 Visit the **Prescriptions** page to approve or reject. All pharmacist actions are logged for audit.`;
}

async function handlePrescriptions() {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.prescription.count(),
    prisma.prescription.count({ where: { status: "PENDING" } }),
    prisma.prescription.count({ where: { status: "APPROVED" } }),
    prisma.prescription.count({ where: { status: "REJECTED" } }),
  ]);

  const recent = await prisma.prescription.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { items: true },
  });

  const recentRows = recent.map((rx) => {
    const rxId = rx.id.slice(-8).toUpperCase();
    const drugs = rx.items.map((it) => it.extractedName).join(", ") || "No items";
    return `  • **#${rxId}** [${rx.status}] — ${drugs}`;
  });

  return `📋 **Prescription Queue Summary** — ${today()}

Total processed: **${total}**
• ⏳ Pending: **${pending}**
• ✅ Approved: **${approved}**
• ❌ Rejected: **${rejected}**

**Recent prescriptions:**
${recentRows.join("\n")}

All prescriptions are captured via **ESP32-CAM** and processed with **Tesseract.js OCR**.`;
}

async function handleAlerts() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const unread = alerts.filter((a) => !a.read);

  if (alerts.length === 0)
    return "✅ No hardware or clinical alerts recorded. All ESP32 sensors are operating within normal parameters.";

  const severityIcon: Record<string, string> = { destructive: "🔴", warning: "🟡", info: "🔵" };
  const rows = alerts.slice(0, 5).map((a) => {
    const icon = severityIcon[a.severity] ?? "⚪";
    const time = new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return `  ${icon} **${a.title}** (${time})\n     ${a.message}`;
  });

  return `🔔 **Hardware & Clinical Alerts** — ${unread.length} unread

${rows.join("\n")}

Sensors monitored: **HX711 Load Cell**, **RC522 RFID Reader**, **ESP32-CAM OCR**
Visit the **Alerts** page for full history and to mark as read.`;
}

async function handleInventoryReport() {
  const [medicines, pending, alerts] = await Promise.all([
    prisma.medicine.findMany({
      include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.prescription.count({ where: { status: "PENDING" } }),
    prisma.alert.count({ where: { read: false } }),
  ]);

  const total = medicines.reduce((s, m) => s + (m.stockLogs[0]?.count ?? 0), 0);
  const low = medicines.filter((m) => (m.stockLogs[0]?.count ?? 0) < m.minStockCount);
  const expiring30 = medicines.filter((m) => daysUntil(m.expiryDate) <= 30);
  const expiring90 = medicines.filter((m) => daysUntil(m.expiryDate) <= 90);
  const inStock = medicines.length - low.length;

  const lowNames = low.slice(0, 3).map((m) => m.name).join(", ");
  const expiringNames = expiring30.slice(0, 3).map((m) => `${m.name} (${daysUntil(m.expiryDate)}d)`).join(", ");

  return `📊 **Full Inventory Report** — ${today()}

**Medicines**
• Total registered: ${medicines.length} across 7 shelf aisles
• Total units on shelf: ${total}
• ✅ Sufficient stock: ${inStock}
• ⚠️ Low / Out: ${low.length}${low.length > 0 ? ` → ${lowNames}` : ""}

**Expiry**
• Expiring ≤30 days: ${expiring30.length}${expiring30.length > 0 ? ` → ${expiringNames}` : ""}
• Expiring ≤90 days: ${expiring90.length}
• FEFO protocol: ${expiring30.length > 0 ? "⚠️ Active priority required" : "✅ No urgent action needed"}

**Prescriptions**
• Pending pharmacist review: ${pending}

**Alerts**
• Unread hardware/clinical alerts: ${alerts}

Stock Health Index: **${inStock > 0 ? Math.round((inStock / medicines.length) * 100) : 0}%** optimal`;
}

async function handleDispensingTrends() {
  const medicines = await prisma.medicine.findMany({
    include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 7 } },
    orderBy: { name: "asc" },
  });

  // Aggregate daily totals
  const dayMap: Record<string, number> = {};
  medicines.forEach((m) => {
    m.stockLogs.forEach((l) => {
      const d = l.createdAt.toISOString().split("T")[0];
      dayMap[d] = (dayMap[d] ?? 0) + l.count;
    });
  });

  const days = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  const trendRows = days.map(([d, c]) => `  • ${d}: **${c} units**`).join("\n");

  // Most dispensed (highest count drop)
  const topMeds = medicines
    .map((m) => {
      const logs = m.stockLogs;
      if (logs.length < 2) return null;
      const drop = logs[logs.length - 1].count - logs[0].count;
      return { name: m.name, drop: Math.abs(drop) };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.drop ?? 0) - (a?.drop ?? 0))
    .slice(0, 3);

  const topRows = topMeds.length > 0
    ? topMeds.map((m, i) => `  ${i + 1}. ${m?.name} (${m?.drop} units dispensed)`).join("\n")
    : "  Insufficient data for trend analysis yet.";

  const first = days[0]?.[1] ?? 0;
  const last = days[days.length - 1]?.[1] ?? 0;
  const trend = last > first ? "📈 increasing" : last < first ? "📉 decreasing" : "➡️ stable";

  return `📈 **Dispensing & Stock Trends** (Last 7 days)

**Daily stock counts:**
${trendRows || "  No log data available yet."}

**Trend:** Stock is ${trend} overall
**Top dispensed medicines:**
${topRows}

Data sourced from ESP32 HX711 load cell weight logs. Each reading represents a real-time shelf scan.`;
}

async function handleMedicineSearch(keyword: string) {
  const medicines = await prisma.medicine.findMany({
    where: {
      OR: [
        { name: { contains: keyword } },
        { shelfLocation: { contains: keyword } },
      ],
    },
    include: { stockLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 5,
  });

  if (medicines.length === 0)
    return `🔍 No medicines found matching **"${keyword}"**. Try searching by drug name, shelf code (e.g. "B-09"), or category keyword like "antibiotic" or "cardiovascular".`;

  const rows = medicines.map((m) => {
    const count = m.stockLogs[0]?.count ?? 0;
    const status = count === 0 ? "❌ Out of Stock" : count < m.minStockCount ? "⚠️ Low Stock" : "✅ In Stock";
    const days = daysUntil(m.expiryDate);
    return `  • **${m.name}**\n    Shelf: ${m.shelfLocation} | Stock: ${count} units | ${status}\n    Expiry: ${fmt(m.expiryDate)} (${days} days) | Unit wt: ${m.unitWeightGrams}g`;
  });

  return `🔍 **Search Results for "${keyword}"** — ${medicines.length} match(es)

${rows.join("\n\n")}`;
}

function handleHelp() {
  return `🤖 **PharmaLink AI — What I can do:**

**Inventory & Stock**
• "Show me all stock levels"
• "Which medicines are low stock?"
• "Check Amoxicillin stock"

**Expiry & FEFO**
• "What medicines are expiring soon?"
• "Show expiry dates"

**Prescriptions**
• "How many prescriptions are pending?"
• "Show prescription queue"

**Alerts**
• "Show hardware alerts"
• "Are there any ESP32 errors?"

**Reports & Trends**
• "Give me a full inventory report"
• "Show dispensing trends this week"
• "Dashboard summary"

Just type your question naturally — I'll understand! 😊`;
}

/* ─── main route ───────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    if (!lastUserMsg.trim()) {
      return NextResponse.json({ reply: "Please send a message so I can help you!" });
    }

    const { intent, keyword } = detectIntent(lastUserMsg);

    let reply: string;

    switch (intent) {
      case "greeting":          reply = await handleGreeting(); break;
      case "low_stock":         reply = await handleLowStock(); break;
      case "expiring":          reply = await handleExpiring(); break;
      case "prescription_pending": reply = await handlePrescriptionsPending(); break;
      case "prescriptions":     reply = await handlePrescriptions(); break;
      case "alerts":            reply = await handleAlerts(); break;
      case "stock_overview":    reply = await handleStockOverview(); break;
      case "inventory_report":  reply = await handleInventoryReport(); break;
      case "dispensing_trends": reply = await handleDispensingTrends(); break;
      case "medicine_search":   reply = await handleMedicineSearch(keyword ?? lastUserMsg); break;
      case "help":              reply = handleHelp(); break;
      default:
        // Try a medicine search as fallback
        reply = await handleMedicineSearch(lastUserMsg.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim());
        if (reply.startsWith("🔍 No medicines found")) {
          reply = `I didn't quite understand that. Here are some things you can ask me:\n\n${handleHelp().split("\n").slice(0, 10).join("\n")}\n\nOr type **"help"** for the full list.`;
        }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Agent API error:", err);
    return NextResponse.json({ reply: "⚠️ Something went wrong fetching pharmacy data. Please try again." }, { status: 500 });
  }
}


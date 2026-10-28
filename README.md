# PharmaLink AI 🏥⚡

> **Smart Pharmacy Assistance Dashboard**  
> Interfacing with ESP32 Hardware (HX711 Load Cell, RC522 RFID Reader, and ESP32-CAM) to provide real-time weight-based inventory tracking, rapid shelf-location lookup, OCR prescription assistance, and encrypted medical records sharing.

---

> [!WARNING]
> **Clinical & Medical Correctness Disclaimer**  
> **PharmaLink AI is an assistive inventory and workflow telemetry system.**  
> It performs automated medication name matching against pharmacy inventory and calculates stock via unit weight.  
> **This system DOES NOT diagnose, verify pharmacological safety, check drug-drug interactions, or validate clinical dosage correctness.** All prescription approvals, dispensations, and inventory adjustments require professional verification and sign-off by a licensed pharmacist.

---

## 🚀 Quick Start

To set up and run PharmaLink AI locally:

```bash
# 1. Install dependencies
pnpm install

# 2. Push database schema and seed initial data (15 medicines, prescriptions, logs, alerts)
npx prisma db push
pnpm run db:seed

# 3. Launch the development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 with custom clinical medical palette (`#FAFAFA` white background, teal primary `#0d9488`, glowing glassmorphism cards)
- **UI Library:** **Coss UI** exclusively (built on Base UI, zero Radix/shadcn dependencies)
- **AI Agent:** In-app Conversational Pharmacy Intelligence Agent (`/agent`) with live SQL database query synthesis
- **Database:** SQLite via Prisma ORM 6
- **Validation:** Zod schemas
- **OCR Engine:** Tesseract.js (handwritten & printed prescription text extraction)
- **Data Visualization:** Recharts (styled area and bar charts)
- **Sharing:** QR code generator (`qrcode`) + OTP Field decryption gating

---

## 📦 Coss UI Components Used

PharmaLink AI strictly adheres to **Coss UI** (`@base-ui/react` primitives):

| Category | Coss Components Implemented |
|---|---|
| **App Shell & Nav** | `Menu`, `MenuGroupLabel`, `MenuItem`, `MenuSeparator`, `Avatar`, `Breadcrumb`, `Separator`, `Tooltip`, `ScrollArea`, `Toolbar`, `Drawer` (mobile) |
| **Command Palette** | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandGroupLabel`, `CommandItem`, `CommandEmpty`, `Kbd` (⌘K) |
| **Dashboard** | `Card`, `Frame`, `Meter`, `MeterTrack`, `MeterIndicator`, `MeterValue`, `Alert`, `Skeleton`, `Badge` |
| **AI Agent** | `Bot`, `Layers`, `SlidersHorizontal`, Suggestion chips, native conversational query pipeline |
| **Inventory** | `Table`, `Meter`, `Progress`, `Badge`, `Toolbar`, `InputGroup`, `Select`, `ToggleGroup`, `Pagination`, `Menu`, `ContextMenu`, `Dialog`, `Form`, `Field`, `Fieldset`, `Input`, `NumberField`, `Popover`, `Calendar`, `AlertDialog`, `Empty` |
| **Prescriptions** | `Tabs`, `TabsList`, `TabsTab`, `TabsPanel`, `Table`, `PreviewCard`, `Textarea`, `AlertDialog`, `Alert` |
| **RFID Lookup** | `Card`, `Spinner`, `Meter`, `Autocomplete`, `AutocompleteInput`, `AutocompletePopup`, `AutocompleteList`, `AutocompleteItem`, `Badge` |
| **Medical Share** | `Field`, `Fieldset`, `CheckboxGroup`, `Checkbox`, `RadioGroup`, `Radio`, `SegmentedControl`, `Switch`, `OTPField`, `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionPanel` |
| **Alerts** | `Alert`, `SegmentedControl`, `Switch`, `Slider`, `Toast` (`toastManager`), `Tooltip` |

---

## 📡 ESP32 Hardware API Endpoints

All ESP32 hardware devices authenticate via the `x-api-key` header:

```http
x-api-key: pharmalink_esp32_secret_key_2026
```

### 1. Load Cell Stock Weight Telemetry
- **Endpoint:** `POST /api/stock`
- **Payload:**
  ```json
  {
    "rfidUid": "E280116060000204",
    "weightGrams": 11.7
  }
  ```
- **Logic:** `count = round(weightGrams / unitWeightGrams)`. Records a new `StockLog`. If `count < minStockCount`, automatically emits a real-time `LOW_STOCK` alert and toast.

### 2. RFID Tag Scanner
- **Endpoint:** `POST /api/rfid-scan`
- **Payload:**
  ```json
  {
    "rfidUid": "E280116060000204"
  }
  ```
- **Response:** Returns medication metadata, aisle/shelf bin location, unit weight, current stock, and flags it as the latest live scan on `/rfid-lookup`.

### 3. ESP32-CAM Prescription Upload & OCR
- **Endpoint:** `POST /api/prescription`
- **Payload:** `multipart/form-data` with `image` file
- **Logic:** Saves image to `/public/uploads/`, runs Tesseract.js OCR, parses drug names, performs fuzzy matching against active medicine database, and enqueues prescription as `PENDING`.

---

## 💻 Arduino / ESP32 C++ Code Example

Below is a complete Arduino C++ example for an ESP32 equipped with an HX711 load cell and RC522 RFID reader communicating with PharmaLink AI over Wi-Fi:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Wi-Fi Configuration
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// PharmaLink AI Server
const char* serverUrl = "http://192.168.1.50:3000/api/stock";
const char* apiKey    = "pharmalink_esp32_secret_key_2026";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected! IP address: ");
  Serial.println(WiFi.localIP());
}

// Function to send load cell telemetry to PharmaLink AI
void sendStockTelemetry(const char* rfidUid, float weightGrams) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);

    // Headers
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);

    // Build JSON payload
    StaticJsonDocument<200> doc;
    doc["rfidUid"] = rfidUid;
    doc["weightGrams"] = weightGrams;

    String requestBody;
    serializeJson(doc, requestBody);

    // Send HTTP POST
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("HTTP Code: %d\n", httpResponseCode);
      Serial.println("Response: " + response);
    } else {
      Serial.printf("Error occurred: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  } else {
    Serial.println("Wi-Fi Disconnected!");
  }
}

void loop() {
  // Simulate reading an RFID tag on shelf with weight from HX711
  // In production, read from MFRC522 and HX711 scale.get_units(5)
  const char* demoRfid = "E280116060000204"; // Amoxicillin 500mg
  float measuredWeight = 11.7; // grams (calculated count ~23 pills)

  Serial.println("Broadcasting load cell measurement to PharmaLink AI...");
  sendStockTelemetry(demoRfid, measuredWeight);

  // Poll or delay before next reading
  delay(15000);
}
```

---

## 🧪 Built-in Hardware Simulator

You don't need physical ESP32 boards to evaluate PharmaLink AI! The application includes simulated hardware generators:

1. Navigate to **Settings** (`/settings`).
2. Use the **Simulate Hardware** controls:
   - **Simulate Load Cell Weight Drop:** Sends a low weight for Amoxicillin, triggering a real-time `LOW_STOCK` alert and toast.
   - **Simulate RFID Tag Scan:** Simulates tapping an RFID badge, automatically switching the **RFID Lookup** live card.
   - **Simulate Camera Prescription OCR:** Ingests a new sample prescription, extracts medication names via OCR, and enqueues it for pharmacist review.

Alternatively, simulate via HTTP:
```bash
curl -X POST http://localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"stock\"}"
```

---

## 🗄 Database Models

SQLite database (`prisma/schema.prisma`):
- `Medicine`: Medication title, RFID UID, shelf location (`Shelf A-01`), unit weight (grams), min stock count, expiry date.
- `StockLog`: Historical weight readings, calculated count, timestamp.
- `Prescription`: Uploaded image URL, extracted OCR text, status (`PENDING` | `APPROVED` | `REJECTED`), pharmacist note.
- `PrescriptionItem`: Extracted drug name, fuzzy-matched medicine ID, in-stock status.
- `Patient`: Patient profile, phone number.
- `SharedRecord`: Shared clinical payload (JSON), access token, expiration, OTP verification pin.
- `Alert`: Severity (`info`, `warning`, `destructive`), title, message, read state.
- `HardwareState`: Latest RFID tag scanned, weight, connection status.

---

## 📄 License
MIT. PharmaLink AI is built for clinical workflow acceleration and pharmacy inventory automation.

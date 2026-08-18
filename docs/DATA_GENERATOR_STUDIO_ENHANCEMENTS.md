# Mock Payload & Dataset Studio — Feature Specification & Phase Plan

## Document Information

| Field | Value |
|---|---|
| **Module** | Fake Data & Mock Dataset Studio (`src/modules/fake-data`) |
| **Status** | Approved — Ready for Implementation |
| **Target Release** | Version 1.1 |
| **Dependencies** | Swagger UI DOM Adapter, Request Manager, Storage Manager, UI Components |

---

## 1. Executive Summary

The current **Data** panel only operates reactively when a request is already open in Swagger and contains limited basic field types. 

This enhancement transforms the module into a comprehensive **Mock Payload & Dataset Studio** that gives developers, QA engineers, and testers the ability to:
1. Generate **realistic**, **minimal-required**, **boundary edge-case**, and **security fuzzing** payloads for **ANY** API endpoint without needing it open first.
2. Generate **bulk test datasets** (1–100 rows) in **JSON Array** or **CSV** formats for database seeding or load testing.
3. Access **50+ rich data generators** across Tech, Finance, Commerce, Content, and Security categories.
4. Seamlessly **Inject into Swagger**, **Save as Request Preset**, or **Copy / Export** with 1 click.

---

## 2. Feature Architecture & User Flow

```mermaid
graph TD
  A[Data Panel / Mock Studio] --> B[Sub-Tab Navigation]
  
  B --> C[⚡ Live Request Auto-Filler]
  B --> D[🛠️ Mock Payload Studio]
  B --> E[📦 Bulk Dataset Seeder]
  B --> F[🎲 Generator Library]
  
  D --> D1[Select Endpoint via EndpointPicker]
  D1 --> D2[Select Generation Mode: Realistic / Minimal / Edge-Case / Fuzzing]
  D2 --> D3[Recursive Schema Generator Engine]
  D3 --> D4[Interactive Monospace JSON Preview]
  D4 --> D5[Actions: Inject to Swagger | Save to Presets | Copy JSON]
  
  E --> E1[Select Schema / Endpoint]
  E1 --> E2[Slider: 1 - 100 Rows]
  E2 --> E3[Format: JSON Array vs CSV]
  E3 --> E4[Preview Table + Download File / Copy]
```

---

## 3. Phase-by-Phase Implementation Plan

### 🚀 Phase 1: Generator Engine Expansion (50+ Data Types & Fuzzing Suites)
* **File**: `src/modules/fake-data/generators.ts` & `detect.ts`
* **Features**:
  * **Tech & Internet**: IPv4, IPv6, MAC Address, User-Agent, Mock JWT, UUID v4, Port, SemVer, Domain, Hex Color.
  * **Finance & Commerce**: Credit Card (Luhn format), Currency code, Price amount, IBAN, Product Name, SKU, Barcode (EAN-13).
  * **Content & Text**: Lorem Ipsum (sentences/paragraphs), Avatar/Image URLs, Slugs, Job Titles, Department names.
  * **QA & Security Fuzzing Payloads**:
    * SQL Injection vectors (`' OR '1'='1`, `UNION SELECT`)
    * XSS vectors (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`)
    * Unicode / Emoji sets (`🚀🔥🎉`, Right-to-Left Arabic/Hebrew, zero-width spaces)
    * Boundary strings (1024-char strings, integer limits `2147483647`, `-2147483648`, `0`, `-1`)
* **Tests**: Unit tests in `generators.test.ts` asserting validity and deterministic seeding support.

---

### 🧠 Phase 2: Schema-Aware Mock Payload Engine & Edge-Case Synthesizer
* **File**: `src/modules/fake-data/schema-generator.ts` (New)
* **Features**:
  * Recursively walks OpenAPI / Swagger JSON schema definitions:
    * Handles primitive types (`string`, `integer`, `number`, `boolean`), `object`, `array`, `enum`, `format`, `minimum`, `maximum`, `pattern`.
  * **4 Generation Modes**:
    1. **Realistic / Complete**: Populates all properties using semantic key detection (`detect.ts`) and realistic fake generators.
    2. **Minimal Required**: Generates only fields marked as `required` in the OpenAPI schema.
    3. **Edge-Case / Boundary**: Fills numbers with boundary values (min/max/0/-1) and strings with max-length constraints.
    4. **Security / Fuzzing**: Injects XSS, SQLi, and Unicode vectors into string fields to test backend validation.
  * **Array Multiplier**: Configurable item count (1, 3, 5, 10 items for arrays).
* **Tests**: Comprehensive unit tests for nested schemas, recursive objects, enums, and required field filtering.

---

### 📦 Phase 3: Bulk Dataset Seeding Engine (JSON & CSV Export)
* **File**: `src/modules/fake-data/bulk-generator.ts` (New)
* **Features**:
  * Generates $N$ instances (1 to 100 rows) of any endpoint payload or schema definition.
  * **JSON Array Generator**: Outputs clean, formatted JSON array `[ { ... }, { ... } ]`.
  * **CSV Formatter**: Flattens nested objects into dot-notated columns (`user.address.city`) and properly escapes quotes and commas.
  * **Export Actions**: 1-click **Copy to Clipboard** and **Download File** (`dataset.json` / `dataset.csv`).
* **Tests**: Unit tests validating CSV escaping, nested flattening, and array generation.

---

### 🎨 Phase 4: Data Studio UI Overhaul (`FakeDataPanel.tsx`)
* **File**: `src/modules/fake-data/FakeDataPanel.tsx`
* **Features**:
  * **Header Tab Bar**:
    * `⚡ Live Request`: Enhanced version of the existing auto-filler with single-field regeneration.
    * `🛠️ Mock Studio`: Searchable `EndpointPicker`, generation mode selector pills, array item counter, syntax-formatted JSON preview, and action buttons.
    * `📦 Bulk Seeder`: Row count slider (1–100), JSON/CSV toggle, preview area, and Download/Copy buttons.
    * `🎲 Generator Catalog`: Quick searchable list of all 50+ generators with instant sample generation and 1-click copy.
  * **1-Click Integration Actions**:
    * **`Inject into Swagger`**: Injects the generated mock payload straight into the active Swagger Try-It-Out body editor.
    * **`Save as Request Preset`**: Saves payload directly to the **Requests** tab as a reusable preset.
    * **`Copy to Clipboard`**: Instant copy with visual feedback.

---

### 🔌 Phase 5: Service, Bridge, RPC Handlers & Verification
* **Files**:
  * `src/modules/fake-data/fake-data-service.ts`
  * `src/modules/fake-data/types.ts`
  * `src/content/index.tsx` & `src/sidepanel/bridge.ts`
  * `src/modules/fake-data/FakeDataPanel.test.tsx`
* **Verification**:
  * Complete unit tests covering all components and generators.
  * `npm run typecheck`, `npm run format:check`, and `npm run build`.

---

## 4. UI Layout & Component Preview

```text
┌─────────────────────────────────────────────────────────────┐
│ DATA GENERATOR STUDIO                                      │
├─────────────────────────────────────────────────────────────┤
│ [ ⚡ Live Request ] [ 🛠️ Mock Studio ] [ 📦 Bulk Seeder ] [ 🎲 Catalog ] │
├─────────────────────────────────────────────────────────────┤
│ Target Endpoint: [ POST /api/v1/users/register          ▼ ] │
│                                                             │
│ Mode: [ ⭐ Realistic ] [ 📌 Required Only ] [ ⚠️ Boundary ] [ 🛡️ Fuzzing ] │
│ Array Items: [ 1 ] [ 3 ] [ 5 ]                             │
├─────────────────────────────────────────────────────────────┤
│ Generated JSON Preview:                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ {                                                       │ │
│ │   "email": "sarah.connor@example.com",                  │ │
│ │   "username": "sconnor99",                              │ │
│ │   "role": "admin",                                      │ │
│ │   "age": 28,                                            │ │
│ │   "tags": ["developer", "security"]                     │ │
│ │ }                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [ ⚡ Inject into Swagger ] [ 💾 Save to Presets ] [ 📋 Copy ] │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Acceptance Criteria

1. ✅ Developer can pick any endpoint in the API and generate valid realistic JSON mock data instantly.
2. ✅ Developer can switch between Realistic, Minimal Required, Boundary, and Fuzzing modes.
3. ✅ Developer can generate 1 to 100 rows in JSON Array or CSV format and copy or download.
4. ✅ Generated payloads can be injected directly into Swagger or saved as a preset with 1 click.
5. ✅ 100% of existing tests pass and full test coverage is added for all new generators and components.

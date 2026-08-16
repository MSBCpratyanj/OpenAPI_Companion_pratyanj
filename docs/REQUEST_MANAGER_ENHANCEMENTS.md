# Request Manager Enhancements & Ideas

## Document Information

| Field | Value |
| --- | --- |
| Feature Area | Request Manager (Presets & Templates) |
| Document Type | Enhancement Proposal & Feature Design |
| Status | Proposed |
| Target Modules | `src/modules/request`, `src/adapters`, `src/sidepanel` |

---

## 1. Executive Summary

The **Request Manager** currently automatically saves and restores drafts per endpoint/environment and allows saving the open request body as a named template.

However, saved templates currently suffer from several usability limitations:
1. **Hidden Details**: The stored request body, headers, query parameters, and metadata are invisible in the sidebar UI (only name and endpoint ID are shown).
2. **Swagger-Only Capture**: Users can only save a template if they have already typed a body into a Swagger operation and kept it open.
3. **No In-Place Editing**: Tweak a field in a saved preset requires deleting and recreating it.
4. **No Direct Creation**: Developers cannot craft a preset directly in the sidebar for any endpoint in the API specification.

This document outlines the design to transform the **Requests Tab** into a comprehensive **API Request Preset & Scenario Manager**.

---

## 2. Core Feature Enhancements

### 2.1 📂 Expandable Request Inspector (View Payloads & Parameters)

Clicking any saved template expands its card to reveal full details:

* **JSON Body Viewer**: Formatted JSON code block with syntax styling and a **Copy JSON** button.
* **Method & Endpoint Badge**: Color-coded HTTP method badge (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with segment-wrapped endpoint path.
* **Headers & Query Parameters**: Structured table/preview of saved headers, query params, and path variables.
* **Metadata**: Shows creation timestamp and last updated time.

---

### 2.2 🛠️ Dual-Mode Request Creation

Users can create templates in two ways:

#### Mode A: "Capture from Swagger" (1-Click)
* Automatically detects the currently active or open Swagger operations.
* Captures the live body, query parameters, and headers directly into a new template with one click.

#### Mode B: "Create Custom Preset" (Direct from Sidebar)
1. **Endpoint Selector**: Searchable dropdown of all endpoints on the Swagger page (using the adapter mirror).
2. **Preset Name**: Custom descriptive name (e.g., `Admin Role Payload`, `Missing Required Field`, `Special Characters Test`).
3. **Body Editor**: JSON textarea pre-formatted with schema starter or fake data generator integration.
4. **Custom Headers & Parameters (Optional)**: Add custom key-value pairs for headers and query parameters.

---

### 2.3 ✏️ In-Place Preset Editor

* Edit preset name, JSON body, or parameters directly inside the Side Panel.
* Built-in JSON validation to prevent saving malformed JSON.
* **Format / Beautify JSON** button in the editor.

---

### 2.4 🎯 Direct Actions per Preset

Each preset card provides quick action buttons:

| Action | Icon | Behavior |
| --- | --- | --- |
| **Apply & Execute** | `▶` (`ReplayIcon`) | Injects payload into Swagger and immediately executes the request |
| **Locate & Fill** | `⌖` (`LocateIcon`) | Scrolls to and expands the endpoint in Swagger, filling the body without executing |
| **Edit Preset** | `✏️` (`EditIcon`) | Opens the inline preset editor |
| **Copy JSON** | `📋` (`CopyIcon`) | Copies the JSON body to clipboard |
| **Delete** | `🗑` (`DeleteIcon`) | Deletes the template with confirmation |

---

### 2.5 🗂️ Preset Grouping & Filtering

* **Filter by Method**: Filter presets by `ALL`, `POST`, `PUT`, `PATCH`, `GET`, `DELETE`.
* **Search Box**: Live search by preset name, path, or payload content.
* **Group by Endpoint**: Optional toggle to group presets under their respective endpoints (e.g., seeing all 4 test scenarios for `POST /users` together).

---

## 3. Data Model & Architecture

### 3.1 Extended Storage Schema

```typescript
export interface RequestRecord {
  endpointId: string
  method: string
  environmentId: string
  body?: string
  query?: Record<string, string>
  path?: Record<string, string>
  headers?: Record<string, string>
  contentType?: string
  updatedAt: number
}

export interface RequestTemplate extends RequestRecord {
  templateId: string
  name: string
  description?: string
  tags?: string[]
}
```

### 3.2 Service Protocol Methods

```typescript
export interface RequestPanelService {
  listTemplates(): Promise<Result<RequestTemplate[]>>
  getTemplate(id: string): Promise<Result<RequestTemplate | null>>
  saveTemplate(template: Omit<RequestTemplate, 'templateId' | 'updatedAt'>): Promise<Result<RequestTemplate>>
  updateTemplate(id: string, patch: Partial<RequestTemplate>): Promise<Result<RequestTemplate>>
  deleteTemplate(id: string): Promise<Result<void>>
  saveOpenAsTemplate(name: string, environmentId: string): Promise<Result<RequestTemplate | null>>
  applyTemplate(templateId: string): Promise<Result<void>>
  locateAndFill(templateId: string): Promise<Result<void>>
  listEndpoints(): EndpointInfo[]
  getOpenRequests(): RequestSnapshot[]
}
```

---

## 4. UI / UX Layout Mockup

```text
┌────────────────────────────────────────────────────────┐
│ Requests & Presets                                     │
├────────────────────────────────────────────────────────┤
│ [ + Create Preset ]  [ ⚡ Capture from Swagger ]        │
│                                                        │
│ [ 🔍 Search presets...               ] [ Method: All ▾]│
├────────────────────────────────────────────────────────┤
│ ▾ Create Team — Admin Payload                          │
│   POST  /teams/                                        │
│                                                        │
│   ┌── Request Body (JSON) ───────────────────────────┐ │
│   │ {                                                │ │
│   │   "name": "Engineering Team",                    │ │
│   │   "plan": "enterprise",                          │ │
│   │   "maxMembers": 50                               │ │
│   │ }                                                │ │
│   └──────────────────────────────────────────────────┘ │
│                                                        │
│   [ ▶ Apply & Execute ]  [ ⌖ Locate ]  [ ✏️ Edit ] [ 🗑 ]│
├────────────────────────────────────────────────────────┤
│ ▸ Create Team — Invalid Name (Error 400)      POST     │
│ ▸ Get Team Details — Default Staging          GET      │
└────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Milestones

1. **Milestone 1 — Inspector & Preview**: Expandable template cards with formatted JSON code viewer, copy-to-clipboard, and metadata.
2. **Milestone 2 — Direct Creation**: Custom preset creation dialog with endpoint selector and JSON payload input.
3. **Milestone 3 — In-Place Editing**: Inline preset editor with JSON format helper.
4. **Milestone 4 — Locate & Pre-fill**: Swagger navigation with body injection without triggering immediate execution.

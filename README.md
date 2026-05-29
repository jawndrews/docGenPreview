# docGenPreview

> LWC Screen Flow component for OmniStudio server-side document generation. Polls a `DocumentGenerationProcess` record, shows a spinner while waiting, then reactively triggers the native Salesforce File Preview component on the same screen.

Built for **Revenue Cloud / OmniStudio** orgs using **OmniDataTransform (DataRaptor)** document templates.

---

## Screenshots

| Loading | Success |
|---|---|
| ![Loading](screenshots/loading-state.png) | ![Success](screenshots/success-state.png) |

| Flow Overview | Component Properties |
|---|---|
| ![Flow](screenshots/flow-overview.png) | ![Properties](screenshots/component-properties.png) |

---

## How It Works

The component fires `FlowAttributeChangeEvent` when generation completes, outputting the `ContentDocumentId`. The native **File Preview** screen component — placed on the same screen — is bound to that variable and reactively renders the PDF when it receives the Id. No second screen, no iframe, no CSP config needed.

---

## Prerequisites

- OmniStudio Document Generation enabled
- A `DocumentTemplate` configured with DataRaptor token mapping
- The Word file uploaded to the template
- A Screen Flow on the relevant record page

---

## Installation

```bash
git clone https://github.com/jawndrews/docGenPreview.git
cd docGenPreview
sf org login web --instance-url https://test.salesforce.com --alias myOrg
sf project deploy start --source-dir force-app --target-org myOrg --test-level NoTestRun
```

**VS Code:** Right-click `force-app` → **SFDX: Deploy Source to Org** (requires Salesforce Extension Pack).

---

## Flow Setup

```
Get Document Template  →  Get Content Document  →  Create DGP  →  Screen
```

### Get Document Template
- Object: `DocumentTemplate` / Filter: `Name` = your template name / First record only

### Get Content Document
- Object: `ContentDocument` / Filter: `Title` = your Word filename (no `.docx`) / Sort: `LastModifiedDate` DESC / First record only

### Create Records — `DocumentGenerationProcess`

Store the output in a variable so the Id is available for the screen.

| Field | Type | Value |
|---|---|---|
| `DataRaptorInput` | Formula | `'{"Id":"' & {!recordId.Id} & '"}'` |
| `DocumentInputType` | Text | `DocumentTemplate` |
| `DocumentTemplateId` | Reference | `{!Get_Document_Template.Id}` |
| `ReferenceObject` | Reference | `{!recordId.Id}` |
| `RequestText` | Formula | `'{"templateContentVersionId": "' & {!Get_Content_Document.LatestPublishedVersionId} & '", "title":"' & {!recordId.Name} & '", "keepIntermediate": false}'` |
| `Status` | Text | `InProgress` |
| `Type` | Text | `GenerateAndConvert` |

Formula fields (`DataRaptorInput`, `RequestText`) require a **Formula resource** (New Resource → Formula → Text) — create these first, then reference in the field value.

> Use **single quotes** for string literals in Flow formulas. The `RequestText` format — including spaces after colons and `"keepIntermediate": false` — is enforced by Salesforce.

### Screen Component

Add a **Screen** element with **two components**:

**1. `docGenPreview`**

| Input | Value |
|---|---|
| Document Generation Process ID | `{!YourDGPVariable.Id}` |
| Card Title | e.g. `Quote Document` |
| Auto-open Preview on Completion | Boolean |
| Hide Download PDF Button | Boolean |
| Show Download Word Button | Boolean |

Create a Text flow variable (e.g. `varContentDocumentId`) and bind the output:

| Output | Variable |
|---|---|
| PDF Content Document ID | `{!varContentDocumentId}` |

**2. Native File Preview component** (from the Flow screen component library)

| Input | Value |
|---|---|
| Content Document ID | `{!varContentDocumentId}` |

When `docGenPreview` finishes polling and fires `FlowAttributeChangeEvent` with the `ContentDocumentId`, the File Preview component reactively loads the PDF inline — no screen navigation required.

---

## Component Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `dgpId` | String | — | **Required.** DGP record Id |
| `cardTitle` | String | `Generated Document` | Card header |
| `autoPreview` | Boolean | `false` | Also auto-opens native file preview modal on completion |
| `hidePdfDownload` | Boolean | `false` | Hides Download PDF button |
| `showDocxDownload` | Boolean | `false` | Shows Download Word button |
| `contentVersionId` *(output)* | String | — | ContentVersionId of the generated PDF |
| `contentDocumentId` *(output)* | String | — | ContentDocumentId — bind to the File Preview component for reactive inline preview |

---

## Technical Notes

- DGP `Status` values: `InProgress` / `Success` / `Failure`
- `ResponseText` may be a raw `ContentVersionId` or JSON — both handled
- File preview uses `NavigationMixin filePreview` with `ContentDocumentId` (069), not `ContentVersionId` (068)
- Polls every 3s, times out after 60 attempts (~3 min)

---

## License

MIT

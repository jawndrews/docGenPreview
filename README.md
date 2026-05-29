# docGenPreview

> A Salesforce LWC Screen Flow component for OmniStudio server-side document generation — shows a loading spinner while polling, then automatically opens the native file preview on completion.

Built for **Salesforce Revenue Cloud / OmniStudio** orgs using **OmniDataTransform (DataRaptor)** document templates and the `DocumentGenerationProcess` object.

---

## Screenshots

> Add your own screenshots to the `/screenshots` folder. See [`screenshots/README.md`](screenshots/README.md) for the full list of suggested images.

| Loading | Success |
|---|---|
| ![Loading](screenshots/loading-state.png) | ![Success](screenshots/success-state.png) |

---

## What It Does

- Receives a `DocumentGenerationProcess` Id as a Flow input
- Polls the DGP record every 3 seconds until `Status = Success` or `Failure`
- Shows a live spinner with elapsed time while waiting
- On completion, optionally auto-opens the native Salesforce file preview modal
- Surfaces Download PDF and Download Word buttons (configurable)
- Handles errors and timeouts gracefully with retry options
- Outputs `contentVersionId` back to the flow for downstream use

---

## Prerequisites

- Salesforce Revenue Cloud or OmniStudio with Document Generation enabled
- A configured `DocumentTemplate` using OmniDataTransform (DataRaptor) token mapping
- The Word file uploaded to the Document Template
- A Screen Flow on the relevant record page

---

## Installation

### Option 1 — Deploy via Salesforce CLI (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/docGenPreview.git
cd docGenPreview

# 2. Authenticate
sf org login web --instance-url https://test.salesforce.com --alias myOrg
# Use https://login.salesforce.com for production or Developer Edition

# 3. Deploy
sf project deploy start --source-dir force-app --target-org myOrg --test-level NoTestRun
```

### Option 2 — Deploy via VS Code

1. Install the [Salesforce Extension Pack](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode) in VS Code
2. Clone this repo and open it in VS Code
3. Press `Ctrl+Shift+P` → `SFDX: Authorize an Org`
4. Choose **Sandbox** (`test.salesforce.com`) or **Production** (`login.salesforce.com`)
5. Once authorized, right-click `force-app` in the Explorer → **SFDX: Deploy Source to Org**

---

## Flow Setup

### Overview

```
Get Quote Document Template (Get Records)
        ↓
Get Content Document (Get Records)
        ↓
Assignment — Build DGP record variable
        ↓
Create DGP (Create Records)
        ↓
Screen — docGenPreview component
        ↓
End
```

> See the [`/screenshots`](screenshots/) folder for annotated screenshots of each step.

---

### Step 1 — Get the Document Template

Add a **Get Records** element.

![Get Document Template](screenshots/get-document-template.png)

| Setting | Value |
|---|---|
| Object | `DocumentTemplate` |
| Filter | `Name` Equals `YourTemplateName` |
| Store | First record only — Automatically store all fields |

---

### Step 2 — Get the Content Document

Add a second **Get Records** element.

![Get Content Document](screenshots/get-content-document.png)

| Setting | Value |
|---|---|
| Object | `ContentDocument` |
| Filter | `Title` Equals `YourWordFileName` |
| Sort | `LastModifiedDate` Descending |
| Store | First record only — Automatically store all fields |

> **Note:** `ContentDocument.Title` must match the filename of the Word file uploaded to your Document Template (without the `.docx` extension).

---

### Step 3 — Assignment

Create a Record variable `recDGP` of type `DocumentGenerationProcess`. Add an **Assignment** element with these values.

![Assignment](screenshots/assignment.png)

| Variable | Value |
|---|---|
| `recDGP > DataRaptorInput` | `'{"Id":"' & {!recordId.Id} & '"}'` |
| `recDGP > DocumentInputType` | `DocumentTemplate` |
| `recDGP > DocumentTemplateId` | `{!Get_Quote_Document_Template.Id}` |
| `recDGP > ReferenceObject` | `{!recordId.Id}` |
| `recDGP > RequestText` | `'{"templateContentVersionId": "' & {!Get_ContentDocument.LatestPublishedVersionId} & '", "title":"' & {!recordId.Name} & '", "keepIntermediate": false}'` |
| `recDGP > Status` | `InProgress` |
| `recDGP > Type` | `GenerateAndConvert` |

> **Important:** Use **single quotes** for string literals in Flow formulas to avoid JSON escaping issues. The `RequestText` format including spaces after colons and `"keepIntermediate": false` is required by Salesforce.

---

### Step 4 — Create Records

Add a **Create Records** element using `{!recDGP}`.

![Create DGP](screenshots/create-dgp.png)

---

### Step 5 — Screen Component

Add a **Screen** element and drop the `docGenPreview` component onto it.

![Screen Component](screenshots/screen-component.png)

Wire up the component inputs:

| Property | Value |
|---|---|
| Document Generation Process ID | `{!recDGP.Id}` |
| Card Title *(optional)* | e.g. `Quote Document` |
| Auto-open Preview on Completion | ✓ or ✗ |
| Hide Download PDF Button | ✓ or ✗ |
| Show Download Word Button | ✓ or ✗ |

![Component Properties](screenshots/component-properties.png)

---

## Component Properties

### Inputs

| Property | Type | Default | Description |
|---|---|---|---|
| `dgpId` | String | — | **Required.** Id of the `DocumentGenerationProcess` record |
| `cardTitle` | String | `Generated Document` | Card header text |
| `autoPreview` | Boolean | `false` | Auto-opens native file preview on completion |
| `hidePdfDownload` | Boolean | `false` | Hides the Download PDF button |
| `showDocxDownload` | Boolean | `false` | Shows the Download Word button |

### Outputs

| Property | Type | Description |
|---|---|---|
| `contentVersionId` | String | ContentVersionId of the generated PDF |

---

## Key Technical Notes

| Topic | Detail |
|---|---|
| DGP Status values | `InProgress`, `Success`, `Failure` — not `Completed` |
| ResponseText format | May be a raw ContentVersionId string or JSON — both handled |
| File preview | Uses `NavigationMixin filePreview` with `ContentDocumentId` (069), not `ContentVersionId` (068) |
| Polling | Every 3 seconds, up to 60 attempts (~3 minutes) before timeout |
| RequestText | Must include spaces after colons and `"keepIntermediate": false` |

---

## Files

```
force-app/main/default/
├── classes/
│   ├── DocGenPreviewController.cls          Apex — polls DGP status
│   ├── DocGenPreviewController.cls-meta.xml
│   ├── DocGenPreviewControllerTest.cls      Unit tests
│   └── DocGenPreviewControllerTest.cls-meta.xml
└── lwc/docGenPreview/
    ├── docGenPreview.html                   Component template (pure SLDS)
    ├── docGenPreview.js                     Component controller
    ├── docGenPreview.css                    Empty (no custom styles)
    └── docGenPreview.js-meta.xml            Flow screen metadata + properties
```

---

## License

MIT — free to use, modify, and distribute.

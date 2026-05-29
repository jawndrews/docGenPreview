# docGenPreview

> LWC Screen Flow component for OmniStudio server-side document generation. Polls a `DocumentGenerationProcess` record, shows a spinner while waiting, then opens the native Salesforce file preview on completion.

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

Formula fields require a **Formula resource** (New Resource → Formula → Text) — create these first, then reference them in the field value.

> Use **single quotes** for string literals in Flow formulas. The `RequestText` format — including spaces after colons and `"keepIntermediate": false` — is enforced by Salesforce and will throw `INVALID_INPUT` if wrong.

### Screen Component

Drop `docGenPreview` onto a Screen element and set:

| Input | Value |
|---|---|
| Document Generation Process ID | `{!YourDGPVariable.Id}` |
| Card Title | e.g. `Quote Document` |
| Auto-open Preview on Completion | Boolean |
| Hide Download PDF Button | Boolean |
| Show Download Word Button | Boolean |

---

## Component Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `dgpId` | String | — | **Required.** DGP record Id |
| `cardTitle` | String | `Generated Document` | Card header |
| `autoPreview` | Boolean | `false` | Auto-opens file preview on completion |
| `hidePdfDownload` | Boolean | `false` | Hides Download PDF button |
| `showDocxDownload` | Boolean | `false` | Shows Download Word button |
| `contentVersionId` *(output)* | String | — | ContentVersionId of the generated PDF |

---

## Technical Notes

- DGP `Status` values: `InProgress` / `Success` / `Failure`
- `ResponseText` may be a raw `ContentVersionId` or JSON — both handled
- File preview uses `NavigationMixin filePreview` with `ContentDocumentId` (069), not `ContentVersionId` (068)
- Polls every 3s, times out after 60 attempts (~3 min)

---

## License

MIT

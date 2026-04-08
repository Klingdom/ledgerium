# Ledgerium AI — Workflow Test Fixtures

Ten realistic workflow recordings for testing the Ledgerium process intelligence pipeline.

## Workflow List

| # | File | Scenario | Events | Steps | Systems | Pattern |
|---|------|----------|--------|-------|---------|---------|
| 1 | `accounts-payable-invoice-processing.json` | AP clerk processes vendor invoice | 18 | 6 | NetSuite | Straight-through |
| 2 | `employee-onboarding-saas.json` | HR onboards new hire across 4 apps | 25 | 8 | Workday, Slack, Jira, Gmail | Multi-system |
| 3 | `customer-support-ticket-triage.json` | Agent triages support ticket with CRM error | 22 | 7 | Zendesk, Salesforce | Exception handling |
| 4 | `sales-crm-opportunity-update.json` | Sales rep updates deal and submits for approval | 20 | 5 | Salesforce | Approval / send_action |
| 5 | `ecommerce-order-refund-processing.json` | CS processes refund with failed first attempt | 30 | 9 | Shopify, Gmail | Rework / retry |
| 6 | `healthcare-patient-intake-admin.json` | Admin registers patient, verifies insurance | 33 | 9 | EpicCare EHR, BCBS Portal | Research-heavy |
| 7 | `insurance-claim-review.json` | Adjuster reviews claim across 3 systems | 40 | 13 | Guidewire, NICB | Complex enterprise |
| 8 | `it-access-provisioning.json` | IT provisions new employee access | 25 | 8 | ServiceNow, Azure AD, VPN | Back-office |
| 9 | `marketing-campaign-launch-checklist.json` | Marketing launches email campaign | 25 | 8 | Monday, HubSpot, Slack | Time-sensitive |
| 10 | `procurement-vendor-setup.json` | Procurement sets up new vendor with sensitive data | 34 | 9 | SAP, Google Sheets | Approval + PII redaction |

## Schema Coverage

### Event Types
- `interaction.click` — all files
- `interaction.input_change` — all files with forms
- `interaction.submit` — form submission flows
- `navigation.open_page` — cross-page navigation
- `navigation.spa_route_changed` — SPA route changes
- `system.modal_opened` / `system.modal_closed` — modal dialogs
- `system.toast_shown` — success/info notifications
- `system.loading_started` / `system.loading_finished` — async operations
- `system.error_displayed` — error states (#3, #5, #7)

### Grouping Reasons
- `click_then_navigate` — navigation steps (all files)
- `fill_and_submit` — form completion (#1, #2, #6, #10)
- `data_entry` — text/field input (#4, #6, #7, #8)
- `send_action` — submit/send buttons (#4, #5, #9)
- `single_action` — isolated clicks (#3, #7)
- `error_handling` — error + recovery (#3, #5, #7)
- `file_action` — file upload (#10)

### Process Behaviors
- **Straight-through**: #1, #4
- **Multi-system**: #2, #7, #8, #9
- **Error + retry**: #3, #5, #7
- **Approval flow**: #4, #10
- **PII redaction**: #6, #8, #10 (with policyLog entries)
- **Research/lookup**: #3, #6, #7
- **Rework**: #5
- **Decision points**: #7

### Completion States
- Successful completion: #1, #2, #4, #6, #8, #9, #10
- Completed with exception handling: #3, #5, #7

## Usage

### Upload to web app
Each file can be uploaded directly via the Ledgerium web app upload page (`/upload`).

### Process engine testing
```typescript
import { validateBundle, runProcessEngine } from '@/lib/ingestion';
const bundle = JSON.parse(fs.readFileSync('fixtures/workflows/insurance-claim-review.json', 'utf-8'));
const result = validateBundle(bundle);
if (result.valid) {
  const output = runProcessEngine(result.bundle);
  // output contains: processRun, processDefinition, processMap, sop
}
```

### Process map validation
Upload multiple files from the same industry (e.g., #1 + #10 for finance) to test process clustering and variant detection.

### SOP rendering validation
Each file produces a distinct SOP. Test all 3 SOP template formats (Operator, Enterprise, Decision) against these fixtures.

### Demo content
Upload all 10 to populate a demo account with realistic, diverse workflow data.

## Schema Version
- Schema: `1.0.0`
- Recorder: `0.1.0`
- Segmentation: `1.1.0`
- Renderer: `0.1.0`

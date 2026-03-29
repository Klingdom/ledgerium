# Ledgerium AI — Web App User Guide

A guide to using the Ledgerium AI web app at [ledgerium.ai](https://ledgerium.ai).

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Uploading Workflows](#2-uploading-workflows)
3. [Workflow Library](#3-workflow-library)
4. [Workflow Detail Page](#4-workflow-detail-page)
5. [Process Intelligence](#5-process-intelligence)
6. [Account & Billing](#6-account--billing)
7. [Extension Sync](#7-extension-sync)
8. [Exporting Data](#8-exporting-data)

---

## 1. Getting Started

### Create an account

1. Go to [ledgerium.ai/signup](https://ledgerium.ai/signup)
2. Enter your name, email, and password (minimum 8 characters)
3. Click **Create Account**
4. You're signed in and taken to the dashboard

### Sign in

1. Go to [ledgerium.ai/login](https://ledgerium.ai/login)
2. Enter your email and password
3. Click **Sign In**

### Navigation

The top navigation bar gives you access to:

| Tab | What it does |
|-----|--------------|
| **Workflows** | Your workflow library — all uploaded and synced workflows |
| **Intelligence** | Process intelligence dashboard — metrics, insights, process definitions |
| **Upload** | Upload a recorder JSON file to create a new workflow |
| **Account** | Profile, billing, extension sync settings |

---

## 2. Uploading Workflows

Workflows come from the Ledgerium AI browser extension. After recording a workflow in the extension, you can get it into the web app two ways:

### Manual upload

1. Click **Upload** in the navigation bar
2. Drag and drop your `.json` file onto the upload area, or click to browse
3. The file is validated and processed through the deterministic engine
4. On success, you'll see:
   - Workflow title
   - Step count
   - Tools/applications used
5. Click **View Workflow** to open it, or **Upload Another** to continue

### Automatic sync from extension

If you've configured sync settings (see [Extension Sync](#7-extension-sync)), recordings sync automatically when you stop recording. The workflow appears in your library without manual upload.

### What happens during upload

1. The JSON file is validated against the Ledgerium session bundle schema
2. The deterministic process engine segments your recording into workflow steps
3. Five artifacts are generated and stored:
   - **Process output** — steps, phases, metrics
   - **SOP** — standard operating procedure with event-level instructions
   - **Process map** — visual workflow diagram with transitions
   - **Workflow report** — structured summary with executive overview
   - **Source bundle** — the original recorded data

### If upload fails

- The error message explains what went wrong
- Common issues: file is not valid JSON, missing required fields, unsupported schema version
- Click **Try Again** to retry with a different file

---

## 3. Workflow Library

The **Workflows** page is your home base — a searchable, sortable collection of all your captured workflows.

### What each workflow shows

- **Title** — the activity name from the recording
- **Tool badges** — applications used during the workflow (e.g., Gmail, Salesforce, Workday)
- **Step count** — how many workflow steps were detected
- **Duration** — how long the recorded session took
- **Confidence** — the engine's certainty in its step segmentation (higher is better)
- **Date** — when the workflow was created

### Searching

Type in the search bar to filter workflows by title. Results update as you type.

### Sorting

Click the sort buttons to order workflows by:

- **Date** — newest or oldest first
- **Name** — alphabetical A-Z or Z-A
- **Steps** — most or fewest steps first

Click the same sort button again to reverse the direction.

### Renaming a workflow

1. Hover over a workflow and click the pencil icon
2. Edit the title inline
3. Press **Enter** to save, or **Escape** to cancel

### Deleting a workflow

1. Hover over a workflow and click the trash icon
2. Confirm the deletion
3. The workflow is soft-deleted (removed from view but preserved in the database)

---

## 4. Workflow Detail Page

Click any workflow in the library to open its detail page. The detail page has five tabs:

### Header

At the top you'll see:
- Workflow title
- Metadata: step count, duration, phase count, confidence score, creation date
- Tool badges for all applications used
- **Export buttons**: Report, SOP, JSON (downloads structured files)

### Workflow tab

Shows the recorded workflow as structured steps:

- **Metrics bar** — total steps, duration, events, and systems
- **Phases** — if the workflow spans multiple applications, phases group steps by system
- **Step list** — each step shows:
  - Step number
  - Title (what happened)
  - Category badge (color-coded):
    - **Navigation** (teal) — page transitions
    - **Form Submit** (blue) — form completion
    - **Data Entry** (violet) — entering values
    - **Send/Submit** (green) — completion actions
    - **File Action** (amber) — file uploads/downloads
    - **Error Handling** (red) — error recovery
    - **Annotation** (purple) — manual notes
    - **Action** (gray) — single interactions
  - Duration and event count
  - Low-confidence warning if the engine was less certain about this step

### SOP tab

Displays a complete Standard Operating Procedure derived from the recording:

- **Header** — title, purpose, scope, estimated time, systems
- **Prerequisites** — what you need before starting
- **Procedure steps** — numbered, actionable instructions:
  - Each step has a title, action description, and detailed instructions
  - Expected outcome describes what should happen when the step is complete
  - Warnings flag sensitive data fields or non-standard behavior
- **Completion criteria** — how to verify the workflow is done
- **Notes** — important context about how the SOP was generated

Every instruction traces back to an observed event — no content is fabricated or interpreted by AI.

### Report tab

A structured workflow report suitable for sharing with stakeholders:

- **Executive summary** — title, objective, key metrics (steps, phases, confidence, applications)
- **Metrics** — total duration, step count, event count, phase count, error steps, completion status
- **Workflow overview** — step-by-step reference list
- **SOP summary** — condensed procedure steps

The report footer notes that all content is evidence-backed and deterministically generated.

### Intelligence tab

On-demand process intelligence analysis for this workflow:

1. Click **Analyze Workflow** to run the analysis
2. Results include:
   - **Key metrics** — median duration, step count, completion rate
   - **Bottlenecks** — steps that take disproportionately long (highlighted in amber with duration ratios)
   - **Step duration analysis** — table showing mean, median, and P90 duration for each step position
   - **Variance** — sequence stability percentage, duration coefficient of variation, count of high-variance steps
   - **Variants** — different execution paths detected, with the standard (most common) path labeled
3. Click **Re-analyze** at any time to refresh results

### Evidence tab

Raw structured data from the process engine — designed for engineers, auditors, and compliance reviewers:

- Four collapsible sections:
  - **Process Run** — execution metadata
  - **Process Definition** — normalized step sequence
  - **Process Map** — nodes, edges, and phases
  - **Standard Operating Procedure** — full SOP data structure
- Click any section header to expand and see the full JSON
- **Copy All JSON** button copies everything to your clipboard
- All outputs are deterministic — the same recording always produces the same evidence

---

## 5. Process Intelligence

The **Intelligence** page provides portfolio-level analysis across all your workflows.

### Running analysis

Click **Run Analysis** to:
1. Auto-cluster similar workflows into **process definitions** (grouping by step sequence)
2. Compute metrics, detect bottlenecks, and generate insights
3. Results appear immediately on the page

### Summary metrics

Four cards at the top show:
- **Workflows** — total active workflows in your library
- **Process Definitions** — how many distinct processes were detected
- **Active Insights** — actionable findings from the analysis
- **Avg Stability** — how consistently your processes are executed (higher is better)

### Insights

Evidence-backed findings about your workflows. Each insight includes:

- **Severity** — Critical (red), Warning (amber), or Info (blue)
- **Type** — bottleneck, variance, drift, or anomaly
- **Title** — what was found
- **Explanation** — why it matters, with specific data
- **Recommendation** — suggested action
- **Observed vs Expected** — the actual values compared to baselines

Click the **X** button to dismiss an insight you've reviewed.

#### Types of insights

| Type | What it detects |
|------|----------------|
| **Bottleneck** | A step that takes significantly longer than the average step |
| **Variance** | High inconsistency in how a process is executed across runs |
| **Drift** | Changes in timing, structure, or error rates compared to baselines |
| **Anomaly** | Unusual behavior in specific runs or steps |

### Process definitions

When you have multiple similar workflows (e.g., several "expense report" recordings), the intelligence engine groups them into a **process definition** — a canonical representation of that process.

Each process definition shows:
- **Canonical name** — the most common title
- **Run count** — how many workflow recordings belong to this process
- **Variants** — how many different execution paths were observed
- **Average duration** — typical time to complete
- **Stability score** — percentage of runs that follow the standard path
- **Insight badges** — any findings associated with this process

---

## 6. Account & Billing

The **Account** page manages your profile, subscription, and extension sync.

### Profile

Displays your email, name, and account creation date.

### Plan & Billing

Shows your current plan and subscription status:

| Plan | What you get |
|------|-------------|
| **Free** | 5 workflow recordings, basic SOP generation, session history (last 10), JSON export |
| **Pro** | Unlimited recordings, full workflow library, advanced SOP generation, process maps, search and filtering, premium reports, all export formats, extension auto-sync, priority support |

**Upgrading to Pro:**
1. Click **Upgrade Now** in the billing section
2. You'll be redirected to Stripe's secure checkout page
3. Complete payment
4. Your account is upgraded immediately

**Managing your subscription** (Pro users):
- Click **Manage Subscription** to open the Stripe billing portal
- From there you can update payment method, view invoices, or cancel

### Upload count

Shows how many workflows you've uploaded. Free plan users see their limit (e.g., "3 / 5").

---

## 7. Extension Sync

Connect the Ledgerium browser extension to automatically sync recordings to the web app.

### Setup

1. On the **Account** page, scroll to **Extension Sync**
2. Click **New API Key**
3. Copy the key immediately — it's shown only once
4. Note the **Sync URL** displayed (e.g., `https://ledgerium.ai/api/sync`)
5. In the browser extension, open the side panel
6. Click **Sync Settings** at the bottom
7. Paste the **Sync URL** and **API Key**
8. Click **Save**

### How it works

After setup, every time you stop a recording in the extension:
1. The extension automatically sends the recording to the web app
2. The workflow appears in your library within seconds
3. An upload progress bar shows sync status in the extension

### Managing API keys

- You can create up to 3 API keys
- Each key shows its prefix and when it was last used
- Click the trash icon to revoke a key (the extension will stop syncing with that key)

---

## 8. Exporting Data

### From the workflow detail page

Three export buttons in the top right:

| Button | What it downloads |
|--------|------------------|
| **Report** | Workflow report as JSON — structured summary with executive overview, metrics, steps, and SOP |
| **SOP** | Standard operating procedure as JSON — complete procedure with prerequisites, instructions, and completion criteria |
| **JSON** | Full process engine output — all structured data including process run, definition, map, and SOP |

Files are named using the workflow title (e.g., `submit-expense-report-report.json`).

### From the Evidence tab

- **Copy All JSON** copies the complete process engine output to your clipboard
- Expand individual sections (Process Run, Process Definition, Process Map, SOP) to inspect or copy specific parts

### What you can do with exports

- Share workflow reports with stakeholders
- Use SOP data to create training documentation
- Import JSON into other tools for further analysis
- Archive evidence for compliance and audit purposes

---

## Tips

- **Upload multiple similar recordings** of the same process to unlock intelligence features — the engine detects patterns, variants, and bottlenecks across runs
- **Use meaningful activity names** in the recorder (e.g., "Submit Q1 expense report" not "test") — these become your workflow titles
- **Check the Intelligence tab** after uploading several related workflows to see bottleneck and variance analysis
- **Run portfolio analysis** on the Intelligence page periodically to detect drift and new process definitions as your library grows
- **Configure extension sync** early — it saves time vs. manual upload and ensures every recording lands in your library automatically

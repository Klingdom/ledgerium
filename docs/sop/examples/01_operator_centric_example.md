# Upload and Review Workflow in Ledgerium AI

*Turn a recorded workflow into a shareable SOP and process map — so your team has a single source of truth for how the work actually happens.*

*Ledgerium SOP · v2.0 · 12 steps · 1 system · 91% confidence · Generated 2026-04-17*

> ✓ **High confidence** — 28 events observed, all 12 steps evidence-linked.

---

## What this is for

You've recorded a workflow with the Ledgerium extension and you want to publish it to your team. This SOP walks you from sign-in to share link — including what to do if your upload is too large the first time.

## When to use it

Whenever you have a workflow recording (a `.json` file from the extension) that you want to turn into a shareable SOP and process map. Typical time: 3 minutes.

## Before you begin

- An account on **app.ledgerium.ai** and your password ready
- The workflow recording file (a `.json` file exported from the Ledgerium browser extension)
- The file should be **under 10 MB** — trim with the extension if needed
- A tag name or two in mind (for example: *Q2 invoice intake*, *finance*, *onboarding*)

## Systems you'll use

- **Ledgerium AI** — web app at app.ledgerium.ai

---

## Step-by-step instructions

### Step 1: Sign in to Ledgerium AI

Open **app.ledgerium.ai** in your browser. Enter your **Email** and **Password** 🔒, then click **Sign in**.

Performed in: Ledgerium AI

✓ **Expected:** you land on the Workflows dashboard.

◦ Evidence: 4 events · `ev_02, ev_03, ev_04, ev_05`

---

### Step 2: Open the Workflows dashboard

If you didn't land there automatically, open the **Workflows** tab in the left nav.

Performed in: Ledgerium AI

✓ **Expected:** the URL reads `/workflows` and you see a list (or an empty state) of your existing workflows.

◦ Evidence: 1 event · `ev_06`

---

### Step 3: Open the upload dialog

Click **Upload workflow** in the top-right of the Workflows page.

Performed in: Ledgerium AI

✓ **Expected:** a dialog titled **Upload workflow file** appears.

◦ Evidence: 2 events · `ev_07, ev_08`

---

### Step 4: Pick your workflow file · *(first attempt — watch for size errors)*

Click **Choose file** and select your workflow `.json` from your computer.

Performed in: Ledgerium AI

✓ **Expected:** you see the file name and its size in the dialog.
⚠ **Watch for:** if the file is larger than 10 MB, you'll see a red error **"File exceeds 10 MB — please select a smaller workflow"**. If that happens, see the next step.

> ◆ **Decision — did the file pass validation?**
> - **Yes, it passed** → skip to Step 6.
> - **No, you got the size error** → continue to Step 5.

◦ Evidence: 2 events · `ev_09, ev_10`

---

### Step 5: Re-select a smaller workflow file

In the same dialog, click **Choose file** again and select a smaller file (or re-export a trimmed version from the extension).

Performed in: Ledgerium AI

✓ **Expected:** a short upload spinner, followed by a green toast **"Workflow uploaded — processing"**, and the URL updates to `/workflows/{id}`.

◦ Evidence: 4 events · `ev_11, ev_12, ev_13, ev_14`

---

### Step 6: Wait for processing to finish ·

The app processes your recording and generates the SOP and process map. This typically takes 30–90 seconds.

Performed in: Ledgerium AI

✓ **Expected:** the page title changes from *"Processing workflow"* to your workflow's detected name (here: *"Q2 invoice intake"*).

◦ Evidence: 1 event · `ev_15`

---

### Step 7: Open the SOP tab

Click the **SOP** tab to review the generated procedure.

Performed in: Ledgerium AI

✓ **Expected:** a structured SOP with numbered steps appears.

◦ Evidence: 1 event · `ev_16`

---

### Step 8: Open the Process map tab

Click the **Process map** tab to see the visual flow of your recorded workflow.

Performed in: Ledgerium AI

✓ **Expected:** a swimlane or flow diagram renders with your recorded steps in order.

◦ Evidence: 1 event · `ev_17`

---

### Step 9: Rename the workflow to something memorable

Click **Edit name** in the header. Type a short, descriptive name in **Workflow name** (for example: *Q2 invoice intake*).

Performed in: Ledgerium AI

✓ **Expected:** the new name appears in the header and in the browser tab title.

◦ Evidence: 2 events · `ev_18, ev_19`

---

### Step 10: Add one or two tags

Click **Add tag** and pick from the **Tags** dropdown. Tags help teammates find this workflow later.

Performed in: Ledgerium AI

✓ **Expected:** the selected tag appears as a chip in the header.

◦ Evidence: 2 events · `ev_20, ev_21`

---

### Step 11: Save the workflow

Click **Save**.

Performed in: Ledgerium AI

✓ **Expected:** a green toast **"Workflow saved"** appears in the bottom-right.

◦ Evidence: 2 events · `ev_22, ev_23`

---

### Step 12: Share the workflow with your team

Click **Share** in the header. In the dialog, click **Copy link**.

Performed in: Ledgerium AI

✓ **Expected:** a toast **"Share link copied to clipboard"** confirms the link is on your clipboard. Paste it into Slack, email, or your team's wiki.

◦ Evidence: 4 events · `ev_24, ev_25, ev_26, ev_27`

---

## Common mistakes

- **Uploading a file over 10 MB on the first try.** Trim long recordings in the extension before exporting, or break them into shorter sessions.
- **Clicking away from the processing screen before it finishes.** Let it run — leaving the page won't cancel processing, but you'll miss the moment the SOP appears.
- **Forgetting to rename the workflow.** The auto-generated name is based on what you did, but a custom name makes the workflow findable later.
- **Skipping tags.** A tag takes 5 seconds to add and saves your teammates 5 minutes of searching.

## Tips

- **Have your tag names in mind before you open the dialog** — you can add or remove tags later, but naming them up front makes the flow quick.
- **Share the link in a Slack channel, not a DM.** Anyone with the link can view the SOP, so group channels maximize reach.
- **Processing takes 30–90 seconds.** Use that time to jot down any context notes you want to add after.

## Completion check

- ✓ The new SOP appears in **Workflows → Library** under your chosen name
- ✓ The **Process map** tab shows your recorded steps in order
- ✓ Your share link is on your clipboard and ready to paste

---

*Derived from session `s_2026_04_17_abc123` by Ledgerium process-engine v1.2.0 · 28 events · Open timeline: https://app.ledgerium.ai/s/s_2026_04_17_abc123*

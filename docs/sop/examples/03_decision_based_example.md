# Workflow Upload Triage — Ledgerium AI

*When a workflow upload needs to end in a shareable SOP — fast, reliably, and with a clear path back if something goes wrong.*

*Ledgerium SOP · v2.0 · 3 paths · 1 system · 91% confidence · Generated 2026-04-17*

> ✓ **High confidence** — 28 events observed · 1 decision point · 1 error path documented.

---

## Trigger condition

A Workflow Author has a recording file and needs to produce a shareable SOP and process map in Ledgerium AI — including when the first upload attempt fails.

## Inputs / context needed

- Access to **app.ledgerium.ai** and valid credentials
- The workflow recording file (`.json`, schema v1.0.0)
- Knowledge of whether the file is under 10 MB
- Your team's preferred tags (optional but useful)

## Initial assessment

Before picking a path, confirm:

- You can sign in to Ledgerium AI.
- You have the recording `.json` file on your workstation.
- You know the file's approximate size.

Then pick the path that matches what you see after you click **Upload workflow**:

- **You see a processing spinner, then an SOP** → **Path 1** (standard flow).
- **You see a red error "File exceeds 10 MB"** → **Path 2** (size error recovery).
- **The page has been on "Processing" for more than 5 minutes** → **Path 3** (processing stall).

---

## Decision paths

### Path 1: Standard flow — no errors encountered · probability: high

The recording was under the size limit and processed cleanly.

1. **Sign in** to `app.ledgerium.ai` with your email and password.
   ◦ Evidence: `ev_02, ev_03, ev_04, ev_05`

2. **Open the Workflows dashboard** if you didn't land there automatically.
   ◦ Evidence: `ev_06`

3. **Open the upload dialog.** Click **Upload workflow** in the top-right.
   ◦ Evidence: `ev_07, ev_08`

4. **Pick your file.** Click **Choose file** and select your `.json`.
   ◦ Evidence: `ev_09` *(this is the first upload attempt; the happy path assumes no size error)*

5. **Wait for processing** — typically 30–90 seconds. Stay on the page.
   ◦ Evidence: `ev_15`

6. **Review the generated SOP.** Click the **SOP** tab and confirm the steps match what you did.
   ◦ Evidence: `ev_16`

7. **Review the process map.** Click the **Process map** tab and confirm the flow is right.
   ◦ Evidence: `ev_17`

8. **Name the workflow.** Click **Edit name**, type a descriptive name.
   ◦ Evidence: `ev_18, ev_19`

9. **Tag the workflow.** Click **Add tag** and pick tags from the dropdown.
   ◦ Evidence: `ev_20, ev_21`

10. **Save.** Click **Save**.
    ◦ Evidence: `ev_22, ev_23`

11. **Generate a share link.** Click **Share** → **Copy link**.
    ◦ Evidence: `ev_24, ev_25, ev_26, ev_27`

> ✓ **Outcome** — the SOP is saved, named, tagged, and a share link is on your clipboard. Paste it wherever your team looks for documentation.

---

### Path 2: Upload rejected — file is larger than 10 MB · probability: medium

Trigger: after you selected a file in the upload dialog, you saw a red error **"File exceeds 10 MB — please select a smaller workflow"**.

1. **Don't close the dialog.** You can re-select a file without starting over.
   ◦ Evidence: `ev_10`

2. **Get a smaller file.** Either (a) re-export a shorter recording from the Ledgerium browser extension, or (b) pick a different recording that's under the limit.
   ◦ Evidence: *(out-of-session — user performs this outside Ledgerium)*

3. **Re-select the file.** Click **Choose file** again in the same dialog and pick the compliant file.
   ◦ Evidence: `ev_11`

4. **Wait for the upload to complete.** A spinner appears, then a green toast **"Workflow uploaded — processing"**, and the URL updates.
   ◦ Evidence: `ev_12, ev_13, ev_14`

5. **Resume Path 1 at step 5** (wait for processing, then review).

> ✕ **Outcome** — the oversize file was rejected but recovery succeeded; the workflow is uploaded and now on the happy path.

---

### Path 3: Processing stalled — no SOP after 5 minutes · probability: low · expected, not observed

Trigger: the "Processing workflow" screen has been visible for more than 5 minutes.

> ⚠ This path was not observed in the source recording. Follow it only if the stall symptom is clearly visible.

1. **Refresh the page once.** Some stalls are client-side display bugs; the server-side job may have completed.

2. **Check the workflow record.** Open the Workflows dashboard in a new tab. If your workflow appears with a "Ready" or "Processed" status, return to it — the SOP is available.

3. **If still stalled, do not retry the upload.** Multiple uploads of the same recording create duplicate records.

4. **Escalate per the rules below.** Include the session ID from the URL in your escalation message.

> ⚠ **Outcome** — the triage is handed off to engineering; you do not retry.

---

## Escalation rules

- **If the same size error recurs after a second upload attempt** → stop retrying. The file is likely malformed; contact Ledgerium support via in-app chat and attach the session ID from the URL.
- **If Path 3 stall exceeds 10 minutes** → escalate to the Ledgerium support team. Include: session ID, approximate file size, browser, and whether refresh resolved it.
- **If the workflow contains sensitive organizational data** → do not generate a share link. Escalate to the data governance lead before distribution regardless of which path you took.
- **If you took Path 2 and still see a validation error after re-selecting** → the issue is schema version, not size. Contact support.

## Exception handling

- **File exceeds 10 MB on the first attempt.** Handled by Path 2. This is the most common exception in the source recording.
- **Authentication failure at sign-in.** Retry with correct credentials. After 3 failures, contact your organization's Ledgerium administrator.
- **Network interruption during upload.** Refresh the page; restart from Step 3 of Path 1.
- **Tag dictionary is empty (new organization).** Add tags later via the workflow detail page; it is not blocking for Save.

## Resolution outcomes

- ✓ **Standard success** — Path 1 completed; SOP saved, named, tagged, shared.
- ✕ **Recovered success** — Path 2 completed; oversize file replaced, then Path 1 resumed.
- ⚠ **Escalated** — Path 3 reached; support engaged; triage handed off.

## Completion criteria

- ✓ The workflow is visible in your library under a descriptive name.
- ✓ The SOP and Process map tabs both render content for the workflow.
- ✓ A share link exists on your clipboard, OR the issue has been escalated with a session ID.

## Documentation requirements

- Record which path you took.
- If Path 2: note that a first upload attempt was rejected for size.
- If Path 3: capture the session ID, the browser used, and the time at which the stall began. Attach to the escalation ticket.
- Whichever path: confirm the final workflow name and tags are what you intended.

---

*Derived from session `s_2026_04_17_abc123` by Ledgerium process-engine v1.2.0 · 28 events · Paths 1 and 2 observed in recording; Path 3 included as expected-but-unobserved escalation path · Open timeline: https://app.ledgerium.ai/s/s_2026_04_17_abc123*

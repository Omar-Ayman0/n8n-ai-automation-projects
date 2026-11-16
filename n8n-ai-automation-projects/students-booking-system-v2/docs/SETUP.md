# Demo setup guide

## Prerequisites and placeholders

You need: a Google account (Forms, Sheets, Apps Script), an n8n instance, and a Telegram bot with a chat to receive messages. The project uses no `.env` file; configuration lives in Apps Script Script Properties and in the n8n nodes.

| Placeholder (as exported) | Where | Replace with |
|---|---|---|
| `REPLACE_WITH_FORM_RESPONSES_SPREADSHEET_ID` | `Google Sheet Trigger` → document | Your demo form-responses spreadsheet |
| `REPLACE_WITH_FORM_RESPONSES_SHEET_GID` | `Google Sheet Trigger` → sheet | The responses tab |
| `REPLACE_WITH_YOUR_DEPLOYMENT_ID` | `Atomic Booking — Apps Script`, `Mark Notification SENT`, `Mark Notification FAILED` (URL) | Your Apps Script `/exec` deployment URL |
| `REPLACE_WITH_PRIVATE_BOOKING_TOKEN` | Same three nodes (JSON body) | The value of `BOOKING_API_TOKEN` |
| `REPLACE_WITH_TEST_CHAT_ID` | All six Telegram nodes | Your private demo chat ID |
| *(n8n credentials)* | Google Sheets trigger, Telegram nodes | Select credentials in n8n; none are stored in the export |
| `BOOKING_SHEET_ID`, `BOOKING_API_TOKEN` | Apps Script Script Properties | Demo workbook ID; random secret of 32+ characters |

Sheet and header requirements are listed in [ARCHITECTURE.md](ARCHITECTURE.md#required-sheet-structure).

## 0. Secret rotation before publishing

The live exported workflow previously contained an inline API token. **Treat that value as exposed and rotate it.** Generate a new secret (32+ random characters), update `BOOKING_API_TOKEN` in Apps Script Script Properties, then update `Atomic Booking — Apps Script`, `Mark Notification SENT`, and `Mark Notification FAILED` inside your **private** n8n workflow. Do not copy the updated secret into any public JSON/README/screenshot.

## 1. Prepare a safe demo dataset

Create copies of the client's form and spreadsheets with **no original student responses**. Prepare group-named tabs, `الكشف المجمع`, `Waiting List` and `settings`. Keep exact Arabic header strings used by the code. `settings` requires `المجموعة`, `النوع`, `اللينك`, `ليميت الطلاب`. For a given `(group, gender)`, there must be **exactly one** settings row. Store phone cells as Plain text.

## 2. Set up Apps Script

1. On the demo workbook choose Extensions → Apps Script.
2. Replace `Code.gs` with `apps-script/Code.gs` from the repo.
3. Project Settings → Script Properties:
   - `BOOKING_SHEET_ID`: demo `كشف الطلاب` spreadsheet ID.
   - `BOOKING_API_TOKEN`: private random secret (never commit).
4. Deploy → Web app. Execute as **Me**. For a simple unauthenticated server-to-server n8n request, `Who has access` may need **Anyone**; this makes the endpoint internet-reachable, so use a strong private token, restricted owner account and demo records only.
5. Copy the `/exec` URL. After code edits, update the deployment to the new version.

## 3. Set up n8n

1. Import `workflow/students-booking-v2.public.json` into a separate inactive workflow.
2. Choose your private Google Sheets and Telegram Credentials in n8n.
3. Set the Google Sheets Trigger **document ID** and **sheet/tab** to the demo `Form Responses` source (the public export uses placeholders).
4. In `Atomic Booking — Apps Script`, `Mark Notification SENT`, `Mark Notification FAILED`, set the Apps Script `/exec` URL and configure the private token used in JSON request bodies. Never export these configured fields to a public GitHub repo.
5. Replace placeholder chat ID in all Telegram nodes with your own private demo chat ID. Keep the old workflow inactive if pointing at the same source.
6. Confirm the active workflow has one source trigger and that only one workflow watches the demo spreadsheet.

## 4. Verify safely

Use one fake registration through Google Form first. Confirm the `Atomic Booking` output says `ok: true` and a status (e.g. `CONFIRMED`), the student appears once in the group tab and master sheet, and notification is sent once. Then check `_BookingLedger`. Run duplicate and full-group tests before doing controlled concurrency tests. Polling/larger pasted batches can be slow; do not assume every pasted row became a distinct trigger event without checking n8n execution item count.

## 5. Publication

Upload only the files in this package. **Do not upload** a fresh configured n8n export unless you sanitize it again. Inspect the GitHub rendered files before sharing publicly.

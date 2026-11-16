# Architecture

This document describes what the workflow and the Apps Script actually do, based on `workflow/students-booking-v2.public.json` and `apps-script/Code.gs`. For the high-level picture and diagrams see the [README](../README.md#4-system-architecture).

## Components

| Component | Role |
|---|---|
| Google Form + `Form Responses` sheet | Registration input (Arabic field labels) |
| n8n workflow | Polling, normalization, validation, routing, Telegram notifications |
| Apps Script web app (`Code.gs`) | Token check, script lock, booking decision, sheet writes, ledger |
| Google Sheets workbook | Per-group tabs, `الكشف المجمع` (master), `Waiting List`, `settings`, `_BookingLedger` |
| Telegram bot | Staff notifications and alerts |

## n8n workflow stages

| Stage | Nodes | What happens |
|---|---|---|
| 1. Ingest | `Google Sheet Trigger` → `Loop Over Items` | Polls every minute for new rows (`rowAdded`), retry-on-fail 3×. Items are processed one at a time. |
| 2. Normalize and validate | `Prepare Registration` → `Valid Input?` | Finds columns by label fragment (labels may contain emoji), strips spaces/dashes/parentheses from phone numbers, builds `event_id`, checks name, group, gender (`طالب`/`طالبة`) and `^0\d{10}$` phone. Invalid → `Invalid Input Alert`. |
| 3. Book | `Atomic Booking — Apps Script` | POSTs the registration plus token to the web app. Timeout 45 s, retry-on-fail 3×, error output → `HTTP Failure Alert`. |
| 4. Decide | `Prepare Decision & Safe Message` | Parses the response, escapes user text for Telegram HTML, builds the message and a WhatsApp deep link (Egyptian `0…` number converted to `20…`). |
| 5. Route | `Confirmed?` → `Waitlisted?` → `Duplicate?` → `Skip Already Processed?` | Chained status checks. `ALREADY_PROCESSED` is skipped silently; any other unmatched status goes to `Operations Alert`. |
| 6. Notify | `Conformation Message`, `Waiting List Message`, `Duplicate Message` | Telegram send. Success → `Mark Notification SENT`; error output → `Mark Notification FAILED`. |
| 7. Close | `Mark Notification SENT/FAILED` → `Loop Over Items` | Writes notification outcome to the ledger, then moves to the next item. |

`Conformation Message` is the node's name as exported (sic); it was not renamed to avoid changing the workflow file.

## Booking engine (`Code.gs`)

### Entry point

`doPost` parses the JSON body, checks `BOOKING_API_TOKEN` and `BOOKING_SHEET_ID`, then tries `LockService.getScriptLock()` for 30 s. It dispatches to `recordNotice_` when `action === 'notification'`, otherwise to `book_`.

### Required sheet structure

| Sheet | Used for | Required headers |
|---|---|---|
| `settings` | Capacity per group and gender | `المجموعة`, `النوع`, `اللينك`, `ليميت الطلاب` — exactly one row per (group, gender) |
| `<group name>` | Confirmed students of that group | Must include `رقم الطالب` |
| `الكشف المجمع` | All confirmed students | Must include `رقم الطالب` |
| `Waiting List` | Overflow | Must include `رقم الطالب` |
| `_BookingLedger` | Created automatically on first call | See below |

Records are written by matching values to the sheet's own header row, so extra columns are left empty. Phone columns are written as plain text. The record also fills a header spelled `المجوعة` (without the second `م`) alongside `المجموعة`; this appears to match a misspelled column in the demo workbook (not verifiable from the repository).

### Ledger (`_BookingLedger`)

Columns: `event_id`, `student_number`, `group`, `gender`, `intended_status`, `stage`, `created_at`, `updated_at`, `last_error`, `notice_status`, `notice_updated_at`.

| `stage` | Meaning |
|---|---|
| `PROCESSING` | Decision recorded, writes started or failed part-way (`last_error` holds the message on exception) |
| `DONE` | All writes for the decision completed |

`intended_status` stores the first decision (`CONFIRMED`, `WAITLISTED` or `DUPLICATE`), so a retry finishes that decision rather than re-reading capacity.

### Decision logic in `book_`

1. Validate event ID (≤ 240 chars), name, group, gender, 11-digit phone, and optional parent phones.
2. Require exactly one `settings` row for (group, gender) and a positive integer capacity.
3. If the ledger already has this `event_id` at `DONE`: no new booking. Return the original status again only if its notification is not yet `SENT`, otherwise `ALREADY_PROCESSED`.
4. If a **different** unfinished ledger entry exists for the same phone: return `RETRY`.
5. If there is no ledger entry for this event and the phone already exists in the group, master or waiting sheet: record `DUPLICATE`.
6. Otherwise plan `WAITLISTED` if the group sheet already has `capacity` or more rows with a student number, else `CONFIRMED`. An existing ledger entry keeps its planned status.
7. Write the ledger as `PROCESSING`, append to the target sheets only if the phone is not already there (this is what makes a retry safe), then mark `DONE`.

### Status reference

| Status | Produced by | n8n handling |
|---|---|---|
| `CONFIRMED` | `book_` | Confirmation message |
| `WAITLISTED` | `book_` | Waiting-list message |
| `DUPLICATE` | `book_` | Duplicate message |
| `ALREADY_PROCESSED` | `book_` (replay) | Skipped, no notification |
| `INVALID` | `book_`, `recordNotice_` | Operations Alert |
| `RETRY` | `doPost` (lock busy), `book_` (other unfinished event) | Operations Alert — **no automatic re-submission** |
| `UNAUTHORIZED` | `doPost` | Operations Alert |
| `ERROR` | `doPost` catch-all | Operations Alert |
| `NOTICE_RECORDED` / `NOT_FOUND` | `recordNotice_` | Response of the Mark SENT/FAILED calls; not routed further |

## Event IDs

`event_id` is `FORM_DEMO:<row number>` when the trigger output carries a row number (`row_number`, `rowNumber` or `rowIndex`). Otherwise it falls back to `FORM_DEMO:<timestamp>|<phone>|<group>|<gender>`. The fallback is deterministic but not guaranteed unique. Whether the Google Sheets Trigger supplies a row number in your n8n version has not been verified in this repository; check an execution's output before relying on it.

## Not present in this project

No AI/LLM nodes, no database, no webhook trigger, no HMAC signing, no approval step. Authentication is a single shared token in the request body (Apps Script web apps do not expose request headers to `doPost`).

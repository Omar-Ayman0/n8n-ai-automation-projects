# Students Booking System — V2 Reliability Upgrade

**A post-deployment engineering improvement of a real educational enrollment workflow.**

> **Project context:** The original workflow (V1) was built for an educational center serving approximately **500–600 students**, during a time-limited enrollment period. The original solution was used for **500+ registrations**, according to the project owner. V2 is a *subsequent improvement/demo*, **not** the version deployed to that client.

[Original V1 portfolio project](https://github.com/Omar-Ayman0/n8n-ai-automation-projects/tree/main/students-booking-system) · [V1 → V2 comparison](docs/V1_VS_V2.md) · [Test evidence](docs/TEST_REPORT.md) · [Setup](docs/SETUP.md)

## Problem and scope

A teacher/education center needed a manageable way to collect registrations, detect repeated submissions, respect capacity limits, assign overflow to a waiting list, and notify staff. The practical V1 choice—**Google Forms, Google Sheets, n8n, and Telegram**—fit limited volume, budget and nontechnical staff workflows. This repository documents a later exploration of **retries, consistency, observability and concurrent bookings** without replacing that entire stack.

## V2 architecture

```mermaid
flowchart TD
  A[Google Form] --> B[Form Responses Google Sheet]
  B --> C[n8n: Trigger + Normalize/Validate]
  C --> D{Valid?}
  D -- No --> X[Invalid input notification]
  D -- Yes --> E[Google Apps Script Web App]
  E --> F[Script Lock + Idempotency Ledger]
  F --> G{Booking result}
  G -- Confirmed --> H[Group sheet + Master sheet]
  G -- Waitlisted --> I[Waiting List]
  G -- Duplicate --> J[No additional reservation]
  G --> K[n8n status routing + Telegram]
  K --> L[Notification outcome to Ledger]
```

Apps Script serializes booking decisions **that use this same script deployment** using `LockService`, and records event-processing stages in `_BookingLedger`. It uses repair/retry of partial writes—not a database ACID transaction or true rollback. Other writers/manual edits are outside that lock.

## Features in V2

- Input normalization/validation of Arabic Google Form fields, including phone format.
- Stable event identifiers when the source provides stable input; fallback based on timestamp+fields is **not guaranteed globally unique**.
- Capacity and group+gender settings validation.
- Duplicate student checks and event replay detection via `_BookingLedger`.
- Repairable partial writes to group + master sheets.
- Telegram confirmation/waitlist/duplicate messages, notification-status logging and operational alerts.
- n8n sticky notes for system overview, input, booking engine, routing and acceptance tests.

## Recorded demonstration

The operator ran a **50-registration demo batch**. The n8n execution screenshot shows **50 processed items**, routed as **26 confirmed, 14 waitlisted, 10 duplicates**, over approximately **11m 49s**. These are **actual observed test counts**, not throughput benchmarks. The group capacity settings were *not* set to the intended 10/8 for that run; therefore this test **does not validate the expected capacity-threshold scenario**. Screenshots use synthetic data.

![Workflow execution with demo run](assets/screenshots/workflow-execution.png)

| Observed result | Count |
|---|---:|
| Confirmed | 26 |
| Waitlisted | 14 |
| Duplicate | 10 |
| **Total** | **50** |

See [TEST_REPORT.md](docs/TEST_REPORT.md) for what was observed vs. what is **not yet independently tested**, and [LIMITATIONS.md](docs/LIMITATIONS.md) for operational/security constraints.

## Repository layout

```text
workflow/students-booking-v2.public.json    # sanitized n8n import template
apps-script/Code.gs                         # booking engine source, no secrets
assets/screenshots/                        # test evidence; cropped
 docs/SETUP.md                              # setup instructions
 docs/V1_VS_V2.md                          # original vs upgraded design
 docs/TEST_REPORT.md                        # demo counts and pending tests
 docs/LIMITATIONS.md                        # important limitations
```

## Setup

1. Import `workflow/students-booking-v2.public.json` into a **separate inactive** n8n workflow.
2. Create **fresh demo copies** of the Google Form and workbooks. The workflow needs the `Form Responses` sheet, group-named tabs, `الكشف المجمع`, `Waiting List`, and `settings`.
3. Deploy `apps-script/Code.gs` as a Google Apps Script Web App with `BOOKING_SHEET_ID` and a random `BOOKING_API_TOKEN` in Script Properties.
4. Replace **public template placeholders** for the Form Responses sheet, the Apps Script `/exec` URL, private API token, Telegram chat ID, and credentials. **Never publish the configured export.**
5. Test with fake students and inspect n8n Executions, group/master/waiting sheets and `_BookingLedger`.

Full instructions: [docs/SETUP.md](docs/SETUP.md).

## Public-data note

**No real student records, credentials, real Web App deployment URLs or real Telegram chat IDs are included in this public template.** Screenshots show synthetic data from a demo run. Tokens/IDs need private configuration in a demo environment.

## Engineering provenance

V1 was built for the original client and retained as a separate historical artifact. V2 is a later assisted engineering iteration; functionality should be evaluated from its source, demo and tests rather than from claims of unverified production history. No claim is made that the new V2 code was in the client deployment.


## Architecture Diagram

Source: [Architecture diagram](../assets/diagrams/students-booking-system-v2.mmd)

```mermaid
flowchart LR
  N0{{"Google Sheet Trigger"}}
  N1["Loop Over Items"]
  N2["Prepare Registration"]
  N3["Valid Input?"]
  N4[("Atomic Booking — Apps Script")]
  N5["Prepare Decision & Safe Message"]
  N6["Confirmed?"]
  N7["Waitlisted?"]
  N8["Duplicate?"]
  N9["Skip Already Processed?"]
  N10[("Conformation Message")]
  N11[("Waiting List Message")]
  N12[("Duplicate Message")]
  N13[("Operations Alert")]
  N14[("Invalid Input Alert")]
  N15[("HTTP Failure Alert")]
  N16[("Mark Notification SENT")]
  N17[("Mark Notification FAILED")]
  N0 --> N1
  N1 -->|No| N2
  N2 --> N3
  N3 -->|Yes| N4
  N3 -->|No| N14
  N4 -->|Yes| N5
  N4 -->|No| N15
  N5 --> N6
  N6 -->|Yes| N10
  N6 -->|No| N7
  N7 -->|Yes| N11
  N7 -->|No| N8
  N8 -->|Yes| N12
  N8 -->|No| N9
  N9 -->|Yes| N1
  N9 -->|No| N13
  N10 -->|Yes| N16
  N10 -->|No| N17
  N11 -->|Yes| N16
  N11 -->|No| N17
  N12 -->|Yes| N16
  N12 -->|No| N17
  N16 --> N1
  N17 --> N1
  N13 --> N1
  N14 --> N1
  N15 --> N1
```

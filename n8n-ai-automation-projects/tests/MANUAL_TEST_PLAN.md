# Manual End-to-End Test Plan

The offline tests in [TEST_REPORT.md](TEST_REPORT.md) cover Code-node logic and graph wiring only. Run these cases in a real n8n instance with **test accounts and fictional data**, then fill in the Result column and keep screenshots of each execution. Never use real customer, student or candidate data in screenshots.

**Status:** not executed yet. Results below must be filled in by the repository owner.

## 1. Order Tracking Workflow (Postman or curl, test URL first)

Prepare: Crypto credential with a test secret; Apps Script test deployment (or a stub returning `{ "ok": true, "tracker_url": "https://example.com/t/1" }`); Gmail test account. Use `order-tracking-workflow/samples/sample-webhook-payload.json` as the body (re-sign it with your own test secret).

| # | Case | Input | Expected | Result |
|---|---|---|---|---|
| O1 | **Success** | Topic `order.processing`, valid signature, Apps Script returns ok | Row registered, email received with tracking link, HTTP 200 | |
| O2 | Ignored topic | Header `x-wc-webhook-topic: order.created` | Immediate "ignored" response, no email, no sheet write | |
| O3 | **Failure: bad signature** | Change one character of the body, keep old signature | HTTP 401, no sheet write, no email, failure logged | |
| O4 | **Failure: upstream error** | Apps Script returns `{ "ok": false }` or HTTP 500 | HTTP 401 path, no customer email, failure logged | |
| O5 | Missing `status_step` | Payload without it | `status_step` = 1 in the Apps Script request | |
| O6 | Duplicate delivery | Send O1 twice | Documented limitation: second email is sent. Record actual behaviour | |
| O7 | Invalid-signature log values | Run O3 and open `Build Failure Log` | Check whether references to not-yet-run nodes cause an error (documented risk) | |

## 2. HSE Incident Weekly Analysis

Prepare: Outlook test mailbox with 3 to 5 fictional incident emails from the configured sender, Gemini and OpenRouter keys, Gmail test account. Use the **Manual Test Trigger**.

| # | Case | Expected | Result |
|---|---|---|---|
| H1 | **Success** with 3 to 5 emails | HTML report received; counts match the emails; schema validated | |
| H2 | **Empty week** (no emails from sender) | "No incidents" email, agent not called | |
| H3 | Email from a different sender | Ignored by the sender filter | |
| H4 | **Failure: wrong Gemini key** | Fallback to OpenRouter produces the report, or error email arrives | |
| H5 | **Failure: Outlook credential removed** | Error alert email with workflow name, failed node, execution link | |
| H6 | Email with `<script>` text in body | Report shows it as plain text | |
| H7 | Report with missing fields in emails | Fields shown as "Not specified", nothing invented | |

## 3. AI Recruitment Assistant

Prepare: test form, test spreadsheet with the tabs from the README, Telegram test bot and chat, Gmail test account, Gemini key.

| # | Case | Expected | Result |
|---|---|---|---|
| R1 | **Success** new application | Sheet row with level and `Pending`; Telegram message with two buttons | |
| R2 | Duplicate email | Duplicate alert, no new row, no AI call | |
| R3 | **Accept** tap | Acceptance email; status `Accepted` | |
| R4 | **Reject** tap | Rejection email; status `Rejected`; row removed from level tab | |
| R5 | **MID_LEVEL candidate, reject** | Check whether the level-tab lookup fails (known `MID LEVEL` vs `MID_LEVEL` issue) | |
| R6 | Both buttons tapped | Check whether two emails are sent (known limitation) | |
| R7 | Prompt-injection text in the note field | Level is still one of the four values and ignores the instruction | |
| R8 | Long email address | Check whether the buttons still work (64-byte `callback_data` limit) | |

## 4. Students Booking System

Prepare: test form-responses sheet, roster workbook with master tab, `Waiting List`, `settings` (limit set to 2) and one group tab, Telegram test bot.

| # | Case | Expected | Result |
|---|---|---|---|
| S1 | **Success**: new student, group has space | Added to group tab and master roster; confirmation message | |
| S2 | **Duplicate** student number | Duplicate alert; no new rows | |
| S3 | **Group full** (limit 2, two students already) | Student added to `Waiting List`; waiting-list message | |
| S4 | Two rows added at once | Both processed in order, loop returns each time | |
| S5 | **Empty group tab** | Check whether the first student is accepted, or counted as a full seat (possible off-by-one, see TEST_REPORT) | |
| S6 | Google Sheets credential missing | Execution error visible; no partial writes | |
| S7 | Waitlisted student submits again | Not detected as duplicate (known limitation); record behaviour | |

## 5. Other projects (smoke tests)

| # | Case | Expected | Result |
|---|---|---|---|
| A1 | Alexa Assistant: "what is on my calendar tomorrow?" | Uses the calendar tool, no email sent | |
| A2 | Alexa Assistant: "email X" without details | Asks for missing details, does not send | |
| G1 | RAG: upload a new file to the watched Drive folder | Check which file is downloaded (known fixed-file issue) | |
| G2 | RAG: ask a question answered only in the document | Answer grounded in the document | |
| M1 | Multi-agent: ask for a marketing brief | Supervisor calls search then analyst; check SerpApi query is set | |

## Recording results

For each case, note the date, n8n version, pass/fail and a screenshot of the execution. Update the project README status only when a case has actually been run. Do not claim production readiness from synthetic tests.

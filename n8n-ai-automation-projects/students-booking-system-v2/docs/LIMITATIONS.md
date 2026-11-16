# Limitations, security and operational risks

1. **Not ACID.** Google Sheets is not a transactional database. Separate writes can partially succeed; the ledger helps repair them on replay.
2. **Script-scoped locking.** `LockService.getScriptLock()` serializes bookings entering the same Apps Script deployment. Other direct writers and manual spreadsheet edits bypass it.
3. **Not exactly-once Telegram.** Message delivery could succeed while acknowledgement fails; retries can duplicate notifications.
4. **No custom admin authorization layer.** Only Google Sheets/Forms sharing permissions and the API token protect the relevant paths. A separate authorization check would be required before introducing admin operations.
5. **Identity/event limitations.** Generated event IDs based on timestamp and fields are not guaranteed globally unique. The phone-based duplicate rule is a business decision, not universal identity verification.
6. **Scale/performance.** Repeated Google Sheets scans and Apps Script quotas limit scale. A real database could be justified for substantially higher load or critical reservation consistency.
7. **Privacy.** Minimize personal data. Do not post actual parent/student numbers, owner mail addresses, credential references, internal deployment IDs or populated private n8n exports.
8. **Credential hygiene.** Rotate any token that has appeared in a shared export or screenshot. Configure a new private token on the Apps Script side and update n8n's three HTTP nodes. This repository intentionally includes placeholder tokens only.
9. **Testing.** A 50-item sequential batch does not establish simultaneous last-seat behavior or recoverability under injected failure.
10. **No automatic re-submission.** When the engine returns `RETRY` (lock busy, or another unfinished event for the same phone) or `ERROR`, the workflow sends an operations alert and moves to the next item. The trigger does not re-fire for the same row, so recovery means re-submitting the same `event_id` manually.
11. **Personal data in Telegram.** Staff messages contain the student's name and phone number and a WhatsApp link. Use a private chat and restrict who can read it.
12. **Event ID source unverified.** The workflow prefers a source row number but falls back to a timestamp-based ID. Confirm in an execution which one your n8n version produces.

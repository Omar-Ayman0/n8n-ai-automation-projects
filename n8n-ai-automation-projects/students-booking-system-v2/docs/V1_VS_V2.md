# V1 vs V2 — Engineering evolution

[V1 project](../../students-booking-system/README.md) · [V2 README](../README.md)

| Dimension | V1 (original client workflow) | V2 (post-deployment demo upgrade) |
|---|---|---|
| Business context | Small educational center, 500–600 students | Reliability-focused retrospective improvement |
| Operational evidence | Used for 500+ actual registrations, per owner | 50-item synthetic demo run shown in screenshots |
| Data input | Google Form → Google Sheets Trigger | Same |
| Duplicate handling | Lookup student phone in master sheet | Phone lookup plus event-level ledger/replay handling |
| Capacity | Read group row count, compare with `settings` | Capacity checked by Apps Script under script lock |
| Simultaneous reservations | Separate read/write operations; race risk | Serializes requests entering **the same Apps Script deployment**; not a global cross-system transaction |
| Data writes | Separate group and master appends | Ledger-assisted repair of incomplete writes |
| Errors | Limited explicit recovery | Error statuses, replay and operational alerts |
| Telegram | Staff notifications with WhatsApp link | Routed notifications plus SENT/FAILED ledger status |
| Staff experience | Sheets remain human-readable | Existing sheets retained |
| Dependencies | n8n + Google services + Telegram | Adds Apps Script deployment and configuration burden |

## Why V1 was reasonable

The original design prioritized ease of operation for a nontechnical educational center, inexpensive maintenance, a small bounded registration volume, and a short enrollment season. It was not originally intended as a high-concurrency seat inventory system.

## Why V2 was created

The newer design explores risk scenarios that become more important for critical or higher-concurrency systems: overlapping requests for the last seat, retries after uncertain outcomes, duplicate events and partial Google Sheets writes.

**Honesty boundary:** The 50-item demo checks ordinary routing at volume. It does **not** by itself prove concurrent last-seat correctness, atomic multi-sheet transactions or simulated-failure recovery. Those need dedicated evidence before being represented as passed.

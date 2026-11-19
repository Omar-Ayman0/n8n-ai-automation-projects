# Changelog

## 2026-11-20 — Portfolio v3: cleanup, hardening, checks

**Repository**
- Removed duplicate and internal files: `README_V3.md` (identical copy of the root README), `invoice-processing-system/PORTFOLIO-ENTRY.md` (internal instructions), `automated-HR-recruitment-assistant/hr-ai-agent.json` (second export of the same workflow) and `REPOSITORY_CHANGELOG.md` (merged here).
- Fixed 10 broken links to non-existent `assets/diagrams/*.mmd` files. Diagrams remain embedded as Mermaid in each README.
- Root README reduced to three featured projects (Invoice, Booking V2, Certificate) plus a status-labelled table for the rest.
- Added `README.ar.md` (Arabic summary), `scripts/validate-repo.js` and a GitHub Actions workflow that runs it with the three offline test scripts.

**Workflow changes** (checked structurally only; **not re-run in n8n**)
- `supabase-rag-ai-agent`: `Download file` now uses the file ID from the Drive trigger; added a Recursive Character Text Splitter (1000/150); `source_file` metadata; prompt now refers to Supabase and requires grounded answers; `topK = 4`.
- `alexa-assistant-v2`: added `Authorized User?` allow-list before the agent; reply goes to the sender's chat; prompt gained deletion-confirmation and untrusted-content rules.
- `multi-agent-patterns`: added `Authorized User?` allow-list before the supervisor.
- `automated-HR-recruitment-assistant`: added `Authorized Recruiter?` check on the Telegram button callback.

**Verification run on this revision**
- `scripts/validate-repo.js`: all checks pass (JSON validity, node wiring, placeholder credentials, secret heuristics, relative links).
- Offline tests: Booking V2 27/27, Certificate 32/32, Invoice 10/10. These are local logic tests, not n8n executions.

## 2026-11-19 — Portfolio v2

- Replaced the root landing page with a portfolio-oriented README and navigation.
- Added a project index and contribution guidance.
- Consolidated a nested duplicate repository copy into the canonical structure; original workflow exports preserved.

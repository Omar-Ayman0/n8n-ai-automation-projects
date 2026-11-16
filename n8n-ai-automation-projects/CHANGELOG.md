# Changelog

## 2026-11-17 — Consistency and completeness pass

Workflow exports, `Code.gs` and all sample data are unchanged. Only documentation, tests and repository hygiene were touched.

### Added
- Root README: **Intelligent Invoice Processing System** and **Students Booking System V2** (featured sections, diagrams, directory rows), OCR.space and Apps Script `LockService` in the skills and stack lists, idempotency and deterministic-validation concepts, a three-script testing table, and an updated structure tree.
- `students-booking-system-v2/tests/run-engine-tests.js` and `OFFLINE_TEST_REPORT.md`: 27 offline checks that run `Code.gs` unmodified against in-memory fakes (validation, duplicates, capacity, replay, partial-write repair) and the workflow's two Code nodes. Not a real Apps Script run and not a concurrency test.
- `tests/run-code-node-tests.js`: graph checks now cover all nine workflows (46 checks; invoice and V2 added).
- `students-booking-system-v2/docs/ARCHITECTURE.md`, a placeholder table in `docs/SETUP.md`, and three new limitations in `docs/LIMITATIONS.md`.
- `docs/PROJECT_README_TEMPLATE.md` so future projects match the existing 12-section format.
- `.gitignore`: `*.private.json`, `*.configured.json`, `node_modules/`.

### Changed
- `students-booking-system-v2/README.md` rewritten into the same 12-section format as the other projects (it previously used a different structure and had no link back to the portfolio). Its link to V1 is now a relative link.
- `invoice-processing-system/README.md`: canvas screenshot moved into section 1 like the other projects; removed the reference to `PORTFOLIO-ENTRY.md`.
- `students-booking-system/README.md`: points to V2 in limitations and status.
- Root README wording for V1 production use now says "author-reported", matching the V1 README.

### Removed from the repository (kept separately for approval)
- `Portfolio_README_Updated_with_Students_Booking_V2.md`: an older alternate root README whose content is now in `README.md`.
- `invoice-processing-system/PORTFOLIO-ENTRY.md`: instructions to paste the invoice entry into the root README, which has been done.

### Left as-is, needs a decision
- `automated-HR-recruitment-assistant/hr-ai-agent.json` is a second, slightly different export of the same workflow (the project README already says to keep one canonical file).
- Two sticky notes inside the V2 workflow JSON mention a file name (`Booking_Engine_Google_Apps_Script.gs`) and "disabled original nodes" that do not match the public export.

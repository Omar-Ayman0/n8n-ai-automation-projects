# Repository Change Report

**Prepared:** 2026-11-19  
**Source archive:** `n8n-ai-automation-projects-main (3).zip`

## Summary

The repository has been consolidated into one canonical project tree, with a new portfolio landing page, project index, contribution guide and architecture diagram sources. Existing project folders and project-level documentation were retained.

## Reorganization

- Removed the nested `n8n-ai-automation-projects/` duplicate repository after comparing it with the top-level project tree.
- Removed the redundant root-level `Certificate_Automation_README.md`; its canonical and more complete case study remains under `certificate-automation-system/README.md`.
- Replaced the old root README (which was a certificate case study rather than a portfolio landing page) with the repository portfolio overview.
- All workflow JSON exports in that nested copy had matching top-level counterparts with identical content.
- Preserved unique nested documentation assets by moving the project README template and V2 booking engine test runner / architecture document into the canonical locations.
- Retained the root project folders, samples, screenshots, test scripts, test reports and the existing `LICENSE`.

## Documentation added or refreshed

- Replaced the root landing page with an engineering portfolio README.
- Added `PROJECTS_INDEX.md`, `CHANGELOG.md` and `CONTRIBUTING.md`.
- Added a reusable project README template under `docs/guides/`.
- Added architecture diagram links to the Invoice Processing, HR Recruitment, Supabase RAG, Multi-Agent, Students Booking V1 and Order Tracking project READMEs.

## Diagrams created

- `assets/diagrams/portfolio-ecosystem.mmd`
- `assets/diagrams/invoice-processing-system.mmd`
- `assets/diagrams/automated-HR-recruitment-assistant.mmd`
- `assets/diagrams/supabase-rag-ai-agent.mmd`
- `assets/diagrams/multi-agent-patterns.mmd`
- `assets/diagrams/students-booking-system.mmd`
- `assets/diagrams/order-tracking-workflow.mmd`

Project diagrams are generated from the corresponding exported workflow nodes and connections; sticky-note nodes are omitted for readability. They are source `.mmd` files that GitHub can render when embedded in Markdown.

## Preserved files

- All top-level project directories and their original project-level workflow exports.
- Project assets, screenshots, samples, Apps Script source, tests and reports.
- Existing MIT `LICENSE` and the original project-specific content.
- All original n8n workflow JSON files remained byte-for-byte unchanged (see validation below).

## Validation and remaining issues

- Workflow JSON hashes were captured before and compared after the changes.
- Internal relative Markdown links were checked where they resolve to repository files.
- Mermaid source was reviewed structurally; no external Mermaid renderer was available in this run, so rendering on GitHub remains the final visual check.
- Secrets scan is heuristic and cannot guarantee that every credential is absent. Review any flagged original workflow manually before making the repository public.
- Offline test scripts were run: repository checks **44/44 passed**, certificate checks **32/32 passed**, invoice checks **10/10 passed**, and Students Booking V2 engine checks **27/27 passed**. These are local/offline checks only.
- External integrations were not executed; no end-to-end workflow test is claimed.
- The source archive included an existing MIT license, which was preserved rather than replaced.

# Project README template

Every project folder uses the same 12-section README so the repository reads consistently. Copy this skeleton, then replace each hint with facts taken from the workflow file. Do not describe behavior the export does not show, and mark anything untested as untested.

````markdown
# Project Name

[← Back to portfolio](../README.md)

## 1. Project Overview
2–4 sentences: what the system does, trigger, main services. Add the workflow canvas screenshot here.
State context honestly (team project, training project, author-reported production use).

## 2. Business Problem
The real problem and who has it.

## 3. Proposed Solution
How the workflow addresses it, in a short paragraph or numbered list.

## 4. System Architecture
A Mermaid flowchart that matches the node connections in the export.

## 5. Key Features
Bullets. Each one must be visible in the export or code.

## 6. Technology Stack
Table: tool, what it is used for. Only tools actually used.

## 7. Workflow Execution
Numbered stages using the real node names. Add request/response shapes if the project has an API.

## 8. Project Structure
A text tree of the folder, including `samples/`, `docs/` or `tests/` when present.

## 9. Installation & Configuration
Accounts needed, import steps, credentials by name, and a table of every placeholder with where to replace it.
Never include real secrets, IDs or URLs.

## 10. Screenshots & Demonstrations
Screenshots with a note on whether the data is synthetic. Link to `samples/` if present.

## 11. Limitations & Future Improvements
Known issues found by reading the export or running tests, then realistic improvements.

## 12. Project Status
One honest paragraph: what was exported, tested or demonstrated, and what is not claimed.
````

## Checklist before committing

- [ ] `workflow.json` imports and is inactive; no credentials, tokens, chat IDs, real sheet IDs or deployment URLs.
- [ ] All README links and images resolve.
- [ ] The architecture diagram matches the node connections.
- [ ] The project is listed in the root README (featured section and directory table) and in its structure tree.
- [ ] Screenshots contain no real personal data.
- [ ] Claims about production use, metrics or testing have evidence in the repository, or are labeled author-reported.

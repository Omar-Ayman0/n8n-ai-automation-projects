# Omar Ayman Fathi — AI Automation Engineering Portfolio

**AI Automation Engineer | n8n Workflow Automation | API Integrations**

A curated collection of n8n workflows covering AI agents, RAG, human-in-the-loop approvals, document extraction, signed-webhook integrations and business-process automation. Each project folder contains the importable workflow export, an architecture diagram and documentation of the design, setup, limitations and status.

![n8n](https://img.shields.io/badge/n8n-workflow%20automation-EA4B71?style=flat-square)
![AI Agents](https://img.shields.io/badge/AI-agents%20%26%20RAG-1F3A5F?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

## About

I am a Computer Science student at Kafr El-Sheikh University (Egypt) and an early-career AI Automation Engineer. I design n8n workflows, integrate REST APIs and business systems, and apply LLMs and AI agents to operational problems. I work as a freelance automation consultant and am an AI Automation trainee and team lead in the Digital Egypt Pioneers Initiative (DEPI).

**Open to:** junior AI automation and n8n developer roles, workflow automation and AI integration positions, technical internships, AI and automation scholarships, and freelance automation projects.

**What this repository shows:** hands-on workflow architecture, AI agent design with prompt-level safeguards, human-in-the-loop decisions, webhook security, data-handling logic in JavaScript, and honest documentation of known limitations.

## Technical Skills

| Area | Demonstrated in this repository |
|---|---|
| Workflow automation | n8n, schedule and webhook triggers, Google Sheets and Drive triggers, error-handling paths, retries, loops, idempotent event processing |
| AI and LLMs | AI Agent nodes, tool-calling agents, multi-agent (supervisor) design, structured output parsing, model fallback, Google Gemini, OpenRouter, prompt design, OCR plus LLM extraction |
| RAG | Supabase vector store, embeddings, retrieval-as-tool, Drive-triggered ingestion |
| APIs and integrations | Telegram Bot API, Gmail, Google Sheets, Google Drive, Google Calendar, Microsoft Outlook, Airtable, SerpApi, WooCommerce webhooks, Google Apps Script web apps (including `LockService`), OCR.space, HMAC signature verification |
| Programming | JavaScript (n8n Code nodes, Apps Script, Node.js offline tests), regular expressions |

Further skills (such as Python) are listed on my CV and are not part of the workflows in this repository.

## Featured Projects

### 1. HSE Incident Weekly Analysis — Team Project

> Developed collaboratively by a team; see the [Team & Collaboration](hse-incident-weekly-analysis/README.md#team--collaboration) section. It is not presented as individual work.

- **Business problem:** HSE managers compile weekly incident summaries by hand from notification emails.
- **Solution:** A scheduled n8n workflow reads a week of Outlook incident emails, has an AI agent extract severity, root causes and trends into a validated JSON schema, and emails an HTML report every Monday at 08:00 (Cairo time).
- **Key features:** Gemini primary model with OpenRouter fallback; Outlook tools for the agent; structured output parser; HTML-escaped report; "no incidents" heartbeat email; dedicated error-alert path.
- **Technologies:** n8n, Google Gemini, OpenRouter, Microsoft Outlook, Gmail, JavaScript.

```mermaid
flowchart LR
    A["Schedule<br/>Mon 08:00"] --> B["Outlook<br/>last 7 days"] --> C["Clean and<br/>prepare"] --> D{"Any<br/>incidents?"}
    D -- "No" --> E["No-incidents<br/>email"]
    D -- "Yes" --> F["AI Agent<br/>structured output"] --> G["HTML report"] --> H["Gmail"]
```

![HSE workflow canvas](hse-incident-weekly-analysis/assets/n8n-workflow-canvas.png)

**[Read the full case study →](hse-incident-weekly-analysis/README.md)** · [Sample report (demo data)](hse-incident-weekly-analysis/samples/README.md)

---

### 2. Order Tracking Workflow

- **Business problem:** Small online stores need to send customers a tracking link without exposing their back office, and a public webhook must reject forged requests.
- **Solution:** A WooCommerce webhook triggers an n8n workflow that verifies the HMAC signature, registers the order through a Google Apps Script web app and emails the customer a tracking URL.
- **Key features:** raw-body HMAC verification, topic filtering, input sanitisation, explicit upstream result check, logged failure path with a 401 response.
- **Technologies:** n8n, Webhooks, Crypto (HMAC), Google Apps Script, Google Sheets, Gmail.
- **Context:** built in the DEPI AI Automation track and tested with Postman-simulated webhooks.

```mermaid
flowchart LR
    A["WooCommerce<br/>webhook"] --> B{"Topic =<br/>order.processing?"}
    B -- "No" --> X["Respond: Ignored"]
    B -- "Yes" --> C{"HMAC<br/>valid?"}
    C -- "Yes" --> D["Sanitize and<br/>update sheet"] --> E["Email tracking link"] --> F["200 OK"]
    C -- "No" --> G["Log failure"] --> H["401"]
```

![Order tracking workflow canvas](order-tracking-workflow/assets/n8n-workflow-canvas.png)

**[Read the full case study →](order-tracking-workflow/README.md)** · [Demo package (synthetic data)](order-tracking-workflow/samples/README.md)

---

### 3. AI Recruitment Assistant

- **Business problem:** Recruiters spend time on duplicate checks, sorting candidates by seniority and standard replies.
- **Solution:** Applications from a form are checked for duplicates, classified by a Gemini agent into four seniority levels, stored in Google Sheets, and sent to the recruiter on Telegram with Accept and Reject buttons. A button tap triggers the email and status update.
- **Key features:** strict JSON output from the model, prompt-injection-aware instructions, duplicate protection, human-in-the-loop decision, status lifecycle.
- **Technologies:** n8n, Google Gemini, Google Sheets, Telegram Bot API, Gmail, JavaScript.

```mermaid
flowchart LR
    A["Application<br/>form"] --> B{"Duplicate<br/>email?"}
    B -- "Yes" --> N["Telegram alert"]
    B -- "No" --> C["Gemini agent<br/>classify level"] --> D["Google Sheets"] --> E["Telegram<br/>Accept / Reject"]
    E --> F["Gmail +<br/>status update"]
```

![HR workflow canvas](automated-HR-recruitment-assistant/assets/n8n-workflow-canvas.png)

**[Read the full case study →](automated-HR-recruitment-assistant/README.md)**

---

### 4. Students Booking System

- **Business problem:** A tutoring center handled registrations manually, checking duplicates and group capacity by hand.
- **Solution:** New form responses trigger a workflow that detects duplicates, counts seats against a per-group limit, writes the student to the group roster or a waiting list, and notifies staff on Telegram with a prefilled WhatsApp link.
- **Key features:** duplicate detection by student number, per-group seat limits, waiting list, dynamic sheet routing, retries on reads.
- **Technologies:** n8n, Google Sheets, Telegram Bot API, JavaScript.
- **Production use:** used at a tutoring center; 500+ registrations and delivery within 30 days are author-reported.

```mermaid
flowchart LR
    A["New form row"] --> B{"Duplicate?"}
    B -- "Yes" --> N["Duplicate alert"]
    B -- "No" --> C{"Group<br/>full?"}
    C -- "Yes" --> W["Waiting list"] --> M["Telegram"]
    C -- "No" --> R["Group roster +<br/>master roster"] --> M
```

![Students booking workflow canvas](students-booking-system/assets/students-booking-system.png)

**[Read the full case study →](students-booking-system/README.md)**

---

### 5. Intelligent Invoice Processing System

- **Business problem:** Manual invoice entry and review are repetitive, while OCR and LLM output can still contain financial errors.
- **Solution:** An authenticated webhook receives a PDF or image invoice, extracts text (PDF text layer first, OCR fallback), has Gemini return structured fields, validates them with JavaScript rules, and asks a human to approve flagged invoices by email before writing to Google Sheets.
- **Key features:** hybrid text extraction, schema-based LLM output, deterministic validation independent of model confidence, Gmail human-in-the-loop review, status-based ledger routing.
- **Technologies:** n8n, OCR.space, Google Gemini, JavaScript, Gmail, Google Sheets.
- **Context:** built in the DEPI AI Automation track; shown with a recorded demo of a scanned test invoice. Prototype, not a deployed product.

```mermaid
flowchart LR
    A["POST /invoice-intake<br/>header auth"] --> B{"File type?"}
    B -- "PDF with text" --> C["Normalize text"]
    B -- "Image or scanned PDF" --> O["OCR.space"] --> C
    C --> D["Gemini<br/>structured output"] --> E["JS validation<br/>and flags"]
    E --> F{"Needs review?"}
    F -- "Yes" --> G["Gmail Send and Wait<br/>Approve / Reject"] --> H["Ledger sheets"]
    F -- "No" --> H
```

![Invoice workflow canvas](invoice-processing-system/assets/n8n-workflow-canvas.png)

**[Read the full case study →](invoice-processing-system/README.md)**

---

### 6. Students Booking System V2 — Reliability Upgrade

- **Business problem:** The V1 booking flow reads and writes sheets in separate steps, so overlapping requests for the last seat and partial write failures are possible.
- **Solution:** A later demo that moves the booking decision into a Google Apps Script web app guarded by a script lock, with an idempotency ledger so replayed events do not book twice and unfinished writes can be repaired.
- **Key features:** locked booking decision, per-event ledger (`PROCESSING` / `DONE`), duplicate and capacity checks, notification `SENT` / `FAILED` tracking, three alert paths.
- **Technologies:** n8n, Google Apps Script, Google Sheets, Telegram Bot API, JavaScript.
- **Context:** an improvement of V1, **not** the version deployed to the client. Evidence: a 50-item synthetic demo run and offline logic tests. Concurrency and real failure-recovery tests are still pending and are listed openly.

```mermaid
flowchart LR
    A["Form response"] --> B["n8n: normalize<br/>and validate"] --> C["Apps Script<br/>script lock"]
    C --> D{"Decision"}
    D -- "Seat free" --> E["Group + master sheet"]
    D -- "Full" --> F["Waiting list"]
    D -- "Same phone" --> G["Duplicate"]
    C <--> L[("_BookingLedger")]
    E & F & G --> H["Telegram + SENT / FAILED<br/>written to ledger"]
```

![Students booking V2 workflow canvas](students-booking-system-v2/assets/screenshots/workflow-execution.png)

**[Read the full case study →](students-booking-system-v2/README.md)** · [Test report](students-booking-system-v2/docs/TEST_REPORT.md) · [V1 vs V2](students-booking-system-v2/docs/V1_VS_V2.md)

## Project Directory

| # | Project | Also known as | Folder | What it demonstrates | Highlight |
|---|---|---|---|---|---|
| 1 | HSE Incident Weekly Analysis | HSE Incident Weekly Analysis — Team Project | [hse-incident-weekly-analysis](hse-incident-weekly-analysis/) | Scheduled AI analysis, structured output, model fallback, error handling | **Team project** · AI-generated weekly HTML reports |
| 2 | Order Tracking Workflow | Order Tracking Workflow | [order-tracking-workflow](order-tracking-workflow/) | Webhook security (HMAC), Apps Script integration, transactional email | HMAC-verified webhook · DEPI project |
| 3 | AI Recruitment Assistant | AI-Driven HR Recruitment & Candidate Evaluation System | [automated-HR-recruitment-assistant](automated-HR-recruitment-assistant/) | LLM classification, human-in-the-loop via Telegram | Human-in-the-loop approvals via Telegram |
| 4 | Students Booking System | Student Booking Automation System | [students-booking-system](students-booking-system/) | Sheet-driven registration logic, capacity limits, waiting list | Used in production (500+ registrations, author-reported) |
| 5 | Intelligent Invoice Processing System | Invoice OCR with Human-in-the-Loop Validation | [invoice-processing-system](invoice-processing-system/) | Hybrid extraction, structured LLM output, deterministic validation | Human-in-the-loop invoice review · DEPI project |
| 6 | Students Booking System V2 | Reliability Upgrade of the Booking System | [students-booking-system-v2](students-booking-system-v2/) | Idempotency ledger, script-locked booking engine, repairable writes | Offline-tested logic · concurrency tests pending |
| 7 | Alexa Assistant V2 | Executive AI Assistant | [alexa-assistant-v2](alexa-assistant-v2/) | Tool-calling agent (Gmail, Calendar, SerpApi, Airtable) | 17 integrated tools |
| 8 | Supabase RAG AI Agent | RAG Knowledge Base & AI Chatbot | [supabase-rag-ai-agent](supabase-rag-ai-agent/) | RAG with a Supabase vector store, Drive-triggered ingestion | Vector retrieval pipeline |
| 9 | Multi-Agent Patterns | Marketing Intelligence Multi-Agent System | [multi-agent-patterns](multi-agent-patterns/) | Supervisor agent with research and analyst sub-agents | Multi-agent orchestration |

## Engineering Concepts

- **Human in the loop:** AI classifies, a person approves (recruitment assistant).
- **Webhook security:** signature verification on the raw body before any processing (order tracking).
- **Grounded AI:** retrieval-first prompts, "Not specified" for missing data, anti-fabrication instructions (RAG, HSE, multi-agent).
- **Structured output:** JSON schemas and strict output formats so downstream nodes stay predictable.
- **Agent design:** tool-calling agents, supervisor and sub-agent separation of duties, bounded iterations.
- **Resilience:** retries, fallback models, heartbeat emails and error-alert paths.
- **Idempotency and recovery:** a per-event ledger so a replayed event does not book twice and a partial write can be repaired (students booking V2).
- **Deterministic validation:** business rules decide what needs review, not the model's own confidence (invoice processing).
- **Data hygiene:** sanitising inputs, escaping HTML, treating user content as untrusted in prompts.

## Technology Stack

n8n · Google Gemini · OpenRouter · Supabase (vector store) · Telegram Bot API · Gmail · Google Sheets · Google Drive · Google Calendar · Google Apps Script · OCR.space · Microsoft Outlook · Airtable · SerpApi · WooCommerce webhooks · JavaScript · Node.js (offline tests)

## Repository Structure

```text
.
├── README.md
├── LICENSE
├── tests/                              # offline logic tests + manual test plan
├── docs/                               # project README template
├── hse-incident-weekly-analysis/       # team project
├── order-tracking-workflow/
├── automated-HR-recruitment-assistant/
├── students-booking-system/
├── students-booking-system-v2/         # reliability upgrade, own docs/ and tests/
├── invoice-processing-system/          # own samples/ and tests/
├── alexa-assistant-v2/
├── supabase-rag-ai-agent/
└── multi-agent-patterns/
    └── multi-agent-system/
```

Each project folder contains `README.md`, the workflow export (`workflow.json`; for V2 `workflow/students-booking-v2.public.json`) and an `assets/` folder with screenshots. Some projects add `samples/`, `docs/` or `tests/`. New projects should follow the [README template](docs/PROJECT_README_TEMPLATE.md).

## Testing

Three offline test scripts run with plain Node.js (no dependencies):

| Command | Covers | Report |
|---|---|---|
| `node tests/run-code-node-tests.js` | Code nodes and workflow wiring of all nine workflows | [TEST_REPORT](tests/TEST_REPORT.md) |
| `node invoice-processing-system/tests/run-code-node-tests.js` | Invoice normalization, validation and routing | printed to console |
| `node students-booking-system-v2/tests/run-engine-tests.js` | V2 booking engine (`Code.gs` against in-memory fakes) and its Code nodes | [OFFLINE_TEST_REPORT](students-booking-system-v2/tests/OFFLINE_TEST_REPORT.md) |

The offline tests use synthetic data and are not n8n or Apps Script executions, and they cannot test simultaneous requests. A manual end-to-end test plan is in [MANUAL_TEST_PLAN](tests/MANUAL_TEST_PLAN.md).

## Setup and Usage

1. Open a project folder and read its README (overview, architecture, limitations).
2. In n8n, choose **Import from File** and select the project's `workflow.json` (for multi-agent patterns, `multi-agent-system/workflow.json`; for V2, `workflow/students-booking-v2.public.json` plus the Apps Script in `apps-script/Code.gs`).
3. Create the credentials named in the project README. **No secrets are included in this repository.**
4. Replace placeholder values (`YOUR_...`, `REPLACE_WITH_YOUR_CREDENTIAL`, `example.com` addresses) with your own.
5. Run a manual or test execution before activating.

These workflows are exported examples, not packaged products. Each README lists known limitations and the project's status; review them before any real use.

## Contact

- LinkedIn: [linkedin.com/in/omar-ayman-2a2182390](https://www.linkedin.com/in/omar-ayman-2a2182390)
- GitHub: [github.com/Omar-Ayman0](https://github.com/Omar-Ayman0)
- Email: [omarayman.mail@gmail.com](mailto:omarayman.mail@gmail.com)

## License

Released under the [MIT License](LICENSE).

# Omar Ayman Fathi — AI Automation Engineering Portfolio

**AI Automation Engineer | n8n Workflow Automation | AI Agents | API Integrations**

A collection of documented automation projects spanning AI agents, RAG, human-in-the-loop workflows, signed webhooks, and business-process automation. Projects include implementation details, setup requirements, test evidence, and known limitations.

## About

I am a Computer Science student at Kafr El-Sheikh University, Egypt, and an early-career AI Automation Engineer. I build workflows with n8n, connect business applications through APIs and webhooks, and use JavaScript and AI tools to automate operational processes.

I have worked on freelance automation projects and trained in AI Automation through the Digital Egypt Pioneers Initiative (DEPI).

**Areas of interest:** AI Automation · AI Agents · API Integrations · Workflow Reliability · Business Process Automation

## Featured Projects

### 1. HSE Incident Weekly Analysis — Team Project

A scheduled workflow that processes incident emails and prepares a structured weekly HSE report.

- **Stack:** n8n, Microsoft Outlook, Gemini, OpenRouter, Gmail, JavaScript
- **Concepts:** Scheduled processing, structured AI output, model fallback, error handling
- **Context:** Collaborative team project; not presented as individual work

[Explore project](hse-incident-weekly-analysis/)

### 2. WooCommerce Order Tracking

Automates processing of WooCommerce order events and dispatches a customer-facing tracking link.

- **Stack:** n8n, WooCommerce webhooks, HMAC, Google Apps Script, Google Sheets, Gmail
- **Concepts:** Webhook signature verification, order status filtering, integration and notification handling
- **Context:** DEPI project tested with simulated webhook events

[Explore project](order-tracking-workflow/)

### 3. AI Recruitment Assistant

Processes candidate applications, classifies profiles, and supports human review through Telegram.

- **Stack:** n8n, Gemini, Google Sheets, Telegram, Gmail, JavaScript
- **Concepts:** AI classification, duplicate detection, human-in-the-loop approval

[Explore project](automated-HR-recruitment-assistant/)

### 4. Students Booking System — Original Client Deployment (V1)

A booking and enrollment automation built for an educational center serving approximately **500–600 students**. The system handled **500+ registrations** during the center's enrollment period.

- **Stack:** Google Forms, n8n, Google Sheets, Telegram, JavaScript
- **Capabilities:** Duplicate checks, group capacity checks, waiting lists, dynamic group sheets, and staff notifications
- **Design rationale:** A simple, affordable workflow suitable for a small educational operation and nontechnical users
- **Limitations:** Read-check-write operations were not atomic; cross-sheet writes and notification failures had limited recovery guarantees

[View original client project](students-booking-system/)

### 5. Students Booking System — V2 Reliability Upgrade

A **post-deployment engineering iteration** of the booking system. V2 is a separate demonstration and **was not the version used by the original client**.

The new design retains Google Forms, n8n, Google Sheets, and Telegram while moving seat-allocation decisions to a Google Apps Script booking engine.

**What changed from V1:**

| Engineering concern | V1 | V2 upgrade |
|---|---|---|
| Seat allocation | n8n checks counts, then writes | Google Apps Script `LockService` protects requests through the same deployment |
| Duplicate submissions | Student-number lookup | Student check plus event replay tracking |
| Partial writes | Separate group/master writes | `_BookingLedger` tracks processing and supports retry/repair |
| Notifications | Telegram message after processing | Notification outcomes recorded separately from booking status |
| Observability | Primarily workflow executions | Ledger, status routing, operational alerts |
| Validation | Form-based and workflow logic | Centralized input and settings validation |

**Observed demo:** A batch of **50 synthetic registrations** completed in n8n, producing **26 confirmed, 14 waitlisted, and 10 duplicate** results in approximately **11 minutes 49 seconds**. The intended 10/8 capacity settings were **not applied** in that run, so these results are **not proof** of that particular capacity-threshold test.

**Not yet independently verified:** simultaneous last-seat reservation and injected-failure recovery tests. The Apps Script lock protects only booking requests using the same script deployment; manual edits or other writers are not covered. Google Sheets remains non-transactional.

[Explore V2 architecture, code, screenshots, comparison, and test report](students-booking-system-v2/)  
[Detailed V1 vs. V2 comparison](students-booking-system-v2/docs/V1_VS_V2.md) · [Test report](students-booking-system-v2/docs/TEST_REPORT.md) · [Known limitations](students-booking-system-v2/docs/LIMITATIONS.md)

### 6. Alexa Assistant V2

A tool-calling personal/executive assistant integrated with business and productivity services.

- **Stack:** n8n, AI agents, Gmail, Google Calendar, SerpApi, Airtable
- **Concepts:** Tool selection, agent orchestration, API integrations

[Explore project](alexa-assistant-v2/)

### 7. Supabase RAG AI Agent

A retrieval-augmented assistant that ingests knowledge and retrieves relevant information from a Supabase vector store.

- **Stack:** n8n, Supabase vector store, embeddings, Google Drive
- **Concepts:** Document ingestion, vector search, retrieval grounding

[Explore project](supabase-rag-ai-agent/)

### 8. Multi-Agent Patterns

An AI workflow using supervisor and specialized sub-agents for research and analysis.

- **Stack:** n8n, LLMs, API integrations
- **Concepts:** Supervisor architecture, task delegation, structured outputs

[Explore project](multi-agent-patterns/)

## Project Directory

| Project | Folder | Primary focus |
|---|---|---|
| HSE Incident Weekly Analysis | [`hse-incident-weekly-analysis`](hse-incident-weekly-analysis/) | Scheduled AI reporting |
| WooCommerce Order Tracking | [`order-tracking-workflow`](order-tracking-workflow/) | HMAC-secured webhooks |
| AI Recruitment Assistant | [`automated-HR-recruitment-assistant`](automated-HR-recruitment-assistant/) | Human-in-the-loop approvals |
| Students Booking V1 | [`students-booking-system`](students-booking-system/) | Real client enrollment automation |
| **Students Booking V2** | [`students-booking-system-v2`](students-booking-system-v2/) | **Reliability, idempotency, recovery design** |
| Alexa Assistant V2 | [`alexa-assistant-v2`](alexa-assistant-v2/) | Tool-calling AI assistant |
| Supabase RAG AI Agent | [`supabase-rag-ai-agent`](supabase-rag-ai-agent/) | Retrieval-augmented generation |
| Multi-Agent Patterns | [`multi-agent-patterns`](multi-agent-patterns/) | Agent orchestration |

## Engineering Concepts

- Workflow design, loops, branching, retries, and failure paths
- API and webhook integrations, including raw-body HMAC signature validation
- Human-in-the-loop approvals and status transitions
- Structured LLM outputs, tool use, RAG, and multi-agent orchestration
- Input validation, data hygiene, and HTML escaping
- Booking idempotency, constrained concurrency, and repairable writes (V2 demonstration)

## Technology Stack

**Automation:** n8n, JavaScript, Google Apps Script  
**AI:** Gemini, OpenRouter, AI agents, Supabase vector store  
**Integrations:** Google Workspace, Microsoft Outlook, Telegram Bot API, WooCommerce, Airtable, SerpApi  
**Patterns:** Webhooks, HMAC, human approval, RAG, scheduled jobs, retries and error handling

## Testing and Project Status

Individual project READMEs describe their implementation status, setup, and known limitations. Offline tests, demo executions, and real-client operational history are distinct forms of evidence and should not be conflated.

For the booking system:

- **V1:** Original limited-period deployment; reported 500+ actual registrations.
- **V2:** Later reliability upgrade with documented 50-record synthetic demonstration.
- **V2 pending verification:** Concurrency last-seat test, controlled partial-write failure/recovery, and further capacity-boundary testing.

See the [V2 test report](students-booking-system-v2/docs/TEST_REPORT.md).

## Setup and Usage

1. Open the relevant project folder and read its README.
2. Import the provided workflow JSON into n8n.
3. Configure the required credentials and external services privately.
4. Replace sample identifiers and placeholders, using only synthetic data for demos.
5. Run the documented tests before activating a workflow.

The code and workflow exports are educational/portfolio artifacts and are **not plug-and-play production deployments**. Do not publish configured secrets, tokens, or real customer data.

## Contact

- [GitHub](https://github.com/Omar-Ayman0)
- [LinkedIn](https://www.linkedin.com/in/omar-ayman-2a2182390/)
- Email: omarayman.mail@gmail.com

## License

MIT License — see [LICENSE](LICENSE).

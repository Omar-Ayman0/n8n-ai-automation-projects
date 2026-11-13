# Add to the portfolio README

Copy the following section into the existing root README (do not replace the root README).

### Intelligent Invoice Processing System

- **Business problem:** Manual invoice entry and review are repetitive, while OCR/LLM outputs may contain financial errors.
- **Solution:** An n8n workflow extracts PDF or image invoice data, validates it with JavaScript rules, requests human approval when flagged, and stores the result in Google Sheets.
- **Key features:** PDF text-layer first with OCR fallback, Gemini structured extraction, deterministic validation, Gmail human-in-the-loop review, status-based ledger routing.
- **Technologies:** n8n, OCR.space, Google Gemini, JavaScript, Gmail, Google Sheets.
- **Context:** DEPI AI Automation training project; recorded demo with a scanned test invoice.

[Read the full case study →](invoice-processing-system/README.md)

## Project Directory row

```markdown
| 8 | Intelligent Invoice Processing System | OCR System | [invoice-processing-system](invoice-processing-system/) | Hybrid extraction, structured LLM output, deterministic validation | Human-in-the-loop invoice review · DEPI project |
```

Add `invoice-processing-system/` to the root repository structure tree. The project folder already contains the workflow, case study, samples and tests.

# Contributing and Documentation Guide

This repository is a personal engineering portfolio. Changes should improve clarity without overstating project scope or altering workflow behavior.

## Documentation standards

- Keep one primary `README.md` per project.
- Describe only features supported by the workflow export, code, screenshots or recorded test evidence.
- Identify team, guided, tutorial-based and independent contributions accurately.
- Separate observed results from assumptions and planned improvements.
- Document missing setup details instead of inventing credentials, IDs or configuration values.
- Keep diagrams synchronized with workflow node and connection definitions.

## Workflow safety

- Treat exported n8n workflow JSON files as read-only portfolio artifacts unless a deliberate workflow change is intended.
- Never commit credentials, API keys, access tokens or private data.
- Use placeholders and environment-specific configuration outside public workflow exports.
- Do not claim a workflow was tested end-to-end unless external services and credentials were actually exercised.

## Pull request checklist

- [ ] Project README reflects current implementation.
- [ ] Relative links and image references resolve.
- [ ] Mermaid diagrams render on GitHub.
- [ ] No secrets or private personal data are introduced.
- [ ] Workflow JSON changes are intentional and reviewed.
- [ ] Test claims identify their scope and limitations.

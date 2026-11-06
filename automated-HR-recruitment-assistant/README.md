# More Experiments

Smaller workflows that are not documented as full projects.

**HR AI Agent** ([hr-ai-agent.json](hr-ai-agent.json)): a job application form (Data Analyst role) checks for duplicate applicants by email in Google Sheets, has a Gemini agent classify each candidate as JUNIOR, MID_LEVEL, SENIOR or EXPERT, records them in an all-candidates sheet and a level-specific sheet, and sends the HR a Telegram message with Accept and Reject buttons. A second Telegram-triggered flow handles the button press: it sends an acceptance or rejection email through Gmail, updates the candidate's status in the sheet, and removes rejected candidates from the level sheet. Tools: n8n, Google Gemini, Google Sheets, Telegram, Gmail.

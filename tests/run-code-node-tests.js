#!/usr/bin/env node
/**
 * Offline logic tests for the Code nodes and graph wiring of the n8n workflows.
 *
 * What this is:  the JavaScript from each workflow's Code node is extracted READ-ONLY from
 *                workflow.json and executed with mocked n8n helpers ($json, $input, $, $items, $node).
 *                Graph tests check that success and failure paths are wired to the expected end nodes.
 * What this is NOT: an n8n execution. Triggers, credentials, Gmail/Telegram/Sheets/AI nodes
 *                are not run. See MANUAL_TEST_PLAN.md for the real end-to-end tests.
 *
 * Usage: node tests/run-code-node-tests.js   (writes tests/TEST_REPORT.md)
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const load = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const code = (wf, name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;
const results = [];
function test(group, name, fn) {
  try { const note = fn(); results.push({ group, name, ok: true, note: note || '' }); }
  catch (e) { results.push({ group, name, ok: false, note: e.message }); }
}
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const run = (src, env) => new Function('$json', '$input', '$', '$node', '$items', src)(env.$json, env.$input, env.$, env.$node, env.$items);

function reach(wf, from) {
  const seen = new Set([from]), q = [from];
  while (q.length) { const n = q.shift(); const c = wf.connections[n] || {};
    for (const t of Object.values(c)) for (const outs of t) for (const x of outs) if (!seen.has(x.node)) { seen.add(x.node); q.push(x.node); } }
  return seen;
}
function validGraph(wf) {
  const names = new Set(wf.nodes.map((n) => n.name));
  for (const [s, c] of Object.entries(wf.connections)) { ok(names.has(s), 'unknown source ' + s);
    for (const t of Object.values(c)) for (const outs of t) for (const x of outs) ok(names.has(x.node), 'unknown target ' + x.node); }
}

// ---------- Graph tests (all workflows) ----------
const files = { 'HSE': 'hse-incident-weekly-analysis/workflow.json', 'Order Tracking': 'order-tracking-workflow/workflow.json',
  'HR': 'automated-HR-recruitment-assistant/workflow.json', 'Students': 'students-booking-system/workflow.json',
  'Alexa': 'alexa-assistant-v2/workflow.json', 'RAG': 'supabase-rag-ai-agent/workflow.json', 'Multi-agent': 'multi-agent-patterns/multi-agent-system/workflow.json' };
const W = {}; for (const [k, f] of Object.entries(files)) W[k] = load(f);
for (const k of Object.keys(W)) test('Graph', k + ': JSON parses, all connections point to existing nodes', () => { validGraph(W[k]); return W[k].nodes.length + ' nodes'; });

test('Graph', 'Order Tracking: invalid signature path ends at "Respond: Unauthorized"', () => {
  const sv = W['Order Tracking'].connections['Signature Valid?'].main; ok(reach(W['Order Tracking'], sv[1][0].node).has('Respond: Unauthorized')); });
test('Graph', 'Order Tracking: failed sheet update path ends at "Respond: Unauthorized"', () => {
  const us = W['Order Tracking'].connections['Update Successful?'].main; ok(reach(W['Order Tracking'], us[1][0].node).has('Respond: Unauthorized')); });
test('Graph', 'Order Tracking: success path reaches email and "Respond: Success"', () => {
  const r = reach(W['Order Tracking'], 'Order Webhook'); ok(r.has('Send Tracking Email') && r.has('Respond: Success')); });
test('Graph', 'Order Tracking: non-processing topic is answered by "Respond: Ignored"', () => {
  const t = W['Order Tracking'].connections['Is Order Processing?'].main; eq(t[1][0].node, 'Respond: Ignored'); });
test('Graph', 'Order Tracking: HMAC check happens before the sheet update and the email', () => {
  const r = reach(W['Order Tracking'], 'Calculate HMAC Signature'); ok(r.has('Update Tracking Sheet') && r.has('Send Tracking Email'));
  const pre = W['Order Tracking'].connections['Order Webhook'].main[0][0].node; ok(pre === 'Is Order Processing?'); });
test('Graph', 'HSE: empty-week branch sends the no-incidents email; incident branch reaches the report email', () => {
  const m = W['HSE'].connections['Any Incidents?'].main; eq(m[1][0].node, 'Send No Incidents Email'); ok(reach(W['HSE'], m[0][0].node).has('Send Incident Analysis'));
  eq(W['HSE'].connections['Error Trigger'].main[0][0].node, 'Gmail: Error Alert'); });
test('Graph', 'Students: duplicate -> Duplicate Message; full group -> Waiting List; seat free -> group + master roster + confirmation', () => {
  const S = W['Students'].connections;
  eq(S['Duplicated Or Not?'].main[0][0].node, 'Duplicate Message');
  eq(S['Have A Seat Or Not?'].main[0][0].node, 'Add Student To Waiting List');
  const r = reach(W['Students'], S['Have A Seat Or Not?'].main[1][0].node);
  ok(r.has('Append Student in Group') && r.has('Append Student in Duplicate Sheet') && r.has('Conformation Message')); });

// ---------- Order Tracking ----------
const OT = W['Order Tracking'];
const sanitize = (item) => run(code(OT, 'Sanitize Data'), { $json: item })[0].json;
test('Order Tracking', 'Sanitize: valid order -> clean fields, status_step defaults to 1', () => {
  eq(sanitize({ order_id: 10482, customer_name: 'Sample Customer', customer_email: 'sample.customer@example.com' }),
    { order_id: '10482', customer_name: 'Sample Customer', status_step: 1, customer_email: 'sample.customer@example.com', secret: '' }); });
test('Order Tracking', 'Sanitize: line breaks and repeated spaces in the name are removed', () => {
  eq(sanitize({ order_id: 1, customer_name: '  Sample \n  Customer\r\n ', customer_email: 'a@example.com' }).customer_name, 'Sample Customer'); });
test('Order Tracking', 'Sanitize: non-numeric status_step falls back to 1', () => {
  eq(sanitize({ order_id: 1, customer_name: 'A', customer_email: 'a@example.com', status_step: 'abc' }).status_step, 1); });
test('Order Tracking', 'Sanitize: line break in email is stripped (header-injection style input)', () => {
  eq(sanitize({ order_id: 1, customer_name: 'A', customer_email: 'a@example.com\nBcc: x@example.com' }).customer_email, 'a@example.comBcc: x@example.com');
  return 'Note: the line break is removed but the text after it is kept; the value is not validated as an email address.'; });
const hmac = (secret, raw) => crypto.createHmac('sha256', secret).update(raw).digest('base64');
const RAW = '{"id":10482,"status":"processing","customer":{"name":"Sample Customer","email":"sample.customer@example.com"}}';
test('Order Tracking', 'Signature (algorithm check): correct secret and body -> match', () => { ok(hmac('DEMO_SECRET_NOT_REAL', RAW) === hmac('DEMO_SECRET_NOT_REAL', RAW)); });
test('Order Tracking', 'Signature (algorithm check): tampered body -> mismatch', () => { ok(hmac('DEMO_SECRET_NOT_REAL', RAW) !== hmac('DEMO_SECRET_NOT_REAL', RAW.replace('10482', '10483'))); });
test('Order Tracking', 'Signature (algorithm check): wrong secret -> mismatch', () => { ok(hmac('DEMO_SECRET_NOT_REAL', RAW) !== hmac('WRONG', RAW)); });
test('Order Tracking', 'Signature: the workflow node is configured as base64 HMAC on binary (raw) data', () => {
  const c = OT.nodes.find((n) => n.name === 'Calculate HMAC Signature').parameters; eq([c.action, c.encoding, c.binaryData], ['hmac', 'base64', true]);
  ok(OT.nodes.find((n) => n.name === 'Order Webhook').parameters.options.rawBody === true, 'rawBody must be enabled');
  return 'The hash algorithm (SHA-256) is set in the credential/node defaults, not verified here.'; });

// ---------- HSE ----------
const HS = W['HSE'];
const NOW = Date.now(), DAY = 24 * 3600 * 1000, SENDER = 'incident-reports@example.com';
const mail = (o) => ({ json: Object.assign({ id: 'm' + Math.random(), subject: 'Incident', receivedDateTime: new Date(NOW - DAY).toISOString(), hasAttachments: false, body: { content: '<p>Hi</p>' }, from: { emailAddress: { address: SENDER } } }, o) });
const clean = (items) => run(code(HS, 'Clean and Prepare'), { $: () => ({ first: () => ({ json: { Sender: SENDER } }) }), $input: { all: () => items } })[0].json;
test('HSE', 'Clean: keeps in-window emails from the expected sender (case-insensitive)', () => {
  const r = clean([mail({}), mail({ from: { emailAddress: { address: 'INCIDENT-Reports@Example.com' } } })]); eq(r.count, 2); });
test('HSE', 'Clean: drops other senders and emails older than 7 days', () => {
  const r = clean([mail({}), mail({ from: { emailAddress: { address: 'spam@example.com' } } }), mail({ receivedDateTime: new Date(NOW - 9 * DAY).toISOString() })]); eq(r.count, 1); });
test('HSE', 'Clean: strips scripts, styles and tags, decodes entities', () => {
  const r = clean([mail({ body: { content: '<style>x{}</style><script>alert(1)</script><p>Fire &amp; smoke&nbsp;at <b>Bay 2</b></p>' } })]); eq(r.emails[0].body, 'Fire & smoke at Bay 2'); });
test('HSE', 'Clean: bodies over 6000 characters are truncated with a marker', () => {
  const r = clean([mail({ body: { content: 'x'.repeat(7000) } })]); eq(r.emails[0].body.length, 6000 + ' [truncated]'.length); });
test('HSE', 'Clean: empty week (or empty placeholder item) -> count 0, which routes to the no-incidents email', () => {
  eq(clean([]).count, 0); eq(clean([{ json: {} }]).count, 0); });
const build = (out) => run(code(HS, 'Build HTML Report'), { $input: { first: () => ({ json: { output: out } }) } })[0].json.html;
test('HSE', 'Report: HTML in model output is escaped (no script injection)', () => {
  const h = build({ period: 'p', total_incidents: 1, incidents: [{ date: '<script>alert(1)</script>', type: 'a', severity: 'High', location: 'l', injuries: 'i', root_cause: 'r', corrective_actions: 'c', status: 's' }], by_severity: {}, by_type: {}, by_location: {}, trends_and_patterns: '<img src=x onerror=1>', risk_alerts: [], recommendations: [] });
  ok(!h.includes('<script>') && !h.includes('<img') && h.includes('&lt;script&gt;')); });
test('HSE', 'Report: missing fields render "Not specified"; no risk box when there are no alerts; "None" for empty recommendations', () => {
  const h = build({ incidents: [{ date: '2026-11-01' }], risk_alerts: [], recommendations: [] });
  ok(h.includes('Not specified') && !h.includes('Risk Alerts') && h.includes('<p>None</p>')); });
test('HSE', 'Report: risk alerts produce the red Risk Alerts box', () => { ok(build({ risk_alerts: ['High severity event'] }).includes('Risk Alerts')); });
test('HSE', 'Report: the committed sample JSON renders all six sections', () => {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'hse-incident-weekly-analysis/samples/sample-report.json'), 'utf8')); delete s._demo_notice; const h = build(s);
  for (const t of ['Risk Alerts', 'All Incidents', 'By Severity', 'By Type', 'By Location', 'Trends and Patterns', 'Recommendations']) ok(h.includes(t), 'missing ' + t); });

// ---------- HR ----------
const HR = W['HR'];
const parse = (data, text) => run(code(HR, 'Code in JavaScript'), { $json: { callback_query: { id: 'cb1', data, message: { text } } } }).json;
const MSG = (lvl) => '🚨 New Candidate Application\n\n👤 Name: Demo\n\n📧 Email: demo.candidate@example.com\n\n📱 Phone: 000\n\n📊 Level: ' + lvl + '\n\n💼 Experience: 1-3';
test('HR', 'Callback: accept button -> action accept, email and level extracted', () => {
  eq(parse('action_accept_JUNIOR_demo.candidate@example.com', MSG('JUNIOR')), { action: 'accept', level: 'JUNIOR', candidate_email: 'demo.candidate@example.com', callback_query_id: 'cb1' }); });
test('HR', 'Callback: reject button -> action reject', () => { eq(parse('action_reject_SENIOR_x', MSG('SENIOR')).action, 'reject'); });
test('HR', 'Callback: unknown callback data -> action "unknown" (no throw)', () => { eq(parse('something_else', MSG('JUNIOR')).action, 'unknown'); });
test('HR', 'Callback: message without an email -> empty candidate_email and level UNKNOWN (no throw)', () => {
  const r = parse('action_accept_x', 'no fields here'); eq([r.candidate_email, r.level], ['', 'UNKNOWN']); });
test('HR', 'KNOWN ISSUE confirmed: MID_LEVEL is output as "MID LEVEL" (space), but the sheet tab is MID_LEVEL', () => {
  eq(parse('action_reject_MID_LEVEL_x', MSG('MID_LEVEL')).level, 'MID LEVEL');
  return 'Behaviour matches the README limitation; the reject path would look up a tab named "MID LEVEL".'; });
test('HR', 'KNOWN ISSUE check: Telegram callback_data limit (64 bytes) for a long email', () => {
  const d = 'action_accept_MID_LEVEL_' + 'very.long.candidate.name.example@some-long-domain-name.example.com';
  ok(Buffer.byteLength(d) > 64, 'expected to exceed'); return 'A ' + Buffer.byteLength(d) + '-byte value exceeds the 64-byte limit, so long emails can break the buttons.'; });

// ---------- Students ----------
const ST = W['Students'];
const dup = (phone, rows) => run(code(ST, 'Duplicate Checking Code'), { $node: { 'Edit Fields': { json: { student_number: phone } } }, $items: () => rows.map((r) => ({ json: r })) });
test('Students', 'Duplicate check: existing student number -> isDuplicate true', () => { eq(dup('0100', [{ 'رقم الطالب': '0100' }, { 'رقم الطالب': '0200' }]).isDuplicate, true); });
test('Students', 'Duplicate check: new student number -> false', () => { eq(dup('0300', [{ 'رقم الطالب': '0100' }]).isDuplicate, false); });
test('Students', 'Duplicate check: empty roster placeholder item -> false (no throw)', () => { eq(dup('0100', [{}]).isDuplicate, false); });
test('Students', 'Duplicate check: matching is loose (number vs text)', () => { eq(dup('100', [{ 'رقم الطالب': 100 }]).isDuplicate, true); });
const cnt = (n) => run(code(ST, 'Group Count Code Node'), { $items: () => Array.from({ length: n }, () => ({ json: {} })) })[0].count;
test('Students', 'Group count: counts rows of the group sheet', () => { eq(cnt(12), 12); });
test('Students', 'POTENTIAL ISSUE: an empty group returns one placeholder item (alwaysOutputData) -> count 1, not 0', () => {
  const n = ST.nodes.find((x) => x.name === 'Get Current Group Data'); ok(n.alwaysOutputData === true);
  return 'If n8n emits one empty item for an empty tab, the first student of a group would be counted as already seated (off by one). Verify in a real execution; see MANUAL_TEST_PLAN.md case S5.'; });
test('Students', 'Seat rule: IF is "count >= limit" and its true branch goes to the waiting list', () => {
  eq(ST.nodes.find((x) => x.name === 'Have A Seat Or Not?').parameters.conditions.conditions[0].operator.operation, 'gte'); });

// ---------- Report ----------
const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
let md = '# Offline Logic Test Report\n\n> Generated by `tests/run-code-node-tests.js`. These are **offline logic tests** of the Code nodes and the workflow graph, using synthetic data. They are **not** n8n executions: triggers, credentials, Gmail, Telegram, Google Sheets and the AI models were not run. End-to-end tests are in [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md).\n\n';
md += '**Result: ' + pass + ' passed, ' + fail + ' failed (' + results.length + ' checks)**\n';
let g = '';
for (const r of results) { if (r.group !== g) { g = r.group; md += '\n## ' + g + '\n\n| Result | Check | Note |\n|---|---|---|\n'; }
  md += '| ' + (r.ok ? 'PASS' : '**FAIL**') + ' | ' + r.name.replace(/\|/g, '/') + ' | ' + (r.note || '').replace(/\|/g, '/').replace(/\n/g, ' ') + ' |\n'; }
fs.writeFileSync(path.join(__dirname, 'TEST_REPORT.md'), md);
console.log(md.split('\n').filter((l) => l.startsWith('| **FAIL') || l.startsWith('**Result')).join('\n'));
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
/**
 * Offline logic tests for the Certificate Automation workflow (workflow.json).
 *
 * What this is:  the four Code nodes and the "Already Handled?" expression are extracted from workflow.json and run
 *                in Node with synthetic rows, and the node graph is checked for the wiring the README describes.
 * What this is NOT: an n8n execution. Google Sheets, Drive, Docs and Gmail are not called, no PDF is produced and no
 *                email is sent. No recorded execution exists in this repository.
 *
 * Usage: node certificate-automation-system/tests/run-code-node-tests.js   (writes tests/OFFLINE_TEST_REPORT.md)
 */
const fs = require('fs'), path = require('path');
const WF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const results = [];
const test = (group, name, fn) => { try { results.push({ group, name, ok: true, note: fn() || '' }); } catch (e) { results.push({ group, name, ok: false, note: e.message }); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };

const node = (n) => { const x = WF.nodes.find((k) => k.name === n); if (!x) throw new Error('node not found: ' + n); return x; };
const code = (n) => node(n).parameters.jsCode;
const input = (rows) => ({ all: () => rows.map((json) => ({ json })), first: () => ({ json: rows[0] }) });
const run = (n, rows) => new Function('$input', code(n))(input(rows)).map((x) => x.json);
const MIN = 60000, DAY = 864e5;

// ---------- Prepare Request ----------
const G1 = 'Prepare Request';
const form = (o = {}) => Object.assign({ 'Full Name': 'Test Student', Email: 'Student@Example.com', Course: 'AI Automation', Score: 85 }, o);
test(G1, 'Valid submission: lower-cased email, cert_id = email slug + course slug, mode issue', () => {
  const [r] = run(G1, [form()]); eq([r.valid, r.cert_id, r.email, r.mode], [true, 'student-example-com_ai-automation', 'student@example.com', 'issue']); });
test(G1, 'Score boundaries: 60 and 100 accepted; 59, 101, empty and text rejected', () => {
  for (const s of [60, 100]) eq(run(G1, [form({ Score: s })])[0].valid, true, 'score ' + s);
  for (const s of [59, 101, 'abc']) eq(run(G1, [form({ Score: s })])[0].valid, false, 'score ' + s);
  eq(run(G1, [form({ Score: undefined })])[0].valid, false, 'missing score'); });
test(G1, 'Missing name and invalid email are rejected with a message', () => {
  const a = run(G1, [form({ 'Full Name': '  ' })])[0]; eq([a.valid, a.error], [false, 'Missing name']);
  const b = run(G1, [form({ Email: 'not-an-email' })])[0]; eq([b.valid, b.error], [false, 'Invalid email']); });
test(G1, 'Arabic course names are kept in the cert_id slug', () => { const [r] = run(G1, [form({ Course: 'تحليل البيانات' })]); ok(r.cert_id.endsWith('_تحليل-البيانات'), r.cert_id); });
test(G1, 'Same person + same course always gives the same cert_id (basis of the duplicate check)', () => { eq(run(G1, [form()])[0].cert_id, run(G1, [form({ Email: ' STUDENT@example.com ' })])[0].cert_id); });
test(G1, 'Known limitation: different emails can map to the same cert_id (a.b@x.com vs a-b@x.com)', () => {
  eq(run(G1, [form({ Email: 'a.b@x.com' })])[0].cert_id, run(G1, [form({ Email: 'a-b@x.com' })])[0].cert_id); return 'Documented in README section 11; the second student would be treated as a duplicate.'; });

// ---------- Already Handled? ----------
const G2 = 'Duplicate check';
const handled = (() => { const e = node('Already Handled?').parameters.conditions.conditions[0].leftValue.replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, ''); return (status) => new Function('$json', 'return ' + e)({ status }); })();
test(G2, 'issued / pending / sending / delivery_unknown / regenerated (any case, padded) count as already handled', () => { for (const s of ['issued', 'ISSUED', ' pending ', 'sending', 'delivery_unknown', 'regenerated']) eq(handled(s), true, s); });
test(G2, 'No row (empty), failed and rejected are NOT treated as handled, so they can be (re)issued', () => { for (const s of [undefined, '', 'failed', 'rejected']) eq(handled(s), false, String(s)); });

// ---------- Find Pending (nightly catch-up) ----------
const G3 = 'Find Pending (nightly)';
const row = (o) => Object.assign({ cert_id: 'c', name: 'n', email: 'e@x.com', course: 'AI Automation', score: 80, status: 'pending', created_at: new Date(Date.now() - 60 * MIN).toISOString() }, o);
test(G3, 'pending/failed rows older than 15 minutes are selected, with mode issue', () => {
  const out = run('Find Pending', [row({ cert_id: 'a' }), row({ cert_id: 'b', status: 'failed' })]); eq(out.map((x) => x.cert_id), ['a', 'b']); eq(out[0].mode, 'issue'); });
test(G3, 'Rows younger than 15 minutes are left alone (the live run may still be working)', () => eq(run('Find Pending', [row({ created_at: new Date(Date.now() - 5 * MIN).toISOString() })]).length, 0));
test(G3, 'sending, delivery_unknown, issued, rejected and rows without cert_id are never selected', () => {
  eq(run('Find Pending', ['sending', 'delivery_unknown', 'issued', 'rejected'].map((s) => row({ status: s })).concat([row({ cert_id: '' })])).length, 0); });
test(G3, 'Rows with an unreadable created_at are treated as old and selected', () => eq(run('Find Pending', [row({ created_at: '' })]).length, 1));
test(G3, 'Batch is capped at 20 per run', () => eq(run('Find Pending', Array.from({ length: 25 }, (_, i) => row({ cert_id: 'c' + i }))).length, 20));

// ---------- Select Old Certificates (manual backfill) ----------
const G4 = 'Select Old Certificates (backfill)';
const issued = (o) => row(Object.assign({ status: 'issued', template_version: '' }, o));
test(G4, 'issued rows with an empty or older template_version are selected, with mode backfill', () => {
  const out = run('Select Old Certificates', [issued({ cert_id: 'a' }), issued({ cert_id: 'b', template_version: 'v1' })]); eq(out.map((x) => x.cert_id), ['a', 'b']); eq(out[0].mode, 'backfill'); });
test(G4, 'Rows already on template v2, and rows that are not issued, are skipped', () => eq(run('Select Old Certificates', [issued({ template_version: 'v2' }), row({ status: 'pending' }), row({ status: 'delivery_unknown' })]).length, 0));
test(G4, 'Backfill is capped at 20 per run', () => eq(run('Select Old Certificates', Array.from({ length: 30 }, (_, i) => issued({ cert_id: 'c' + i }))).length, 20));
test(G4, 'Target template version matches the version written by "Set Cert Data" and "Mark Regenerated"', () => {
  const v = code('Select Old Certificates').match(/TEMPLATE_VERSION = '([^']+)'/)[1];
  const set = node('Set Cert Data').parameters.assignments.assignments.find((a) => a.name === 'template_version').value;
  eq([v, set, node('Mark Regenerated').parameters.columns.value.template_version], ['v2', 'v2', 'v2']); });

// ---------- Weekly Rows ----------
const G5 = 'Weekly Rows (report)';
const wk = (o) => ({ cert_id: 'w', name: 'n', email: 'e@x.com', course: 'c', score: 80, status: 'issued', ...o });
const dmy = (t) => { const d = new Date(t); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear(); };
test(G5, 'Issued rows from the last 7 days are included; older rows and non-issued rows are not', () => {
  const out = run('Weekly Rows', [wk({ cert_id: 'new', issued_at: new Date(Date.now() - 2 * DAY).toISOString() }), wk({ cert_id: 'old', issued_at: new Date(Date.now() - 9 * DAY).toISOString() }), wk({ cert_id: 'pend', status: 'pending', issued_at: new Date().toISOString() })]);
  eq(out.map((x) => x.cert_id), ['new']); });
test(G5, 'Legacy dd/MM/yyyy dates are understood', () => eq(run('Weekly Rows', [wk({ cert_id: 'leg', issued_at: dmy(Date.now() - 1 * DAY) })]).map((x) => x.cert_id), ['leg']));
test(G5, 'No rows this week -> a single "No certificates issued this week" note item', () => { const out = run('Weekly Rows', [wk({ issued_at: new Date(Date.now() - 30 * DAY).toISOString() })]); eq(out, [{ note: 'No certificates issued this week' }]); });
test(G5, 'Unparseable issued_at is excluded, not an error', () => eq(run('Weekly Rows', [wk({ issued_at: 'garbage' })]), [{ note: 'No certificates issued this week' }]));

// ---------- Workflow wiring ----------
const G6 = 'Workflow wiring';
const C = WF.connections;
const targets = (n, out = 0) => ((C[n] && C[n].main && C[n].main[out]) || []).map((x) => x.node);
test(G6, 'Every connection source and target exists as a node', () => { const names = new Set(WF.nodes.map((n) => n.name)); for (const [s, v] of Object.entries(C)) { ok(names.has(s), 'source ' + s); for (const o of v.main) for (const t of o) ok(names.has(t.node), 'target ' + t.node); } });
test(G6, 'Four entry points: form, nightly schedule, manual backfill, weekly schedule', () => eq(WF.nodes.filter((n) => /trigger$/i.test(n.type)).map((n) => n.name).sort(), ['Course Completion Form', 'Manual Backfill Trigger', 'Schedule Nightly 23:00', 'Schedule Sunday 09:00']));
test(G6, 'All non-sticky nodes are reachable from a trigger', () => {
  const seen = new Set(); const q = WF.nodes.filter((n) => /trigger$/i.test(n.type)).map((n) => n.name);
  while (q.length) { const x = q.pop(); if (seen.has(x)) continue; seen.add(x); for (const o of (C[x] ? C[x].main : [])) for (const t of o) q.push(t.node); }
  const missing = WF.nodes.filter((n) => !/stickyNote$/.test(n.type) && !seen.has(n.name)).map((n) => n.name); eq(missing, []); });
test(G6, 'Three lanes feed the same "Set Cert Data" generator', () => { for (const n of ['Restore Data', 'Find Pending', 'Select Old Certificates']) eq(targets(n), ['Set Cert Data'], n); });
test(G6, 'Issue path: "Mark Sending (Before Gmail)" runs before "Export PDF"; backfill skips it', () => {
  eq(targets('Requires Email Delivery?', 0), ['Mark Sending (Before Gmail)']); eq(targets('Mark Sending (Before Gmail)'), ['Export PDF']); eq(targets('Requires Email Delivery?', 1), ['Export PDF']); });
test(G6, 'Backfill never reaches the email node: "Is Backfill?" true -> Mark Regenerated, false -> Email Certificate', () => {
  eq(targets('Is Backfill?', 0), ['Mark Regenerated']); eq(targets('Is Backfill?', 1), ['Email Certificate']);
  const inbound = Object.entries(C).filter(([, v]) => v.main.some((o) => o.some((t) => t.node === 'Email Certificate'))).map(([k]) => k); eq(inbound, ['Is Backfill?']); });
test(G6, 'Gmail success -> Mark Issued; Gmail error output -> Mark Delivery Unknown (no automatic retry)', () => {
  const g = node('Email Certificate'); eq([g.onError, g.retryOnFail], ['continueErrorOutput', false]);
  eq(targets('Email Certificate', 0), ['Mark Issued']); eq(targets('Email Certificate', 1), ['Mark Delivery Unknown (Review)']); eq(targets('Mark Delivery Unknown (Review)'), []); });
test(G6, 'Invalid submissions are logged as rejected and stop; handled duplicates stop at "Skip Duplicate"', () => { eq(targets('Valid Request?', 1), ['Log Rejected']); eq(targets('Log Rejected'), []); eq(targets('Already Handled?', 0), ['Skip Duplicate']); eq(targets('Already Handled?', 1), ['Log Pending']); });
test(G6, 'Status written at each step matches the README state model', () => {
  const st = (n) => node(n).parameters.columns.value.status;
  eq([st('Log Rejected'), st('Log Pending'), st('Mark Sending (Before Gmail)'), st('Mark Issued'), st('Mark Delivery Unknown (Review)'), st('Mark Regenerated')], ['rejected', 'pending', 'sending', 'issued', 'delivery_unknown', 'issued']); });
test(G6, 'Schedules: nightly 23:00 and Sunday 09:00 (cron), no timezone stored in the export', () => {
  eq([node('Schedule Nightly 23:00').parameters.rule.interval[0].expression, node('Schedule Sunday 09:00').parameters.rule.interval[0].expression], ['0 23 * * *', '0 9 * * 0']); ok(!('timezone' in WF.settings), 'timezone present'); });
test(G6, 'Report recipient and Google resource IDs are placeholders; workflow ships inactive with no credential blocks', () => {
  const s = JSON.stringify(WF); ok(s.includes('REPLACE_WITH_MANAGER_EMAIL') && s.includes('REPLACE_WITH_RESOURCE_ID'));
  eq(WF.active, false); ok(WF.nodes.every((n) => !n.credentials), 'credentials block found'); });

// ---------- Report ----------
const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
let md = '# Offline Test Report — Certificate Automation\n\n> Generated by `tests/run-code-node-tests.js`. The workflow\'s Code nodes and the duplicate-check expression run with synthetic rows, and the node graph is checked against the behavior described in the README. This is **not** an n8n execution: Google Sheets, Drive, Docs and Gmail are not called, no PDF is generated and no email is sent. No recorded execution is included in this repository.\n\n';
md += '**Result: ' + pass + ' passed, ' + fail + ' failed (' + results.length + ' checks)**\n';
let g = '';
for (const r of results) { if (r.group !== g) { g = r.group; md += '\n## ' + g + '\n\n| Result | Check | Note |\n|---|---|---|\n'; }
  md += '| ' + (r.ok ? 'PASS' : '**FAIL**') + ' | ' + r.name.replace(/\|/g, '/') + ' | ' + (r.note || '').replace(/\|/g, '/').replace(/\n/g, ' ') + ' |\n'; }
fs.writeFileSync(path.join(__dirname, 'OFFLINE_TEST_REPORT.md'), md);
console.log(md.split('\n').filter((l) => l.startsWith('| **FAIL') || l.startsWith('**Result')).join('\n'));
process.exit(fail ? 1 : 0);

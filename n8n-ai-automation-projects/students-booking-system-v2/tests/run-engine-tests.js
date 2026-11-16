#!/usr/bin/env node
/**
 * Offline logic tests for the V2 booking engine (apps-script/Code.gs) and the two Code nodes of the V2 workflow.
 *
 * What this is:  Code.gs is loaded unmodified into a Node `vm` sandbox with in-memory fakes of SpreadsheetApp,
 *                LockService, PropertiesService and ContentService. The tests exercise the decision logic:
 *                validation, duplicates, capacity, ledger replay and partial-write repair.
 * What this is NOT: a Google Apps Script run, a real concurrency test, or an n8n execution. Node is single-threaded,
 *                so simultaneous requests for the last seat cannot be simulated here. The fake lock only lets us
 *                test the "lock busy" response. See docs/TEST_REPORT.md for what is still pending.
 *
 * Usage: node students-booking-system-v2/tests/run-engine-tests.js   (writes tests/OFFLINE_TEST_REPORT.md)
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const CODE = fs.readFileSync(path.join(ROOT, 'apps-script/Code.gs'), 'utf8');
const WF = JSON.parse(fs.readFileSync(path.join(ROOT, 'workflow/students-booking-v2.public.json'), 'utf8'));

const results = [];
function test(group, name, fn) {
  try { const note = fn(); results.push({ group, name, ok: true, note: note || '' }); }
  catch (e) { results.push({ group, name, ok: false, note: e.message }); }
}
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };

// ---------- In-memory Google Sheets fake ----------
class FakeSheet {
  constructor(name, headers) { this.name = name; this.data = [headers.slice()]; this.failNextWrite = false; }
  getName() { return this.name; }
  getLastRow() { let n = this.data.length; while (n > 0 && this.data[n - 1].every((c) => c === '' || c == null)) n--; return n; }
  getLastColumn() { return Math.max(...this.data.map((r) => r.length)); }
  setFrozenRows() {}
  getRange(r, c, nr = 1, nc = 1) {
    const s = this;
    return {
      getDisplayValues() { const out = []; for (let i = 0; i < nr; i++) { const row = s.data[r - 1 + i] || []; out.push(Array.from({ length: nc }, (_, j) => String(row[c - 1 + j] ?? ''))); } return out; },
      setValues(vals) {
        if (s.failNextWrite) { s.failNextWrite = false; throw new Error('INJECTED_WRITE_FAILURE'); }
        vals.forEach((rowVals, i) => { const idx = r - 1 + i; while (s.data.length <= idx) s.data.push([]); rowVals.forEach((v, j) => { s.data[idx][c - 1 + j] = v; }); });
      },
      setNumberFormat() {},
    };
  }
  rows() { return this.data.slice(1).filter((r) => r.some((c) => c !== '' && c != null)); }
}
const STUDENT_HEADERS = ['ID', 'اسم الطالب', 'رقم الطالب', 'رقم ولي الأمر الأول', 'رقم ولي الأمر الثاني', 'وظيفة الأب', 'وظيفة الأم', 'المنطقة', 'المجموعة', 'المجوعة', 'النوع'];
const G1 = 'Group A', G2 = 'Group B';

function makeEngine({ limitA = 2, token = 'T', configured = true, lockBusy = false } = {}) {
  const sheets = {};
  const add = (name, headers) => (sheets[name] = new FakeSheet(name, headers));
  const settings = add('settings', ['المجموعة', 'النوع', 'اللينك', 'ليميت الطلاب']);
  settings.data.push([G1, 'طالب', 'https://example.com/a', String(limitA)]);
  settings.data.push([G2, 'طالب', 'https://example.com/b', '5']);
  add(G1, STUDENT_HEADERS); add(G2, STUDENT_HEADERS); add('الكشف المجمع', STUDENT_HEADERS); add('Waiting List', STUDENT_HEADERS);
  const props = configured ? { BOOKING_SHEET_ID: 'demo', BOOKING_API_TOKEN: token } : {};
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = new FakeSheet(n, []); sheets[n].data = [[]]; return sheets[n]; },
  };
  const sandbox = {
    SpreadsheetApp: { openById: () => ss, flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => !lockBusy, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    Date, JSON, Error, String, Number, Math, Object, Array, console,
  };
  vm.createContext(sandbox);
  vm.runInContext(CODE, sandbox, { filename: 'Code.gs' });
  const call = (body) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  const reg = (n, extra = {}) => Object.assign({
    token, event_id: 'EV' + n, student_name: 'Test Student ' + n,
    student_number: '0110000' + String(n).padStart(4, '0'), parent_number1: '0120000' + String(n).padStart(4, '0'), parent_number2: '',
    dad_job: 'x', mom_job: 'y', place: 'z', group: G1, gender: 'طالب',
  }, extra);
  const ledger = () => (sheets['_BookingLedger'] ? sheets['_BookingLedger'].rows() : []);
  return { sheets, call, reg, ledger };
}
const counts = (e) => [e.sheets[G1].rows().length, e.sheets['الكشف المجمع'].rows().length, e.sheets['Waiting List'].rows().length];

// ---------- Booking engine ----------
const E = 'Booking engine (Code.gs)';
test(E, 'Wrong token -> UNAUTHORIZED, nothing written', () => { const e = makeEngine(); const r = e.call(e.reg(1, { token: 'bad' })); eq(r.status, 'UNAUTHORIZED'); eq(counts(e), [0, 0, 0]); eq(e.ledger().length, 0); });
test(E, 'Missing script properties -> ERROR BOOKING_ENGINE_NOT_CONFIGURED', () => { const e = makeEngine({ configured: false }); const r = e.call(e.reg(1)); eq(r.status, 'ERROR'); ok(/NOT_CONFIGURED/.test(r.error)); });
test(E, 'Lock busy -> RETRY, nothing written', () => { const e = makeEngine({ lockBusy: true }); const r = e.call(e.reg(1)); eq(r.status, 'RETRY'); eq(counts(e), [0, 0, 0]); });
test(E, 'Invalid phone / gender / empty name / over-long event_id -> INVALID', () => {
  const e = makeEngine();
  for (const bad of [{ student_number: '123' }, { gender: 'x' }, { student_name: '  ' }, { event_id: 'E'.repeat(241) }, { parent_number1: '12' }]) eq(e.call(e.reg(1, bad)).status, 'INVALID', JSON.stringify(bad));
  eq(counts(e), [0, 0, 0]); });
test(E, 'No settings row for the group+gender, or two rows -> INVALID', () => {
  const e = makeEngine(); eq(e.call(e.reg(1, { gender: 'طالبة' })).status, 'INVALID');
  e.sheets.settings.data.push([G1, 'طالب', 'https://example.com/dup', '9']); eq(e.call(e.reg(2)).status, 'INVALID'); });
test(E, 'New student with free seat -> CONFIRMED, one row in group and master, ledger DONE', () => {
  const e = makeEngine(); const r = e.call(e.reg(1)); eq(r.status, 'CONFIRMED'); eq(r.group_link, 'https://example.com/a'); eq(counts(e), [1, 1, 0]);
  eq(e.ledger()[0][5], 'DONE'); });
test(E, 'Leading zero of phone numbers is kept (stored as text)', () => { const e = makeEngine(); e.call(e.reg(1)); eq(e.sheets[G1].rows()[0][2], '01100000001'); });
test(E, 'Same phone, new event_id -> DUPLICATE, no extra rows', () => { const e = makeEngine(); e.call(e.reg(1)); const r = e.call(e.reg(1, { event_id: 'OTHER' })); eq(r.status, 'DUPLICATE'); eq(counts(e), [1, 1, 0]); });
test(E, 'Same phone in a different group -> DUPLICATE (master roster is checked)', () => { const e = makeEngine(); e.call(e.reg(1)); eq(e.call(e.reg(1, { event_id: 'X', group: G2 })).status, 'DUPLICATE'); });
test(E, 'Capacity: with limit 2 the third distinct student is WAITLISTED (waiting list only)', () => {
  const e = makeEngine({ limitA: 2 }); const s = [1, 2, 3].map((n) => e.call(e.reg(n)).status); eq(s, ['CONFIRMED', 'CONFIRMED', 'WAITLISTED']); eq(counts(e), [2, 2, 1]); });
test(E, 'Sequential batch of 5 with limit 3 -> 3 confirmed, 2 waitlisted, no duplicates', () => {
  const e = makeEngine({ limitA: 3 }); const s = [1, 2, 3, 4, 5].map((n) => e.call(e.reg(n)).status);
  eq(s, ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'WAITLISTED', 'WAITLISTED']); eq(counts(e), [3, 3, 2]);
  return 'Sequential only. This is not a simultaneous-request test.'; });
test(E, 'A waitlisted student who submits again is detected as DUPLICATE', () => {
  const e = makeEngine({ limitA: 1 }); e.call(e.reg(1)); eq(e.call(e.reg(2)).status, 'WAITLISTED'); eq(e.call(e.reg(2, { event_id: 'AGAIN' })).status, 'DUPLICATE'); });
test(E, 'Replay of a finished event before its notice is SENT -> original status again, no new rows', () => {
  const e = makeEngine(); e.call(e.reg(1)); const r = e.call(e.reg(1)); eq(r.status, 'CONFIRMED'); eq(r.replayed, true); eq(counts(e), [1, 1, 0]); });
test(E, 'Replay after notice SENT -> ALREADY_PROCESSED', () => {
  const e = makeEngine(); e.call(e.reg(1)); eq(e.call({ token: 'T', action: 'notification', event_id: 'EV1', notice_status: 'SENT' }).status, 'NOTICE_RECORDED');
  const r = e.call(e.reg(1)); eq(r.status, 'ALREADY_PROCESSED'); eq(r.original_status, 'CONFIRMED'); eq(counts(e), [1, 1, 0]); });
test(E, 'Notification update: unknown event -> NOT_FOUND; bad value -> INVALID; FAILED is recorded', () => {
  const e = makeEngine(); e.call(e.reg(1));
  eq(e.call({ token: 'T', action: 'notification', event_id: 'NOPE', notice_status: 'SENT' }).status, 'NOT_FOUND');
  eq(e.call({ token: 'T', action: 'notification', event_id: 'EV1', notice_status: 'MAYBE' }).status, 'INVALID');
  eq(e.call({ token: 'T', action: 'notification', event_id: 'EV1', notice_status: 'FAILED' }).status, 'NOTICE_RECORDED'); eq(e.ledger()[0][9], 'FAILED'); });
test(E, 'Partial write (group written, master write fails) -> ERROR, ledger stays PROCESSING; replay repairs without double booking', () => {
  const e = makeEngine(); e.sheets['الكشف المجمع'].failNextWrite = true;
  const r1 = e.call(e.reg(1)); eq(r1.status, 'ERROR'); eq(counts(e), [1, 0, 0]); eq(e.ledger()[0][5], 'PROCESSING'); ok(/INJECTED/.test(e.ledger()[0][8]), 'last_error recorded');
  const r2 = e.call(e.reg(1)); eq(r2.status, 'CONFIRMED'); eq(counts(e), [1, 1, 0]); eq(e.ledger()[0][5], 'DONE');
  return 'Fault injected in the in-memory fake, not in real Google Sheets.'; });
test(E, 'Retry after settings became invalid (capacity 0) -> INVALID: validation runs before the ledger is consulted', () => {
  const e = makeEngine({ limitA: 1 }); e.sheets['الكشف المجمع'].failNextWrite = true; e.call(e.reg(1));
  e.sheets.settings.data[1][3] = '0';
  const r = e.call(e.reg(1)); eq(r.status, 'INVALID'); return 'The unfinished event stays PROCESSING until settings are fixed and the same event_id is replayed.'; });
test(E, 'A different unfinished event for the same phone -> RETRY', () => {
  const e = makeEngine(); e.sheets['الكشف المجمع'].failNextWrite = true; e.call(e.reg(1));
  eq(e.call(e.reg(1, { event_id: 'OTHER' })).status, 'RETRY'); eq(counts(e), [1, 0, 0]); });

// ---------- Workflow Code nodes ----------
const N = 'Workflow Code nodes';
const node = (name) => WF.nodes.find((n) => n.name === name).parameters.jsCode;
const run = (src, env) => new Function('$json', '$input', '$', src)(env.$json, env.$input, env.$);
const prep = (row) => run(node('Prepare Registration'), { $input: { all: () => [{ json: row }] } })[0].json;
const FORM = { Timestamp: '11/17/2026 0:01:01', 'النوع': 'طالب', '✏️ اسم الطالب ثلاثي (بالعربي)': 'Test 1', '📞 رقم الطالب': '011 0000-0001', 'رقم ولي الأمر الأول': '01200000001', 'رقم ولي الأمر الثاني': '', 'وظيفة الأب': 'x', 'وظيفة الأم': 'y', 'المنطقة': 'z', 'المجموعة': G1 };
test(N, 'Prepare Registration: finds Arabic columns by label fragment (emoji in labels) and cleans the phone', () => { const d = prep(FORM); eq([d.student_name, d.student_number, d.group, d.valid], ['Test 1', '01100000001', G1, true]); });
test(N, 'Prepare Registration: event_id uses row number when present, timestamp fallback otherwise', () => {
  eq(prep({ ...FORM, row_number: 7 }).event_id, 'FORM_DEMO:7'); eq(prep(FORM).event_id, 'FORM_DEMO:11/17/2026 0:01:01|01100000001|' + G1 + '|طالب'); });
test(N, 'Prepare Registration: bad phone or gender -> valid false with message', () => {
  const d = prep({ ...FORM, '📞 رقم الطالب': '123' }); eq(d.valid, false); ok(d.validation_error.length > 0); eq(prep({ ...FORM, 'النوع': 'x' }).valid, false); });
const decide = (apiResp, p) => run(node('Prepare Decision & Safe Message'), { $input: { first: () => ({ json: apiResp }) }, $: () => ({ item: { json: p } }) })[0].json;
const P = { student_name: 'A <b>&', student_number: '01100000001', group: G1, gender: 'طالب', event_id: 'FORM_DEMO:1' };
test(N, 'Prepare Decision: user text is HTML-escaped and WhatsApp link uses 20 country code', () => {
  const d = decide({ ok: true, status: 'CONFIRMED', group_link: 'https://example.com/a' }, P); ok(d.message.includes('A &lt;b&gt;&amp;')); ok(d.message.includes('phone=201100000001')); eq(d.notice_required, true); });
test(N, 'Prepare Decision: ALREADY_PROCESSED -> empty message and notice_required false', () => { const d = decide({ ok: true, status: 'ALREADY_PROCESSED' }, P); eq([d.message, d.notice_required], ['', false]); });
test(N, 'Prepare Decision: unexpected / non-JSON response -> operations message, no throw', () => { const d = decide({ body: 'not json' }, P); eq(d.status, 'ERROR'); ok(d.message.includes(P.event_id)); });
test(N, 'Routing: RETRY / INVALID / ERROR fall through every status check to "Operations Alert"', () => {
  const c = WF.connections; eq(c['Skip Already Processed?'].main[1][0].node, 'Operations Alert');
  eq(c['Operations Alert'].main[0][0].node, 'Loop Over Items'); });
test(N, 'Routing: Telegram success -> Mark SENT, Telegram error output -> Mark FAILED', () => {
  for (const n of ['Conformation Message', 'Waiting List Message', 'Duplicate Message']) { eq(WF.connections[n].main[0][0].node, 'Mark Notification SENT'); eq(WF.connections[n].main[1][0].node, 'Mark Notification FAILED'); } });
test(N, 'Public export contains placeholders only (token, URL, chat id)', () => {
  const s = JSON.stringify(WF); ok(/REPLACE_WITH_PRIVATE_BOOKING_TOKEN/.test(s) && /REPLACE_WITH_YOUR_DEPLOYMENT_ID/.test(s) && /REPLACE_WITH_TEST_CHAT_ID/.test(s));
  ok(!/macros\/s\/(?!REPLACE)[A-Za-z0-9_-]{15,}/.test(s), 'real deployment URL found'); });

// ---------- Report ----------
const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
let md = '# Offline Test Report — Students Booking V2\n\n> Generated by `tests/run-engine-tests.js`. `apps-script/Code.gs` runs unmodified against in-memory fakes of Google Sheets, `LockService` and `PropertiesService`, and the workflow\'s two Code nodes run with mocked n8n helpers. This is **not** a Google Apps Script run, **not** an n8n execution and **not** a concurrency test (Node is single-threaded). Pending tests are listed in [../docs/TEST_REPORT.md](../docs/TEST_REPORT.md).\n\n';
md += '**Result: ' + pass + ' passed, ' + fail + ' failed (' + results.length + ' checks)**\n';
let g = '';
for (const r of results) { if (r.group !== g) { g = r.group; md += '\n## ' + g + '\n\n| Result | Check | Note |\n|---|---|---|\n'; }
  md += '| ' + (r.ok ? 'PASS' : '**FAIL**') + ' | ' + r.name.replace(/\|/g, '/') + ' | ' + (r.note || '').replace(/\|/g, '/').replace(/\n/g, ' ') + ' |\n'; }
fs.writeFileSync(path.join(__dirname, 'OFFLINE_TEST_REPORT.md'), md);
console.log(md.split('\n').filter((l) => l.startsWith('| **FAIL') || l.startsWith('**Result')).join('\n'));
process.exit(fail ? 1 : 0);

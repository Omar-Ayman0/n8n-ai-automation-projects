#!/usr/bin/env node
/**
 * Repository sanity checks (offline, dependency-free).
 *  1. Every .json file parses.
 *  2. Every n8n export: unique node names, connections point to existing nodes,
 *     credential IDs are placeholders, no hard-coded numeric Telegram chat IDs.
 *  3. Heuristic secret scan (API keys, bot tokens, JWTs, bearer tokens).
 *  4. Every relative link / image in every .md file resolves to a file.
 * Exit code 1 if anything fails. This is a heuristic, not a security audit.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules']);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : files.push(p);
  }
})(ROOT);

let pass = 0; const fails = [];
const check = (ok, msg) => { if (ok) pass++; else fails.push(msg); };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// 1 + 2: JSON and n8n exports
for (const f of files.filter((x) => x.endsWith('.json'))) {
  let d; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); check(true); } catch (e) { check(false, `${rel(f)}: invalid JSON (${e.message})`); continue; }
  if (!Array.isArray(d.nodes) || !d.connections) continue;            // not an n8n export
  const names = d.nodes.map((n) => n.name);
  check(new Set(names).size === names.length, `${rel(f)}: duplicate node names`);
  const ids = d.nodes.map((n) => n.id);
  check(new Set(ids).size === ids.length, `${rel(f)}: duplicate node ids`);
  for (const [src, outs] of Object.entries(d.connections)) {
    check(names.includes(src), `${rel(f)}: connection from unknown node "${src}"`);
    for (const branches of Object.values(outs)) for (const br of branches || []) for (const c of br || [])
      check(names.includes(c.node), `${rel(f)}: "${src}" connects to unknown node "${c.node}"`);
  }
  const s = JSON.stringify(d);
  for (const n of d.nodes) for (const c of Object.values(n.credentials || {}))
    check(!c.id || /^REPLACE_WITH|^YOUR_|^$/.test(c.id), `${rel(f)}: real-looking credential id on "${n.name}"`);
  check(!/"chatId"\s*:\s*"?\d{6,}/.test(s), `${rel(f)}: hard-coded numeric chatId`);
  check(!d.pinData || Object.keys(d.pinData).length === 0, `${rel(f)}: contains pinData (execution data)`);
}

// 3: secret scan on text files
const SECRET = /(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}|xox[bp]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{20,}|\b\d{8,10}:[A-Za-z0-9_-]{30,}|Bearer\s+[A-Za-z0-9._-]{20,})/;
for (const f of files.filter((x) => /\.(json|md|js|gs|txt|html|svg|ya?ml)$/.test(x))) {
  if (rel(f) === 'scripts/validate-repo.js') continue;
  check(!SECRET.test(fs.readFileSync(f, 'utf8')), `${rel(f)}: possible secret`);
}

// 4: markdown links
for (const f of files.filter((x) => x.endsWith('.md'))) {
  const t = fs.readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '');
  const re = /(?:\]\(|src=")([^)"\s]+)/g; let m;
  while ((m = re.exec(t))) {
    const l = m[1];
    if (/^(https?:|mailto:|#)/.test(l)) continue;
    const target = path.normalize(path.join(path.dirname(f), decodeURI(l.split('#')[0])));
    check(!l.split('#')[0] || fs.existsSync(target), `${rel(f)}: broken link -> ${l}`);
  }
}

console.log(`${pass} checks passed, ${fails.length} failed`);
fails.forEach((m) => console.log('FAIL ' + m));
process.exit(fails.length ? 1 : 0);

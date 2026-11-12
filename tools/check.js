#!/usr/bin/env node
/* tools/check.js — 守門檢查（純 node，無相依；smoke 測試需要 Playwright，找不到就印 SKIP）
   用法：node tools/check.js          （全部檢查；smoke 每章每種動畫按鈕只抽 3 顆）
         CHECK_ALL=1 node tools/check.js   （smoke 點遍所有按鈕）
         CHECK_SKIP_SMOKE=1 node tools/check.js （只跑靜態檢查）
   輸出：PASS/WARN/FAIL [id] 訊息；有 FAIL 則 exit 1。
   每項檢查有 since（階段）；since > PHASE 的檢查只會印 WARN（不會 FAIL）。 */
'use strict';
const PHASE = 2;

const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const J = (f) => path.join(ROOT, f);
const read = (f) => fs.readFileSync(J(f), 'utf8');

/* ---------------- 輸出 ---------------- */
const out = { PASS: 0, WARN: 0, FAIL: 0 };
function emit(level, id, msg) { out[level]++; console.log(level + ' [' + id + '] ' + msg); }
// 回報一項檢查結果：fails 為問題清單；since 之前的階段降為 WARN
function report(id, since, fails, okMsg) {
  const lvl = since > PHASE ? 'WARN' : 'FAIL';
  if (!fails.length) { emit('PASS', id, okMsg || 'ok'); return; }
  fails.forEach((m) => emit(lvl, id, (since > PHASE ? '(since phase ' + since + ') ' : '') + m));
}
function skip(id, since, why) { emit('WARN', id, 'SKIP' + (since > PHASE ? ' (since phase ' + since + ')' : '') + '：' + why); }

/* ---------------- 載入資料（node 內以 window = global 執行） ---------------- */
global.window = global;
const DATA_FILES = ['data', 'research', 'glossary', 'steps', 'slots', 'others', 'pipeline'];
const loaded = {};
DATA_FILES.forEach((f) => {
  const p = J('assets/js/' + f + '.js');
  if (!fs.existsSync(p)) return;
  try { require(p); loaded[f] = true; } catch (e) { emit('FAIL', 'load', f + '.js 載入失敗：' + e.message); }
});
const G = global;
const PIPE = G.PIPE; // Phase 2 起才有
const DATA_NAMES = ['R', 'GLOSS', 'STEPS', 'TAGS', 'PATTERNS', 'OTHERS', 'OTHER_CATS', 'FACETS', 'OTHER_METRICS', 'OTHER_GOV', 'OTHER_LESSONS', 'DATA'];

/* ---------------- 共用工具 ---------------- */
const html = read('index.html');
const appJs = read('assets/js/app.js');

const CN = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function num(s) { // 阿拉伯數字或中文數字（到 99）
  if (/^\d+$/.test(s)) return +s;
  const m = s.match(/^([一二兩三四五六七八九])?十([一二三四五六七八九])?$/);
  if (m) return (m[1] ? CN[m[1]] : 1) * 10 + (m[2] ? CN[m[2]] : 0);
  return s.length === 1 && s in CN ? CN[s] : NaN;
}
const NUMRE = '(\\d+|[零〇一二兩三四五六七八九十]+)';
function walkStrings(v, fn, p, seen) {
  seen = seen || new Set(); p = p || '';
  if (typeof v === 'string') return fn(v, p);
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  Object.keys(v).forEach((k) => walkStrings(v[k], fn, p + (Array.isArray(v) ? '[' + k + ']' : '.' + k), seen));
}
function stripTags(h) { return h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ''); }
function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }
function snip(s, i, len) { return s.slice(Math.max(0, i - 12), i + len + 12).replace(/\s+/g, ' '); }

// 所有「會被讀者看到的文字」來源：index.html（去掉註解、script、章號標籤）＋各資料物件的字串
function textSources() {
  const list = [];
  const body = html.replace(/<p class="ch-num">[\s\S]*?<\/p>/g, '');
  list.push({ file: 'index.html', text: stripTags(body), raw: false });
  DATA_NAMES.forEach((n) => {
    if (G[n] === undefined) return;
    walkStrings(G[n], (s, p) => list.push({ file: 'data:' + n + p, text: s }));
  });
  if (PIPE) walkStrings(PIPE, (s, p) => list.push({ file: 'data:PIPE' + p, text: s }));
  return list;
}

/* ---------------- 解析 index.html 章節 ---------------- */
const sections = []; // {id,title,html,start}
(function () {
  const re = /<section class="chapter"[^>]*\sid="ch-([a-z]+)"[^>]*data-title="([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) sections.push({ id: m[1], title: m[2], start: m.index });
  sections.forEach((s, i) => { s.html = html.slice(s.start, i + 1 < sections.length ? sections[i + 1].start : html.length); });
})();

/* app.js 的 ORDER / MODS / ALIAS（Phase 2 起改讀 PIPE） */
function evalLiteral(name) {
  const m = appJs.match(new RegExp('var ' + name + '\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);'));
  if (!m) return null;
  try { return (new Function('return ' + m[1]))(); } catch (e) { return null; }
}
const ORDER = PIPE ? PIPE.CHAPTERS.map((c) => c.id) : evalLiteral('ORDER');
const ALIAS = PIPE ? PIPE.ALIAS : evalLiteral('ALIAS');
const CHNUM = PIPE ? PIPE.CHAPTERS.map((c) => c.num) : null;

/* ================= 檢查 ================= */

// chapters：section 順序／data-title／.ch-num／#toc 與章節資料一致
function checkChapters() {
  const f = [];
  if (!ORDER) { f.push('讀不到章節順序（app.js ORDER）'); return report('chapters', 1, f); }
  const ids = sections.map((s) => s.id);
  if (ids.join() !== ORDER.join()) f.push('section 順序 ' + ids.join(',') + ' 與 ORDER ' + ORDER.join(',') + ' 不一致');
  // toc
  const toc = (html.match(/<ol class="toc" id="toc">([\s\S]*?)<\/ol>/) || [])[1] || '';
  const links = [...toc.matchAll(/<a href="#\/([a-z]+)"><span class="n">([^<]*)<\/span>([^<]*)<\/a>/g)];
  if (links.map((m) => m[1]).join() !== ORDER.join()) f.push('#toc 連結順序 ' + links.map((m) => m[1]).join(',') + ' 與 ORDER 不一致');
  // 章號：home 無；1..N 依序；附錄 A、參考文獻 R（目前寫法）
  let n = 0;
  sections.forEach((s, i) => {
    const cn = (s.html.match(/<p class="ch-num">([^<]*)<\/p>/) || [])[1];
    const lk = links[i];
    let expect;
    if (s.id === 'home') expect = null;
    else if (s.id === 'appendix') expect = '附錄';
    else if (s.id === 'refs') expect = '參考文獻';
    else expect = '第 ' + (++n) + ' 章';
    if (PIPE && CHNUM[i] !== undefined) { // Phase 2 起以 PIPE 為準
      const c = PIPE.CHAPTERS[i];
      if (/^\d+$/.test(c.num) && c.num !== '0') expect = '第 ' + c.num + ' 章';
    }
    if (expect === null) { if (cn) f.push('ch-' + s.id + ' 不應有 .ch-num'); } else if (cn !== expect && !(PIPE && /^[AB]$/.test(PIPE.CHAPTERS[i].num))) f.push('ch-' + s.id + ' .ch-num「' + cn + '」應為「' + expect + '」');
    if (lk) {
      const tn = lk[2], tt = lk[3];
      const wantN = s.id === 'appendix' ? 'A' : s.id === 'refs' ? 'R' : (expect ? String(expect.match(/\d+/)[0]) : '0');
      if (!PIPE && tn !== wantN) f.push('#toc「' + tt + '」編號 ' + tn + ' 應為 ' + wantN);
      if (tt !== s.title) f.push('#toc 標題「' + tt + '」與 data-title「' + s.title + '」不一致');
    }
  });
  if (ALIAS) Object.keys(ALIAS).forEach((k) => { if (ORDER.indexOf(ALIAS[k]) < 0) f.push('ALIAS ' + k + ' → ' + ALIAS[k] + ' 不是有效章節'); });
  report('chapters', 1, f, sections.length + ' 章；順序、標題、章號、#toc 一致');
}

// hardref：手寫「第 N 章」「第 N 步」
function checkHardref() {
  const re = new RegExp('第\\s*' + NUMRE + '(?:\\s*[、,，–\\-~～和及與]\\s*' + NUMRE + ')*\\s*[章步]|第幾[章步]', 'g');
  const hits = [];
  textSources().forEach((s) => {
    let m; re.lastIndex = 0;
    while ((m = re.exec(s.text))) hits.push(s.file + '：…' + snip(s.text, m.index, m[0].length) + '…');
  });
  const since = 3; // Phase 1–2 WARN；Phase 3 起 FAIL
  if (!hits.length) return emit('PASS', 'hardref', '沒有手寫的章／步編號');
  hits.forEach((h) => emit(PHASE >= since ? 'FAIL' : 'WARN', 'hardref', h));
}

// counts：數量字樣對資料
function checkCounts() {
  const f = [];
  const R = G.R || {};
  const rules = [
    ['個實驗', (R.EXPS || []).length, 'R.EXPS', new RegExp(NUMRE + '\\s*個實驗', 'g')],
    ['個方法', (R.METHODS2 || []).length, 'R.METHODS2', new RegExp(NUMRE + '\\s*個方法', 'g')],
    ['個系統', (G.OTHERS || []).length, 'OTHERS', new RegExp(NUMRE + '\\s*個(?:高相關的)?系統', 'g')],
    ['種架構', (G.PATTERNS || []).length, 'PATTERNS', new RegExp(NUMRE + '\\s*種[^，。、；\\s]{0,4}架構', 'g')],
    ['條可借用', (G.OTHER_LESSONS || []).length, 'OTHER_LESSONS', new RegExp(NUMRE + '\\s*條(?:可借用|落到我們)', 'g')],
    ['個面向', (G.FACETS || []).length, 'FACETS', new RegExp(NUMRE + '\\s*個面向', 'g')]
  ];
  const ids = new Set((R.EXPS || []).map((e) => e.id));
  const maxE = Math.max.apply(null, [...ids].map((i) => +i.slice(1)));
  const srcs = textSources();
  // 某些「N 個方法」是在說別的東西（如「3 個方法」的並排比較），遇到再加白名單
  srcs.forEach((s) => {
    rules.forEach((r) => {
      let m; r[3].lastIndex = 0;
      while ((m = r[3].exec(s.text))) {
        const n = num(m[1]);
        if (!isNaN(n) && n !== r[1]) f.push(s.file + '：「' + m[0] + '」但 ' + r[2] + ' 有 ' + r[1] + ' 筆');
      }
    });
    let m; const eRe = /E(\d+)/g;
    if (/^https?:/.test(s.text)) return; // 網址裡的 E514 之類不算
    while ((m = eRe.exec(s.text))) if (!ids.has('E' + m[1]) && !/[A-Za-z0-9]/.test(s.text.charAt(m.index - 1) || ' ') && !/\d/.test(s.text.charAt(m.index + m[0].length))) f.push(s.file + '：E' + m[1] + ' 不存在於 R.EXPS');
    const rg = /E1\s*[–\-~]\s*E(\d+)/g;
    while ((m = rg.exec(s.text))) if (+m[1] !== maxE) f.push(s.file + '：「' + m[0] + '」但最大編號是 E' + maxE);
  });
  report('counts', 1, [...new Set(f)], '實驗 ' + rules[0][1] + '、方法 ' + rules[1][1] + '、系統 ' + rules[2][1] + '、架構 ' + rules[3][1] + '、做法 ' + rules[4][1] + '、面向 ' + rules[5][1] + ' 與文中字樣一致');
}

// refs（Phase 2 起）：token／data-xref／OURS／SYS
function checkRefs() {
  if (!PIPE) return skip('refs', 2, 'pipeline.js 尚未建立');
  const f = [];
  const tokRe = /\{\{([a-z]+):([^}|]*)(?:\|([^}]*))?\}\}/g;
  const resolve = (tok) => { try { return !!PIPE.ref(tok); } catch (e) { return false; } };
  textSources().forEach((s) => { let m; tokRe.lastIndex = 0; while ((m = tokRe.exec(s.text))) if (!resolve(m[0])) f.push(s.file + '：token ' + m[0] + ' 無法解析'); });
  [...html.matchAll(/data-xref="([^"]*)"/g)].forEach((m) => { if (!resolve(m[1])) f.push('index.html：data-xref ' + m[0] + ' 無法解析'); });
  const stepIds = new Set((G.STEPS || []).map((s) => String(s.id)));
  (PIPE.OURS || []).forEach((o) => { if (o.id !== 'Q' && !stepIds.has(String(o.id))) f.push('OURS ' + o.id + ' 對不到 steps.js'); });
  (PIPE.OURS || []).forEach((o) => { // 長名＝steps.js 的 n；key 指向的 cfg 項目要存在
    const st = (G.STEPS || []).filter((x) => String(x.id) === String(o.id))[0];
    if (!st) return;
    if (o.n !== st.n) f.push('OURS ' + o.id + ' 的長名「' + o.n + '」與 steps.js「' + st.n + '」不同');
    (o.key || []).forEach((k) => { if (!(st.choice.cfg || []).some((r) => r[0] === k)) f.push('OURS ' + o.id + ' 的 key「' + k + '」不在 steps.js choice.cfg'); });
  });
  (PIPE.SYS || []).forEach((s) => { if (!(PIPE.OURS || []).some((o) => (o.sys || []).indexOf(s.id) >= 0)) f.push('SYS ' + s.id + ' 沒有被任何 OURS 使用'); });
  report('refs', 2, f, 'token、xref、OURS、SYS 全部可解析');
}

// slots（Phase 4 起）
function checkSlots() {
  if (!PIPE || !PIPE.SLOTS) return skip('slots', 4, '槽位資料（PIPE.SLOTS）尚未建立');
  if (!G.SLOTDATA || !Object.keys(G.SLOTDATA).length) return skip('slots', 4, 'SLOTDATA 尚未填入（第 4 階段）');
  const f = [];
  const VALID = ['acquire', 'detect', 'track', 'feature', 'score', 'st', 'cluster', 'identify', 'query'];
  (G.STEPS || []).forEach((st) => {
    const slots = (PIPE.SLOTS[st.id] || []).map((s) => s.id);
    const allowed = slots.concat(['extra']);
    (st.groups || []).forEach((g) => (g.cards || []).forEach((c) => {
      const nm = c.x && c.x.n;
      if (c.slots) {
        Object.keys(c.slots).forEach((k) => { if (allowed.indexOf(k) < 0) f.push(nm + '：未知槽位 ' + k); });
        if (c.how) slots.forEach((k) => { if (!(k in c.slots)) f.push(nm + '：缺槽位 ' + k); });
        (c.diff || []).forEach((k) => { if (allowed.indexOf(k) < 0) f.push(nm + '：diff 含未知槽位 ' + k); });
        (c.part || []).forEach((k) => { if (allowed.indexOf(k) < 0) f.push(nm + '：part 含未知槽位 ' + k); });
      } else if (c.how) f.push(nm + '：主要卡缺 slots');
    }));
  });
  (G.OTHERS || []).concat(G.PATTERNS || []).forEach((o) => {
    if (!o.sys) return f.push((o.n || o.id) + '：缺 sys');
    if (o.sys.length !== o.flow.length) f.push((o.n || o.id) + '：sys 與 flow 不等長');
    o.sys.forEach((v) => [].concat(v).forEach((x) => { if (x !== 'extra' && VALID.indexOf(x) < 0) f.push((o.n || o.id) + '：sys 值 ' + x + ' 不合法'); }));
  });
  (G.OTHER_LESSONS || []).forEach((l) => { if (['adopt', 'test', 'later'].indexOf(l[4]) < 0) f.push('lessons「' + l[1] + '」狀態不合法'); });
  report('slots', 4, f, '槽位、diff／part、sys／flow、lessons 狀態皆合法');
}

// offline：只能載入相對路徑且存在的檔案
function checkOffline() {
  const f = [];
  const re = /<(script|link|img)\b[^>]*?\b(src|href)="([^"]*)"/g;
  let m, n = 0;
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(body))) {
    if (m[1] === 'link' && !/rel="stylesheet"|rel="icon"/.test(m[0])) continue;
    n++;
    const u = m[3];
    if (/^([a-z]+:)?\/\//i.test(u) || /^[a-z]+:/i.test(u) || u.charAt(0) === '/') f.push('<' + m[1] + '> ' + u + ' 不是相對路徑');
    else if (!fs.existsSync(J(u.split(/[?#]/)[0]))) f.push('<' + m[1] + '> ' + u + ' 檔案不存在');
  }
  if (/\btype="module"/.test(body)) f.push('不得使用 ES module');
  const css = read('assets/style.css');
  if (/@import|url\(\s*['"]?(https?:)?\/\//.test(css)) f.push('style.css 載入外部資源');
  report('offline', 1, f, n + ' 個資源皆為存在的相對路徑；無 ES module、無外部 CSS');
}

// buttons（Phase 5 起）
function checkButtons() {
  if (!PIPE || !PIPE.BUTTONS) return skip('buttons', 5, 'PIPE.BUTTONS 尚未建立');
  const f = [];
  const labels = PIPE.BUTTONS.map((b) => b.label);
  [...html.matchAll(/class="fp-btn[^"]*"[^>]*>(?:<i><\/i>)?([^<]*)</g)].forEach((m) => { if (!labels.some((l) => m[1].indexOf(l) === 0)) f.push('index.html：.fp-btn「' + m[1] + '」不以 BUTTONS label 開頭'); });
  if (html.indexOf('btn-legend') < 0 && html.indexOf('legend-box') < 0) f.push('缺按鈕圖例');
  report('buttons', 5, f, '按鈕文字與圖例符合規範');
}

// caveats（Phase 3 起）
function checkCaveats() {
  if (!PIPE || !PIPE.CAVEATS) return skip('caveats', 3, 'PIPE.CAVEATS 尚未建立');
  const f = [];
  const all = textSources().map((s) => s.text).join('\n');
  PIPE.CAVEATS.forEach((c) => { const n = (all.match(c.sig) || []).length; if (n > c.max) f.push(c.id + '：出現 ' + n + ' 次，上限 ' + c.max); });
  report('caveats', 3, f, '注意事項重複次數皆在上限內');
}

// headings：各章第一個 h3 之前必有 h2；Phase 3 起 .ch-end 與禁用詞
function checkHeadings() {
  const f = [];
  sections.forEach((s) => {
    const h2 = s.html.search(/<h2[\s>]/), h3 = s.html.search(/<h3[\s>]/);
    if (h3 >= 0 && (h2 < 0 || h3 < h2)) f.push('ch-' + s.id + '：第一個 h3（第 ' + lineOf(html, s.start + h3) + ' 行）出現在任何 h2 之前');
  });
  report('headings', 1, f, '各章 h2 先於 h3');
  const g = [];
  sections.forEach((s) => { if (s.id !== 'home' && s.id !== 'refs' && s.html.indexOf('class="ch-end"') < 0) g.push('ch-' + s.id + '：缺 .ch-end'); });
  const body = stripTags(html);
  if (/3[A-G] /.test(body)) g.push('文字含 3A–3G 前綴');
  if (/架構[一二三四五六]/.test(body)) g.push('文字含「架構一–六」');
  report('headings-ch3', 3, g, '每章有 .ch-end；無 3A–3G、架構一–六');
}

/* ================= smoke（Playwright） ================= */
// 這些 id 的元素只有在使用者操作後才會有內容，不算「空」
const LAZY_EMPTY = new Set(['val-exp-d', 'arch-d', 'pager', 'tip']);

async function smoke() {
  const id = 'smoke';
  if (process.env.CHECK_SKIP_SMOKE) return skip(id, 1, 'CHECK_SKIP_SMOKE 已設定');
  let pw;
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { pw = require(p); break; } catch (e) { /* 試下一個 */ } }
  if (!pw) return emit('WARN', id, 'SKIP：找不到 Playwright');
  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) { return emit('WARN', id, 'SKIP：chromium 無法啟動（' + e.message.split('\n')[0] + '）'); }
  const ALL = !!process.env.CHECK_ALL;
  const url = 'file://' + J('index.html');
  const fails = [];
  const fail = (m) => { fails.push(m); };
  const t0 = Date.now();
  let nAnim = 0, nBtn = 0;

  async function open(route, errs) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    await page.goto(url + '#/' + route);
    await page.waitForTimeout(250);
    return { ctx, page };
  }

  try {
    // 1) 每章：直接用網址開啟（捕捉「直開某章才壞」的問題）
    for (const ch of ORDER) {
      const errs = [];
      const { ctx, page } = await open(ch, errs);
      try {
        await page.evaluate(() => document.querySelectorAll('#main details').forEach((d) => { d.open = true; }));
        await page.waitForTimeout(100);
        const info = await page.evaluate((chId) => {
          const sec = document.getElementById('ch-' + chId);
          const r = { active: sec.classList.contains('active'), empties: [], bad: '' };
          sec.querySelectorAll('table[id], svg[id], div[id]').forEach((el) => {
            if (el.closest('.fp-modal')) return;
            const empty = el.tagName.toLowerCase() === 'svg' ? el.childElementCount === 0 : !el.innerHTML.trim();
            if (empty) r.empties.push(el.tagName.toLowerCase() + '#' + el.id);
          });
          const txt = sec.textContent;
          if (txt.indexOf('{{') >= 0) r.bad += '含「{{」 ';
          if (txt.indexOf('⚠') >= 0) r.bad += '含「⚠」 ';
          return r;
        }, ch);
        if (!info.active) fail('#/' + ch + ' 沒有切換到該章');
        info.empties.filter((e) => !LAZY_EMPTY.has(e.split('#')[1])).forEach((e) => fail('#/' + ch + '：' + e + ' 是空的'));
        if (info.bad) fail('#/' + ch + '：DOM 文字' + info.bad);

        // 2) 動畫按鈕：每章每種抽樣
        const groups = { 'data-fp': '.fp-btn[data-fp]', 'data-mp': '[data-mp]', 'data-op': '[data-op]', 'data-cmp': '[data-cmp]' };
        for (const key of Object.keys(groups)) {
          const count = await page.locator('#ch-' + ch + ' ' + groups[key]).count();
          const pick = ALL ? count : Math.min(count, 3);
          for (let k = 0; k < pick; k++) {
            const i = ALL ? k : Math.floor((k * count) / pick);
            const loc = page.locator('#ch-' + ch + ' ' + groups[key]).nth(i);
            const label = key + '#' + i;
            try {
              await loc.evaluate((el) => el.click());
              await page.waitForSelector('.fp-modal:not([hidden])', { timeout: 3000 });
              const n = await page.evaluate(() => { const s = document.querySelector('.fp-modal .fp-stage'); return s ? s.childElementCount : 0; });
              if (!n) fail('#/' + ch + ' ' + label + '：.fp-stage 是空的');
              nAnim++;
              await page.keyboard.press('Escape');
              await page.waitForSelector('.fp-modal[hidden]', { state: 'attached', timeout: 3000 });
            } catch (e) { fail('#/' + ch + ' ' + label + '：動畫視窗未正常開關（' + e.message.split('\n')[0] + '）'); try { await page.keyboard.press('Escape'); } catch (e2) { /* 忽略 */ } }
          }
        }

        // 3) 一般 .btn：點擊不報錯
        const nb = await page.locator('#ch-' + ch + ' .btn').count();
        const pickB = ALL ? nb : Math.min(nb, 12);
        for (let k = 0; k < pickB; k++) {
          try { await page.locator('#ch-' + ch + ' .btn').nth(ALL ? k : Math.floor((k * nb) / pickB)).evaluate((el) => el.click()); nBtn++; } catch (e) { fail('#/' + ch + ' .btn#' + k + ' 點擊失敗：' + e.message.split('\n')[0]); }
          if (await page.evaluate(() => { const m = document.querySelector('.fp-modal:not([hidden])'); return !!m; })) await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(100);
      } catch (e) { fail('#/' + ch + '：測試中斷（' + e.message.split('\n')[0] + '）'); }
      [...new Set(errs)].forEach((e) => fail('#/' + ch + '：' + e));
      await ctx.close();
    }

    // 4) ALIAS 舊路由、?s=、?o=
    for (const k of Object.keys(ALIAS || {})) {
      const errs = [];
      const { ctx, page } = await open(k, errs);
      const h = await page.evaluate(() => location.hash.split('?')[0]);
      if (h !== '#/' + ALIAS[k]) fail('舊路由 #/' + k + ' 導向 ' + h + '，應為 #/' + ALIAS[k]);
      errs.forEach((e) => fail('舊路由 #/' + k + '：' + e));
      await ctx.close();
    }
    const nSteps = (await (async () => { const errs = []; const { ctx, page } = await open('methods', errs); const n = await page.evaluate(() => document.querySelectorAll('section.step').length); await ctx.close(); return n; })());
    {
      const errs = [];
      const { ctx, page } = await open('methods', errs);
      for (let s = 1; s <= 7; s++) {
        await page.evaluate((s) => { location.hash = '#/methods?s=' + s; }, s);
        await page.waitForTimeout(120);
        if (!(await page.evaluate((s) => !!document.getElementById('step-' + s), s))) fail('?s=' + s + ' 的目標 #step-' + s + ' 不存在');
      }
      if (nSteps < 7) fail('methods 章只有 ' + nSteps + ' 個 section.step');
      errs.forEach((e) => fail('?s=：' + e));
      await ctx.close();
    }
    {
      const errs = [];
      const { ctx, page } = await open('others?o=nvidia', errs);
      await page.waitForTimeout(250);
      if (!(await page.evaluate(() => !!document.getElementById('oth-nvidia')))) fail('?o=nvidia 的目標 #oth-nvidia 不存在');
      errs.forEach((e) => fail('?o=nvidia：' + e));
      await ctx.close();
    }
  } finally { await browser.close(); }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (fails.length) [...new Set(fails)].forEach((m) => emit('FAIL', id, m));
  else emit('PASS', id, '各章 ' + ORDER.length + ' 路由、動畫視窗 ' + nAnim + ' 次、按鈕 ' + nBtn + ' 次、舊路由／?s=／?o= 皆正常（' + secs + ' 秒' + (ALL ? '，全部按鈕' : '，抽樣') + '）');
}

/* ================= 執行 ================= */
(async function main() {
  console.log('tools/check.js — PHASE ' + PHASE + (PIPE ? '（偵測到 pipeline.js）' : ''));
  checkChapters(); checkHardref(); checkCounts(); checkRefs(); checkSlots();
  checkOffline(); checkButtons(); checkCaveats(); checkHeadings();
  try { await smoke(); } catch (e) { emit('FAIL', 'smoke', '例外：' + e.message); }
  console.log('SUMMARY: ' + out.PASS + ' PASS, ' + out.WARN + ' WARN, ' + out.FAIL + ' FAIL');
  process.exit(out.FAIL ? 1 : 0);
})();

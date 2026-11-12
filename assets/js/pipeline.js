/* pipeline.js — 全站單一資料來源：章節、兩層步驟詞彙、槽位、按鈕、交叉引用（token）
   章號、步驟名稱、數量一律由此產生，頁面與資料字串只寫 {{種類:值|格式}}：
     {{ch:others}} 第 3 章 別人怎麼做　{{ch:others|num}} 第 3 章　{{step:3}} ③ 身分線索特徵　{{step:3|short}} ③ 線索特徵　{{step:3|sym}} ③
     {{step:3,4|short}} 多步　{{step:1-6|sym}} ①–⑥　{{grp:3:app}} ③ 外觀　{{slot:4:calib}} ④ 校準　{{sys:cluster}}　{{pat:mtmc}}
     {{exp:E7}} E7（問題）　{{exp:E7|id}} E7　{{count:exps}} 11　{{count:exps|zh}} 十一　{{cav:app-cloth}}　{{cfg:7:間隔門檻}}
   純函式（node 也能跑）：ch、step、ref、fmt、text、zh、slotsOf、base；瀏覽器端另有 resolve(root)。
   資料之間的連結（cfg、卡片名、STEPS…）一律在函式裡延遲查找，載入時不複製。 */
(function (global) {
  'use strict';
  var P = global.PIPE = {};

  /* ---------- 章節（順序＝路由順序；num 依位置自動產生，附錄／參考文獻用字母） ---------- */
  P.CHAPTERS = [
    { id: 'home', title: '總覽', mods: ['home', 'intro', 'steps'],
      takeaway: '目標是重建「誰、何時、去過哪」；難在同制服＋換裝；系統是一條資料流（影像→…→身分），前段不需名冊；三句結論；需要時打開名詞表。' },
    { id: 'problem', title: '問題定義', h1: '問題定義：我們要做出什麼', mods: ['problem', 'primer'],
      takeaway: '範圍（5 人、白天、會換裝、刷卡只輔助）；ReID 怎麼評分（Rank-1、mAP、FPIR）；怎樣算成功；為什麼外觀跨服裝不可靠。' },
    { id: 'others', title: '別人怎麼做', mods: ['others'],
      takeaway: '所有系統都走同一條 9 步線，差別只在跳過、合併、額外與特色；六種架構是在線上強調不同段；沒人同時處理同制服＋換裝；我們組合哪幾種、借了哪幾條做法、{{ch:approach|num}}採用了哪些。' },
    { id: 'methods', title: '方法總覽', mods: ['fusion', 'cues', 'methods', 'openset', 'steps', 'methodplay', 'cmpplay'],
      takeaway: '先懂「線索」；每一步拆成固定槽位，各方法只在一兩個槽位不同，看槽位表就知道差在哪；每步選什麼、為什麼。' },
    { id: 'approach', title: '我們的做法', mods: ['system', 'steps', 'ourplay', 'server'],
      takeaway: '第一版做什麼、為什麼；部署長什麼樣、每天怎麼跑、關鍵判斷怎麼做、身分怎麼一步步確定、存什麼；跑不跑得動；不做什麼與風險。' },
    { id: 'plan', title: '執行計畫', mods: ['roadmap', 'validation', 'camera'],
      takeaway: '哪些已知、哪些未知；資料怎麼拍；{{count:exps}} 個實驗；6 個月查核點。' },
    { id: 'appendix', num: 'A', title: '技術參考', ref: true, mods: ['datasets', 'methods', 'roadmap', 'camera'],
      takeaway: '技術參考：公開資料集、方法完整表、研究空缺。' },
    { id: 'mgmt', num: 'B', title: '專案管理', ref: true, mods: ['qc'],
      takeaway: '專案管理：TRL、MLTRL 與月報範本。' },
    { id: 'refs', num: 'R', title: '參考文獻', ref: true, mods: ['refs'] }
  ];
  // 舊網址（舊版章節）導到新章節
  P.ALIAS = { cues: 'methods', fusion: 'methods', openset: 'methods', system: 'approach', camera: 'plan', deploy: 'plan', validation: 'plan', datasets: 'appendix', qc: 'mgmt', roadmap: 'plan' };

  /** 依目前順序重新計算章號：總覽 0、其餘正文 1、2、3…；附錄與參考文獻保留字母。改 CHAPTERS 順序後呼叫即可。 */
  P.renumber = function () {
    var n = 0;
    P.CHAPTERS.forEach(function (c) {
      var label;
      if (c.ref) label = c.num === 'R' ? c.title : '附錄 ' + c.num;
      else { c.num = String(n++); label = c.num === '0' ? c.title : '第 ' + c.num + ' 章'; }
      // label 是算出來的顯示用字，不列舉（避免被 checker 當成手寫章號）
      Object.defineProperty(c, 'label', { value: label, enumerable: false, configurable: true, writable: true });
    });
  };

  /* ---------- 系統層（每個人員追蹤／辨識系統都有的 9 步；只用名稱、不編號） ---------- */
  P.SYS = [
    { id: 'acquire', n: '取得影像', d: '從攝影機／錄影主機取影片並抽幀', out: '影像' },
    { id: 'detect', n: '找人', d: '每一幀框出人', out: '人框' },
    { id: 'track', n: '串成片段', d: '同一台攝影機內把同一人的框連成一段', out: '片段' },
    { id: 'feature', n: '抽身分特徵', d: '把片段變成可比對的數字（外觀、步態、臉…）', out: '線索特徵' },
    { id: 'score', n: '比對打分', d: '兩段（或查詢與候選）算出一個「像不像」的分數', out: '證據' },
    { id: 'st', n: '加時空約束', d: '用位置與時間排除不可能、或調整分數', out: '約束' },
    { id: 'cluster', n: '歸成同一人', d: '把片段聚成一人一群，給匿名 ID（含跨日連結）', out: '群（匿名 ID）' },
    { id: 'identify', n: '對到身分', d: '群／片段對到名冊或感測器身分，或標未知', out: '身分' },
    { id: 'query', n: '查詢與輸出', d: '報表、事後查詢、人工確認', out: '報表與查詢結果' }
  ];

  /* ---------- 我們的步驟（全站唯一寫法）。n = 長名（與 steps.js 的 n 相同）；one／io／why／ev／tok 是整體架構圖的說明 ---------- */
  P.OURS = [
    { id: 1, sym: '①', short: '偵測', n: '攝影機與人物偵測', sys: ['acquire', 'detect'], in: '影像', out: '人框', play: 's1',
      key: ['輸入', '抽幀', '最小人高'], tok: '影格',
      one: '營區各處的攝影機錄下一整天的影片，夜間批次處理。',
      io: '影片 → 每秒抽 2–5 幀', why: '同一個人會在不同攝影機、不同時間出現；角度、光線、距離都不同，所以同一人看起來可能像另一個人。', ev: 'proven' },
    { id: 2, sym: '②', short: '追蹤', n: '單相機追蹤成片段', sys: ['track'], in: '人框', out: '片段', play: 's2',
      key: ['高分門檻', '軌跡保留', '最短片段'], tok: '片段 #17',
      one: '偵測器框出每個人，追蹤器把同一台攝影機裡連續的框串成一段「片段」。片段內一定是同一人，之後都以片段為單位處理。',
      io: '人框 → 片段（數秒到數十秒）', why: '單一幀的資訊太少，也算不出步態；片段可以累積多幀，並挑出畫質最好的幾幀。', ev: 'proven' },
    { id: 3, sym: '③', short: '線索特徵', n: '身分線索特徵', sys: ['feature'], in: '片段', out: '線索特徵', play: 's3',
      key: ['外觀輸入', '換裝訓練', '步態門檻'], tok: '3 份特徵',
      one: '每段片段分別送進外觀、輪廓步態、骨架步態等專家，各得一個特徵；同時估計這段畫面對每種線索「可不可信」的品質分數 q。',
      io: '片段 → {外觀, 輪廓, 骨架, 臉…} 特徵＋品質 q', why: '沒有一種線索在所有畫面都可靠（見{{ch:methods|num}}{{step:3|short}}的方法解剖台）。品質 q 讓後面的步驟知道該信誰：解析度、遮擋、幀數、俯角都會影響。', ev: 'inferred' },
    { id: 4, sym: '④', short: '融合', n: '換成同一種證據（融合）', sys: ['score'], in: '線索特徵', out: '證據', play: 's4',
      key: ['片段聚合', '品質分層', '證據上下限'], tok: '證據 +4.0',
      one: '兩段片段比對時，各專家給的相似度單位不同。先換算成「證據」：同一人時看到這個分數的機率，比上不同人時的機率（取對數）。各項證據可以直接相加；看不到的線索該項為 0。',
      io: '各線索相似度＋品質 q → 一個總證據值（可換成「同一人的機率」）', why: '直接把 0.8 的外觀分數和 12 的步態距離相加沒有意義；換成證據後，每一項都代表「多支持同一人幾分」。', ev: 'proven' },
    { id: 5, sym: '⑤', short: '時空約束', n: '時空約束', sys: ['st'], in: '片段的位置與時間', out: '約束', play: 's5',
      key: ['最短步行時間', '轉移時間分布'], tok: '通過約束',
      one: '同一個人不可能同時在兩處，也不可能比最短步行時間更快地從一台攝影機走到另一台。違反的配對直接否決，不論長得多像。',
      io: '攝影機位置＋時間戳 → 「不可能是同一人」的配對清單', why: '這條線索完全不看衣服，所以同制服時特別值錢。公開資料上只加時間與相機 ID，Rank-1 就從 91.2 升到 97.2（st-ReID）。', ev: 'proven' },
    { id: 6, sym: '⑥', short: '分群', n: '分群（片段聚成人）', sys: ['cluster'], in: '證據＋約束', out: '群（匿名 ID）', play: 's6',
      key: ['合併門檻 τ', '低信心片段'], tok: '匿名 #2',
      one: '把一天所有片段，由最像的一對開始逐步合併成群；違反約束的合併跳過。最後每一群就是一個「匿名的人」。',
      io: '所有片段的兩兩證據＋約束 → 今日人數、每人的片段與軌跡', why: '這一步不需要資料庫，就能回答「今天出現過幾個不同的人、各自去過哪裡」。要同時報純度：人數數對不代表沒有把兩個人併在一起。', ev: 'inferred' },
    { id: 7, sym: '⑦', short: '比對名冊', n: '比對名冊（刷卡輔助）', sys: ['identify'], in: '群', out: '身分', play: 's7',
      key: ['接受門檻', '間隔門檻', '刷卡證據'], tok: '人員 C',
      one: '把整群（多段證據）拿去和人員名冊比對，門禁刷卡當輔助證據。分數不夠高、或第一名和第二名太接近，就標「未知」，不硬配；刷卡與影像證據不一致時，以影像為準並列入待查（可能是代刷）。',
      io: '匿名的人（＋刷卡紀錄）→ 已註冊身分、「未知-#N」，或「與刷卡不符」', why: '用整群比對比單段穩定；營區會有訪客與新進人員，系統必須能說「不認識」。刷卡可能被代刷，所以只能加分、不能直接決定身分。', ev: 'inferred' },
    { id: 'Q', sym: 'Q', short: '查詢輸出', n: '查詢、報表與人工覆核', sys: ['query'], in: '身分', out: '報表', play: 'output', key: [] }
  ];

  /* 主圖的大階段（不用「融合」當大階段名：③ 是抽特徵，不是融合） */
  P.STAGE_GROUPS = [['感知', [1, 2]], ['身分證據', [3, 4]], ['歸成同一人', [5, 6]], ['對到身分', [7]], ['輸出', ['Q']]];

  /* ---------- 方法層槽位（名稱不編號） ---------- */
  function S(a) { return a.map(function (x) { return { id: x[0], n: x[1], d: x[2] || '' }; }); }
  P.SLOTS = {
    1: S([['input', '輸入與抽幀', '解析度、fps、空場跳過'], ['backbone', '骨幹', '網路主體'], ['head', '偵測頭', '錨框或無錨框、解耦'], ['train', '訓練資料', '預訓練與正樣本指派'], ['post', '後處理與輸出', '信心門檻、最小人高']]),
    2: S([['predict', '預測位置', '下一幀會在哪'], ['cue', '配對依據', '重疊、運動、外觀'], ['assign', '配對規則', '一輪或兩輪匹配'], ['reconnect', '斷了怎麼接', '保留多久、怎麼找回'], ['clean', '片段整理', '切段、淨化']]),
    3: S([['prep', '前處理', '裁切、對齊、取剪影或骨架'], ['rep', '表示方式', 'RGB、剪影、骨架、臉、3D、文字'], ['backbone', '骨幹模型', ''], ['loss', '訓練目標', '損失與訓練資料'], ['agg', '片段聚合', '多幀變一個'], ['out', '輸出', '維度或數值、品質分數']]),
    4: S([['in', '輸入分數', '各線索相似度'], ['quality', '品質處理', '依畫面品質調整'], ['calib', '校準', '換成同一把尺'], ['combine', '組合規則', '怎麼加、相關線索怎麼處理'], ['missing', '缺線索處理', ''], ['out', '輸出', '總證據或機率']]),
    5: S([['where', '位置表示', '相機 ID 或平面圖座標'], ['model', '轉移模型', '硬規則或時間分布'], ['param', '參數來源', '人工量或自動統計'], ['use', '作用方式', '否決或加分'], ['out', '輸出', '']]),
    6: S([['sim', '相似度', ''], ['cons', '約束', ''], ['merge', '合併規則', ''], ['stop', '停止條件', ''], ['except', '例外處理', '低信心、離群片段']]),
    7: S([['gallery', '比對名單', ''], ['unit', '比對單位', '單段或整群'], ['score', '分數來源', ''], ['decide', '決策規則', '門檻、間隔'], ['aux', '輔助證據', '刷卡'], ['out', '輸出狀態', '確認／待確認／未知／不一致']])
  };

  /* 之後的階段才填：槽位表基準、組合條、部署圖、決策流程、身分狀態、每日時程、儲存表 */
  P.BASE = {};
  P.COMBO = [];
  P.DEPLOY = {};
  P.DECISIONS = {};
  P.ID_STATES = {};
  P.DAILY = [];
  P.STORE = [];

  /* ---------- 按鈕（固定三種） ---------- */
  P.BUTTONS = [
    { k: 'anim', label: '▶ 動畫', d: '開一個視窗，逐步播放這個方法、系統或步驟' },
    { k: 'cmp', label: '▶ 並排比較', d: '同一組方法放在一起播，直接看差在哪' },
    { k: 'inline', label: '▶ 播放', d: '圖本身的動畫：播放／❚❚ 暫停；「跳到結果」直接看最後一步' }
  ];

  /* ---------- 注意事項：每項只有一個唯一出處，其他地方只放連結；checker 以 sig 計數、超過 max 即失敗（第 3 階段起） ---------- */
  P.CAVEATS = [
    { id: 'app-cloth', short: '外觀換裝後失效', at: 'methods', a: 'cue-role-app', sig: /換裝後(即)?失效|換裝後.{0,4}不能/g, max: 3 },
    { id: 'face-near', short: '臉只在近距點位可用', at: 'methods', a: 'cue-role-face', sig: /臉[^。；]{0,8}近距點位|近距點位[^。；]{0,8}臉/g, max: 4 },
    { id: 'height-err', short: '身高誤差約 4–9 cm', at: 'methods', a: 'cue-role-body', sig: /誤差\s*4\s*[–-]\s*9\s*cm/g, max: 2 },
    { id: 'card-aux', short: '刷卡可能被代刷，只當輔助', at: 'problem', a: 'role-card', sig: /代刷/g, max: 6 },
    { id: 'lic-legal', short: '授權待法務確認', at: 'approach', a: 'v1-table', sig: /待法務確認|法務確認/g, max: 3 },
    { id: 'same-day', short: '同日同相機成績偏高', at: 'plan', a: 'split-fig', sig: /同日同相機/g, max: 3 }
  ];

  /* ---------- 小工具 ---------- */
  var CIRC = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦', Q: 'Q' };
  var ZH = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  /** 11 → 十一；31 → 三十一；0–99 */
  P.zh = function (n) {
    n = +n;
    if (n < 10) return ZH[n];
    var t = Math.floor(n / 10), o = n % 10;
    return (t > 1 ? ZH[t] : '') + '十' + (o ? ZH[o] : '');
  };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (String(arr[i].id) === String(id)) return arr[i]; return null; }

  P.ch = function (id) { return find(P.CHAPTERS, id); };
  P.step = function (id) { return find(P.OURS, id); };
  P.sys = function (id) { return find(P.SYS, id); };

  /** 卡片的槽位資料（延遲查 SLOTDATA）；steps.js 卡片不加任何欄位 */
  P.slotsOf = function (card) {
    var nm = card && (card.m || (card.x && card.x.n));
    return (global.SLOTDATA && nm && global.SLOTDATA[nm]) || null;
  };
  /** 槽位表第一列：card 型取該卡的 SLOTDATA；ours 型直接回傳組成 */
  P.base = function (key) {
    var b = P.BASE[key];
    if (!b) return null;
    if (b.card) {
      var found = null;
      (global.STEPS || []).forEach(function (st) { (st.groups || []).forEach(function (g) { (g.cards || []).forEach(function (c) { if ((c.m || (c.x && c.x.n)) === b.card) found = c; }); }); });
      return { card: b.card, data: found ? P.slotsOf(found) : null };
    }
    return b;
  };

  /* ---------- 數量 ---------- */
  var COUNTS = {
    exps: function () { return global.R.EXPS.length; },
    methods: function () { return global.R.METHODS2.length; },
    cards: function () { var n = 0; global.STEPS.forEach(function (st) { st.groups.forEach(function (g) { n += g.cards.length; }); }); return n; },
    systems: function () { return global.OTHERS.length; },
    patterns: function () { return global.PATTERNS.length; },
    lessons: function () { return global.OTHER_LESSONS.length; },
    facets: function () { return global.FACETS.length; },
    gloss: function () { return global.GLOSS.length; }
  };
  P.count = function (k) { return COUNTS[k] ? COUNTS[k]() : NaN; };

  /* ---------- token 解析 ---------- */
  // 步驟清單：'3'、'3,4'、'1-6'（也認 –）。回傳 {ids, range}
  function stepList(v) {
    var m = String(v).match(/^(\d)\s*[-–]\s*(\d)$/);
    if (m) { var a = +m[1], b = +m[2], r = []; for (var i = a; i <= b; i++) r.push(i); return { ids: r, range: true }; }
    return { ids: String(v).split(/\s*,\s*/), range: false };
  }
  function stepText(o, f) { return f === 'sym' ? o.sym : f === 'short' ? o.sym + ' ' + o.short : o.sym + ' ' + o.n; }
  function stepHref(o) { return o.id === 'Q' ? '#/approach' : '#/methods?s=' + o.id; }
  function groupName(sid, key) {
    var st = find(global.STEPS || [], sid), r = null;
    if (st) st.groups.forEach(function (g) { if (g.key === key) r = g.n; });
    return r ? r.replace(/^3[A-G]\s+/, '') : null;
  }
  var NESTED = 0;
  /** 解析單一 token → { t: 純文字, h: 連結（或 null）, items: 多連結（步驟清單）} ；失敗回傳 null */
  P.ref = function (token) {
    var m = String(token).match(/^\{\{\s*([a-z]+):([^}|]*?)\s*(?:\|\s*([^}]*?)\s*)?\}\}$/) || String(token).match(/^([a-z]+):([^|]*?)(?:\|(.*))?$/);
    if (!m) return null;
    var kind = m[1], v = m[2], f = m[3] || '', o, x;
    try {
      if (kind === 'ch') {
        o = P.ch(v); if (!o) return null;
        var isRef = !!o.ref, full = isRef ? (o.num === 'R' ? o.title : o.label + (o.title && o.title !== '附錄' ? ' ' + o.title : '')) : (o.num === '0' ? o.title : o.label + ' ' + o.title);
        var t = f === 'num' ? o.label : f === 'n' ? o.num : f === 'title' ? o.title : full;
        return { t: t, h: f === 'n' ? null : '#/' + o.id };
      }
      if (kind === 'step') {
        var L = stepList(v), objs = L.ids.map(function (i) { return P.step(i); });
        if (objs.some(function (z) { return !z; })) return null;
        if (objs.length === 1) return { t: stepText(objs[0], f), h: stepHref(objs[0]) };
        if (L.range) return { t: objs[0].sym + '–' + objs[objs.length - 1].sym, h: stepHref(objs[0]) };
        var items = objs.map(function (z) { return { t: stepText(z, f), h: stepHref(z) }; });
        return { t: items.map(function (z) { return z.t; }).join(f === 'sym' ? '' : '、'), items: items, sep: f === 'sym' ? '' : '、' };
      }
      if (kind === 'grp') {
        var p = v.split(':'), nm = groupName(+p[0], p[1]); o = P.step(+p[0]);
        if (!o || !nm) return null;
        return { t: o.sym + ' ' + nm, h: '#/methods?s=' + o.id };
      }
      if (kind === 'slot') {
        var q = v.split(':'); o = P.step(+q[0]); x = o && find(P.SLOTS[q[0]] || [], q[1]);
        if (!o || !x) return null;
        return { t: o.sym + ' ' + x.n, h: '#/methods?s=' + o.id };
      }
      if (kind === 'sys') { o = P.sys(v); return o ? { t: o.n, h: null } : null; }
      if (kind === 'pat') { o = find(global.PATTERNS || [], v); return o ? { t: o.s || o.n, h: null } : null; }
      if (kind === 'exp') {
        o = find(global.R.EXPS, v); if (!o) return null;
        return { t: f === 'id' ? o.id : o.id + '（' + o.q + '）', h: '#/plan?a=exp-' + o.id };
      }
      if (kind === 'count') { var n = P.count(v); if (isNaN(n)) return null; return { t: f === 'zh' ? P.zh(n) : String(n), h: null }; }
      if (kind === 'cav') { o = find(P.CAVEATS, v); return o ? { t: o.short, h: '#/' + o.at + '?a=' + o.a } : null; }
      if (kind === 'cfg') {
        var c = v.split(':'), st = find(global.STEPS || [], c[0]), row = null;
        if (st) st.choice.cfg.forEach(function (r) { if (r[0] === c[1]) row = r; });
        if (!row) return null;
        var ct = row[1];
        if (NESTED < 2) { NESTED++; try { ct = P.text(ct); } finally { NESTED--; } }
        return { t: ct, h: null };
      }
    } catch (e) { return null; }
    return null;
  };

  var TOKRE = /\{\{\s*([a-z]+):[^}]*\}\}/g;
  function bad(tok) { if (global.console) console.error('無法解析的 token：' + tok); return '⚠'; }
  function link(t, h) { return '<a class="xref" href="' + esc(h) + '">' + esc(t) + '</a>'; }
  /** 字串 → HTML：{{…}} 換成連結（可連的）或文字；其餘 HTML 原樣保留 */
  P.fmt = function (s) {
    s = String(s == null ? '' : s);
    if (s.indexOf('{{') < 0) return s;
    return s.replace(TOKRE, function (tok) {
      var r = P.ref(tok); if (!r) return bad(tok);
      if (r.items) return r.items.map(function (z) { return link(z.t, z.h); }).join(r.sep);
      return r.h ? link(r.t, r.h) : esc(r.t);
    });
  };
  /** 字串 → 純文字（動畫字幕、tooltip、屬性用） */
  P.text = function (s) {
    s = String(s == null ? '' : s);
    if (s.indexOf('{{') < 0) return s;
    return s.replace(TOKRE, function (tok) { var r = P.ref(tok); return r ? r.t : bad(tok); });
  };

  /* ---------- 瀏覽器端：把 DOM 裡的 token 與 data-xref 換成內容 ---------- */
  var PLAIN = { A: 1, BUTTON: 1, SUMMARY: 1, LABEL: 1, OPTION: 1, TEXTAREA: 1, SCRIPT: 1, STYLE: 1, H1: 1, H2: 1, H3: 1, H4: 1 }; // 連結內、標題內只換成文字，不再包連結
  P.resolve = function (root) {
    if (!global.document) return;
    root = root || global.document.body;
    var doc = global.document, w = doc.createTreeWalker(root, 4, null), nodes = [], n;
    while ((n = w.nextNode())) if (n.nodeValue.indexOf('{{') >= 0) nodes.push(n);
    nodes.forEach(function (node) {
      var par = node.parentNode, plain = false, p = par;
      while (p && p !== root.parentNode) { if (PLAIN[p.tagName] || (p.namespaceURI && /svg/.test(p.namespaceURI))) { plain = true; break; } p = p.parentNode; }
      if (plain) { node.nodeValue = P.text(node.nodeValue); return; }
      var h = P.fmt(node.nodeValue);
      if (h.indexOf('<a ') < 0) { var t = doc.createElement('span'); t.innerHTML = h; node.nodeValue = t.textContent; return; }
      var tpl = doc.createElement('template'); tpl.innerHTML = h;
      par.replaceChild(tpl.content, node);
    });
    [].forEach.call(root.querySelectorAll('[title],[aria-label],[alt]'), function (el) {
      ['title', 'aria-label', 'alt'].forEach(function (a) { var v = el.getAttribute(a); if (v && v.indexOf('{{') >= 0) el.setAttribute(a, P.text(v)); });
    });
    [].forEach.call(root.querySelectorAll('[data-xref]'), function (el) {
      var r = P.ref(el.getAttribute('data-xref'));
      if (!r) { el.textContent = '⚠'; if (global.console) console.error('無法解析的 data-xref：' + el.getAttribute('data-xref')); return; }
      el.textContent = r.t;
      if (r.h && el.tagName === 'A' && !el.getAttribute('data-keep-href')) el.setAttribute('href', r.h);
    });
  };

  P.renumber();
})(typeof window !== 'undefined' ? window : global);

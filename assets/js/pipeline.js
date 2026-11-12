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
    { id: 'home', title: '總覽', mods: ['home', 'intro', 'steps', 'pipeview'],
      takeaway: '這個專案要重建「誰、何時、去過哪」；難在同制服再加上換裝；整個系統是一條從影像到身分的資料流，前段不需要名冊；讀完能看懂三句研究結論，需要時可以打開名詞表。' },
    { id: 'problem', title: '問題定義', h1: '問題定義：我們要做出什麼', mods: ['problem', 'primer'],
      takeaway: '先弄清楚範圍（5 人、白天、會換裝、刷卡只輔助）、ReID 怎麼評分（Rank-1、mAP、FPIR）、怎樣才算成功，以及為什麼外觀一旦換裝就不可靠。' },
    { id: 'others', title: '別人怎麼做', mods: ['others', 'pipeview'],
      takeaway: '所有系統都走同一條資料流（影像到身分），差別只在跳過、合併、額外或特色；六種常見架構是在這條線上強調不同的段落；沒有任何系統同時處理同制服與換裝；最後說明我們組合了其中哪幾種、從系統裡歸納出的{{count:lessons|zh}}條可借用做法，以及{{ch:approach|num}}採用了哪幾條。' },
    { id: 'methods', title: '方法總覽', mods: ['fusion', 'cues', 'methods', 'steps', 'pipeview', 'methodplay', 'cmpplay'],
      takeaway: '先懂「線索」，也就是同一個人有哪些可用資訊；每一步拆成固定的槽位，各方法只在一兩個槽位不同，看槽位表就知道差在哪；每一步我們選哪個、為什麼，也在這一章。' },
    { id: 'approach', title: '我們的做法', mods: ['system', 'steps', 'pipeview', 'ourplay', 'server'],
      takeaway: '第一版系統做什麼、為什麼；部署長什麼樣、每天怎麼跑、關鍵判斷怎麼做、身分怎麼一步步確定、存什麼；營區伺服器跑不跑得動；刻意不做什麼與主要風險。' },
    { id: 'plan', title: '執行計畫', mods: ['roadmap', 'validation', 'camera'],
      takeaway: '哪些已經知道、哪些還不知道；自建資料怎麼拍；{{count:exps|zh}}個實驗各自回答什麼問題；六個月的查核點怎麼排。' },
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
    { id: 1, pick: 'YOLOX-S（研究期可並用 YOLOv7 作對照）', sym: '①', short: '偵測', n: '攝影機與人物偵測', sys: ['acquire', 'detect'], in: '影像', out: '人框', play: 's1',
      key: ['輸入', '抽幀', '最小人高'], tok: '影格',
      one: '營區各處的攝影機錄下一整天的影片，夜間批次處理。',
      io: '影片 → 每秒抽 2–5 幀', why: '同一個人會在不同攝影機、不同時間出現；角度、光線、距離都不同，所以同一人看起來可能像另一個人。', ev: 'proven' },
    { id: 2, pick: 'ByteTrack（原倉庫）＋片段淨化', sym: '②', short: '追蹤', n: '單相機追蹤成片段', sys: ['track'], in: '人框', out: '片段', play: 's2',
      key: ['高分門檻', '軌跡保留', '最短片段'], tok: '片段 #17',
      one: '偵測器框出每個人，追蹤器把同一台攝影機裡連續的框串成一段「片段」。片段內一定是同一人，之後都以片段為單位處理。',
      io: '人框 → 片段（數秒到數十秒）', why: '單一幀的資訊太少，也算不出步態；片段可以累積多幀，並挑出畫質最好的幾幀。', ev: 'proven' },
    { id: 3, pick: '外觀 SOLIDER；換裝 CAL；步態 DeepGaitV2＋RTMPose；臉 AdaFace＋MagFace（近距）；身高（弱證據）', sym: '③', short: '線索特徵', n: '身分線索特徵', sys: ['feature'], in: '片段', out: '線索特徵', play: 's3',
      key: ['外觀輸入', '換裝訓練', '步態門檻'], tok: '3 份特徵',
      one: '每段片段分別送進外觀、輪廓步態、骨架步態等專家，各得一個特徵；同時估計這段畫面對每種線索「可不可信」的品質分數 q。',
      io: '片段 → {外觀, 輪廓, 骨架, 臉…} 特徵＋品質 q', why: '沒有一種線索在所有畫面都可靠（見{{ch:methods|num}}{{step:3|short}}的方法解剖台）。品質 q 讓後面的步驟知道該信誰：解析度、遮擋、幀數、俯角都會影響。', ev: 'inferred' },
    { id: 4, pick: '品質加權聚合→似然比校準→品質分層→相關線索合組→相加', sym: '④', short: '融合', n: '換成同一種證據（融合）', sys: ['score'], in: '線索特徵', out: '證據', play: 's4',
      key: ['片段聚合', '品質分層', '證據上下限'], tok: '證據 +4.0',
      one: '兩段片段比對時，各專家給的相似度單位不同。先換算成「證據」：同一人時看到這個分數的機率，比上不同人時的機率（取對數）。各項證據可以直接相加；看不到的線索該項為 0。',
      io: '各線索相似度＋品質 q → 一個總證據值（可換成「同一人的機率」）', why: '直接把 0.8 的外觀分數和 12 的步態距離相加沒有意義；換成證據後，每一項都代表「多支持同一人幾分」。', ev: 'proven' },
    { id: 5, pick: '不可能配對規則＋相機兩兩轉移時間分布', sym: '⑤', short: '時空約束', n: '時空約束', sys: ['st'], in: '片段的位置與時間', out: '約束', play: 's5',
      key: ['最短步行時間', '轉移時間分布'], tok: '通過約束',
      one: '同一個人不可能同時在兩處，也不可能比最短步行時間更快地從一台攝影機走到另一台。違反的配對直接否決，不論長得多像。',
      io: '攝影機位置＋時間戳 → 「不可能是同一人」的配對清單', why: '這條線索完全不看衣服，所以同制服時特別值錢。公開資料上只加時間與相機 ID，Rank-1 就從 91.2 升到 97.2（st-ReID）。', ev: 'proven' },
    { id: 6, pick: '同日約束式平均連結分群；外觀 Cluster Contrast＋少量註冊樣本', sym: '⑥', short: '分群', n: '分群（片段聚成人）', sys: ['cluster'], in: '證據＋約束', out: '群（匿名 ID）', play: 's6',
      key: ['合併門檻 τ', '低信心片段'], tok: '匿名 #2',
      one: '把一天所有片段，由最像的一對開始逐步合併成群；違反約束的合併跳過。最後每一群就是一個「匿名的人」。',
      io: '所有片段的兩兩證據＋約束 → 今日人數、每人的片段與軌跡', why: '這一步不需要資料庫，就能回答「今天出現過幾個不同的人、各自去過哪裡」。要同時報純度：人數數對不代表沒有把兩個人併在一起。', ev: 'inferred' },
    { id: 7, pick: '整群多證據比對＋第一二名間隔＋刷卡輔助與一致性檢查', sym: '⑦', short: '比對名冊', n: '比對名冊（刷卡輔助）', sys: ['identify'], in: '群', out: '身分', play: 's7',
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

  /* ---------- 槽位表第一列：card 型＝取該卡 SLOTDATA；ours 型＝每格 [文字, 提供這格的卡片名]（文字只從 steps.js 的 how／choice／cfg 濃縮） ---------- */
  P.BASE = {
    '1': { card: 'YOLOX-S' },
    '2': { ours: {
      predict: ['卡爾曼濾波預測下一幀位置', 'ByteTrack'],
      cue: ['框重疊度（IoU）；外觀用在片段淨化', 'ByteTrack'],
      assign: ['高分框先配、低分框再撿一輪', 'ByteTrack'],
      reconnect: ['暫時消失的軌跡保留一段時間等它回來', 'ByteTrack'],
      clean: ['前後窗比外觀、身高、位置，突變就切', '片段淨化（自行實作）'] } },
    '3:app': { card: 'SOLIDER Swin-S' },
    '3:cc': { card: 'CAL' },
    '3:gait': { ours: {
      prep: ['人形分割取剪影；關節點取骨架', 'DeepGaitV2-P3D'],
      rep: ['剪影序列；骨架為輔', 'DeepGaitV2-P3D'],
      backbone: ['殘差網路，卷積拆成 2D 空間＋1D 時間', 'DeepGaitV2-P3D'],
      loss: ['三元組損失＋ID 分類損失', 'DeepGaitV2-P3D'],
      agg: ['時間最大池化，水平切帶各自池化', 'DeepGaitV2-P3D'],
      out: ['多條水平帶串接的步態嵌入', 'DeepGaitV2-P3D'] } },
    '3:face': { ours: {
      prep: ['偵測臉並依 5 個特徵點對齊成 112×112', 'SCRFD-2.5GF'],
      rep: ['臉部 RGB', 'AdaFace R100'],
      backbone: ['IResNet-100', 'AdaFace R100'],
      loss: ['自適應邊界損失（低品質臉少學難樣本）', 'AdaFace R100'],
      agg: ['依品質分數加權多幀', 'MagFace'],
      out: ['512 維特徵＋品質分數（特徵長度）', 'MagFace'] } },
    '3:shape': { card: '肢體比例（由骨架估計，自行實作）' },
    '3:body': { card: '單目身高估計（自行實作）' },
    '4': { ours: {
      in: ['每條線索的比對分數（片段先做品質加權聚合）', '品質加權片段聚合'],
      quality: ['依品質分層，各層各估一組分布', '品質條件化（依品質調整證據）'],
      calib: ['同人／不同人分數分布的高度比取對數＝證據', '似然比融合（對數相加）'],
      combine: ['證據相加；相關線索合組，組內最強＋其餘一部分', '相關線索合組（避免重複計算）'],
      missing: ['看不到的線索該項為 0', '似然比融合（對數相加）'],
      out: ['總證據值（可換成同一人的機率）', '似然比融合（對數相加）'] } },
    '5': { ours: {
      where: ['攝影機 ID；平面圖座標用於畫路徑', '畫面座標轉平面圖（單應性）'],
      model: ['硬規則排除不可能；轉移時間分布當證據', '不可能配對規則（cannot-link）'],
      param: ['最短步行時間用平面圖量；轉移時間由標註資料統計', 'st-ReID'],
      use: ['不可能配對否決；時間差機率加入證據', '不可能配對規則（cannot-link）'],
      out: ['不可能配對清單；轉移時間證據', '不可能配對規則（cannot-link）'] } },
    '6': { ours: {
      sim: ['片段兩兩的總證據', '約束式平均連結凝聚分群'],
      cons: ['不可能配對一律不併', '約束式平均連結凝聚分群'],
      merge: ['由平均證據最高的一對開始逐步合併', '約束式平均連結凝聚分群'],
      stop: ['最高平均證據低於合併門檻 τ 即停', '約束式平均連結凝聚分群'],
      except: ['低信心片段嘗試併入最近的群，否則保留未歸群', '約束式平均連結凝聚分群'] } },
    '7': { ours: {
      gallery: ['當日在營或當日刷卡進營的人', '在營區攝影機下建立註冊資料'],
      unit: ['整群（取群內品質最好的前幾段）', '整群多證據比對＋第一第二名間隔'],
      score: ['群內片段與註冊人員的多線索證據', '整群多證據比對＋第一第二名間隔'],
      decide: ['第一名過接受門檻且領先第二名一段間隔', '整群多證據比對＋第一第二名間隔'],
      aux: ['刷卡證據（有上限）；影像與刷卡不符則標待查', '刷卡紀錄當輔助證據與一致性檢查'],
      out: ['確認／待確認／未知-#N／與刷卡不符', '整群多證據比對＋第一第二名間隔'] } }
  };
  // 我們的組合：每格對到哪種架構（pat 取自 others.js PATTERNS）；steps 為我們的步驟 id
  P.COMBO = [
    { pat: 'mtmc', steps: [1, 2] }, { pat: 'bio', steps: [3, 4] }, { pat: 'archive', steps: [5, 6] },
    { pat: 'anchor', steps: [7] }, { pat: 'bind', steps: [7] }, { pat: 'search', steps: ['Q'] }
  ];

  /* ---------- D7 部署架構：kind＝cam／store／proc／db／ui／ext；step＝對應我們的步驟（可無） ---------- */
  P.DEPLOY = {
    nodes: [
      { id: 'cam', col: 0, row: 1, kind: 'cam', t: '路邊攝影機 ×N', d: '營區各處既有的攝影機；數量與點位以現場為準。' },
      { id: 'nvr', col: 1, row: 1, kind: 'store', t: '錄影主機（既有）', d: '白天照常錄影，存在既有的錄影主機；系統不另存原始錄影。' },
      { id: 'export', col: 2, row: 1, kind: 'proc', t: '夜間匯出', d: '夜間把當天錄影匯出給營區伺服器，離線處理。' },
      { id: 'srv', col: 3, row: 1, kind: 'proc', t: '營區伺服器', d: '依序跑解碼、偵測與追蹤、線索特徵、融合與分群、比對名冊。', steps: [1, 2, 3, 4, 5, 6, 7],
        parts: [{ t: '解碼', steps: [] }, { t: '偵測、追蹤', steps: [1, 2] }, { t: '線索特徵', steps: [3] }, { t: '融合、時空、分群', steps: [4, 5, 6] }, { t: '比對名冊', steps: [7] }] },
      { id: 'db', col: 4, row: 1, kind: 'db', t: '資料庫', d: '片段索引、特徵、群、身分結果、覆核紀錄；各類資料分開保存。', steps: ['Q'] },
      { id: 'ui', col: 5, row: 1, kind: 'ui', t: '查詢介面', d: '報表、事後查詢、人工覆核。', steps: ['Q'] },
      { id: 'acl', col: 3, row: 0, kind: 'ext', t: '門禁系統（刷卡）', d: '只讀取刷卡紀錄，作為輔助證據；不複製、不單獨決定身分。', steps: [7] },
      { id: 'roster', col: 3, row: 2, kind: 'ext', t: '人員名冊／註冊資料', d: '名冊與在營區攝影機下拍的多服裝註冊資料；與匿名軌跡分開保存。', steps: [7] }
    ],
    edges: [
      { from: 'cam', to: 'nvr', label: '錄影' }, { from: 'nvr', to: 'export', label: '白天錄、夜間匯出' }, { from: 'export', to: 'srv' },
      { from: 'srv', to: 'db', label: '結果' }, { from: 'db', to: 'ui' },
      { from: 'acl', to: 'srv', label: '刷卡' }, { from: 'roster', to: 'srv', label: '名冊' },
      { from: 'ui', to: 'roster', label: '人工覆核：更新註冊資料與門檻（每週）', kind: 'feedback' }
    ]
  };

  /* ---------- D9 決策流程：節點的 cfg 以 {cfg:[步,'項目名']} 引用 steps.js，不複製數值 ---------- */
  P.DECISIONS = {
    gate: { title: '③ 線索可用條件：每段片段逐條線索檢查', nodes: [
      { id: 'face-c', kind: 'cue', color: 'var(--c-face)', t: '臉', col: 0, row: 0 },
      { id: 'face-t', kind: 'test', t: '兩眼間距、品質夠？', cfg: { cfg: [3, '臉的門檻'] }, col: 1, row: 0 },
      { id: 'face-u', kind: 'use', t: '✓ 用', col: 2, row: 0 },
      { id: 'face-s', kind: 'skip', t: '✗ 不用（證據 0）', col: 2, row: 1 },
      { id: 'tag-c', kind: 'cue', color: 'var(--olive)', t: '名牌', col: 0, row: 2 },
      { id: 'tag-t', kind: 'test', t: '近距點位、人夠大？', cfg: { cfg: [3, '名牌與階級章'] }, col: 1, row: 2 },
      { id: 'tag-u', kind: 'use', t: '✓ 用', col: 2, row: 2 },
      { id: 'tag-s', kind: 'skip', t: '✗ 不用（證據 0）', col: 2, row: 3 },
      { id: 'gait-c', kind: 'cue', color: 'var(--c-gait)', t: '步態', col: 0, row: 4 },
      { id: 'gait-t', kind: 'test', t: '連續走夠久？', cfg: { cfg: [3, '步態門檻'] }, col: 1, row: 4 },
      { id: 'gait-u', kind: 'use', t: '✓ 用', col: 2, row: 4 },
      { id: 'gait-s', kind: 'skip', t: '✗ 不用（證據 0）', col: 2, row: 5 },
      { id: 'app-c', kind: 'cue', color: 'var(--c-app)', t: '外觀', col: 0, row: 6 },
      { id: 'app-t', kind: 'test', t: '要比的是同一天？', note: '外觀只用在同一天內；換裝後不可靠', col: 1, row: 6 },
      { id: 'app-u', kind: 'use', t: '✓ 用', col: 2, row: 6 },
      { id: 'app-s', kind: 'skip', t: '✗ 不用（證據 0）', col: 2, row: 7 },
      { id: 'ht-c', kind: 'cue', color: 'var(--c-3d)', t: '身高', col: 0, row: 8 },
      { id: 'ht-t', kind: 'test', t: '全身可見？', cfg: { cfg: [3, '身高'] }, col: 1, row: 8 },
      { id: 'ht-u', kind: 'use', t: '✓ 用', col: 2, row: 8 },
      { id: 'ht-s', kind: 'skip', t: '✗ 不用（證據 0）', col: 2, row: 9 }
    ], edges: [
      { from: 'face-c', to: 'face-t' }, { from: 'face-t', to: 'face-u', label: '是' }, { from: 'face-t', to: 'face-s', label: '否' },
      { from: 'tag-c', to: 'tag-t' }, { from: 'tag-t', to: 'tag-u', label: '是' }, { from: 'tag-t', to: 'tag-s', label: '否' },
      { from: 'gait-c', to: 'gait-t' }, { from: 'gait-t', to: 'gait-u', label: '是' }, { from: 'gait-t', to: 'gait-s', label: '否' },
      { from: 'app-c', to: 'app-t' }, { from: 'app-t', to: 'app-u', label: '是' }, { from: 'app-t', to: 'app-s', label: '否' },
      { from: 'ht-c', to: 'ht-t' }, { from: 'ht-t', to: 'ht-u', label: '是' }, { from: 'ht-t', to: 'ht-s', label: '否' }
    ] },
    shape: { title: '④ 體型組', nodes: [
      { id: 'gait', kind: 'in', t: '步態', cfg: { cfg: [3, '步態門檻'] }, col: 0, row: 0 },
      { id: 'cal', kind: 'in', t: '換裝（CAL）', cfg: { cfg: [3, '換裝訓練'] }, col: 0, row: 1 },
      { id: 'ht', kind: 'in', t: '身高', cfg: { cfg: [3, '身高'] }, col: 0, row: 2 },
      { id: 'prop', kind: 'in', t: '肢體比例', col: 0, row: 3 },
      { id: 'pool', kind: 'proc', t: '體型組：四項證據放在一起', col: 1, row: 1 },
      { id: 'best', kind: 'proc', t: '取最強的一項', col: 2, row: 0 },
      { id: 'rest', kind: 'proc', t: '其餘各取一部分', col: 2, row: 2 },
      { id: 'cap', kind: 'out', t: '合為體型組證據，並設上限', cfg: { cfg: [4, '體型組'] }, col: 3, row: 1 }
    ], edges: [
      { from: 'gait', to: 'pool' }, { from: 'cal', to: 'pool' }, { from: 'ht', to: 'pool' }, { from: 'prop', to: 'pool' },
      { from: 'pool', to: 'best' }, { from: 'pool', to: 'rest' },
      { from: 'best', to: 'cap' }, { from: 'rest', to: 'cap' }
    ] },
    identify: { title: '⑦ 確認、待確認、未知與刷卡不一致', nodes: [
      { id: 'list', kind: 'proc', t: '縮小名單', cfg: { cfg: [7, '比對名單'] }, col: 0, row: 1 },
      { id: 'grp', kind: 'proc', t: '整群比對', cfg: { cfg: [7, '取前 k 段'] }, col: 1, row: 1 },
      { id: 'acc', kind: 'test', t: '第一名過接受門檻？', cfg: { cfg: [7, '接受門檻'] }, col: 2, row: 1 },
      { id: 'gap', kind: 'test', t: '領先第二名夠多？', cfg: { cfg: [7, '間隔門檻'] }, col: 3, row: 1 },
      { id: 'ok', kind: 'end', t: '確認：人員 X', col: 4, row: 0 },
      { id: 'maybe', kind: 'end', t: '待確認（交人工覆核）', col: 4, row: 1 },
      { id: 'unk', kind: 'end', t: '未知-#N', col: 3, row: 2 },
      { id: 'card', kind: 'test', t: '刷卡與影像一致？', cfg: { cfg: [7, '刷卡證據'] }, col: 2, row: 3 },
      { id: 'flag', kind: 'flag', t: '尾隨與刷卡疑點（只標記）', cfg: { cfg: [7, '尾隨與代刷'] }, col: 4, row: 3 },
      { id: 'mis', kind: 'flag', t: '與刷卡不符（列入待查）', col: 4, row: 4 }
    ], edges: [
      { from: 'list', to: 'grp' }, { from: 'grp', to: 'acc' },
      { from: 'acc', to: 'gap', label: '是' }, { from: 'acc', to: 'unk', label: '否' },
      { from: 'gap', to: 'ok', label: '是' }, { from: 'gap', to: 'maybe', label: '否' },
      { from: 'grp', to: 'card' }, { from: 'card', to: 'flag', label: '門口有疑點' }, { from: 'card', to: 'mis', label: '身分不同' }
    ] }
  };

  /* ---------- D10 身分狀態圖 ---------- */
  P.ID_STATES = {
    nodes: [
      { id: 'seg', col: 0, row: 1, t: '片段', d: '同一台攝影機內的一段，片段內是同一人。', step: 2 },
      { id: 'day', col: 1, row: 1, t: '日內匿名 ID', d: '同一天內聚成一人一群。', step: 6 },
      { id: 'glob', col: 2, row: 1, t: '全域匿名 ID', d: '跨日連結，只用臉、步態、身高。', step: 6 },
      { id: 'ok', col: 3, row: 0, t: '已確認：人員 X', d: '整群比對過門檻且領先第二名。', step: 7, kind: 'end' },
      { id: 'maybe', col: 3, row: 1, t: '待確認', d: '證據不夠明確，交人工覆核。', step: 7, kind: 'mid' },
      { id: 'unk', col: 3, row: 2, t: '未知-#N', d: '名冊裡找不到足夠相近的人（訪客、新進人員）。', step: 7, kind: 'end' },
      { id: 'none', col: 1, row: 2, t: '未歸群', d: '低信心片段，證據不足就保留，不硬併。', step: 6, kind: 'end' },
      { id: 'flag', col: 3, row: 3, t: '刷卡不一致旗標', d: '影像判定與刷卡不同，列入待查；只標記。', step: 7, kind: 'flag' }
    ],
    edges: [
      { from: 'seg', to: 'day', label: '同日分群', step: 6 }, { from: 'day', to: 'glob', label: '跨日連結', step: 6 },
      { from: 'glob', to: 'ok', label: '比對名冊', step: 7 }, { from: 'glob', to: 'maybe', step: 7 }, { from: 'glob', to: 'unk', step: 7 },
      { from: 'seg', to: 'none', label: '低信心' },
      { from: 'maybe', to: 'ok', label: '人工覆核' }, { from: 'maybe', to: 'unk', label: '人工覆核' },
      { from: 'ok', to: 'flag', label: '刷卡不一致', kind: 'dash' }
    ],
    anim: 'layers'
  };

  /* ---------- D8 每日時程：時間都是示意（與 ourplay 的 o_day 一致：白天錄影、夜間批次）；週列是每週回饋 ---------- */
  P.DAILY = [
    { id: 'rec', band: 'day', t: '白天錄影', from: 6, to: 22, mark: '示意', d: '路邊攝影機照常錄影，存在既有錄影主機。' },
    { id: 'batch', band: 'night', t: '夜間批次處理', from: 22, to: 6, mark: '示意', d: '匯出當天錄影，依序跑完七步。', steps: [1, 2, 3, 4, 5, 6, 7] },
    { id: 'report', band: 'morning', t: '早上報表', from: 7, to: 8, mark: '示意', d: '每人時間與地點；低信心連結列入待覆核。', steps: ['Q'] },
    { id: 'review', band: 'morning', t: '人工覆核', from: 8, to: 10, mark: '示意', d: '覆核待確認與刷卡不一致的項目。', steps: ['Q'] },
    { id: 'wk1', band: 'week', t: '加入人工確認的配對（半監督）', cfg: { cfg: [6, '半監督'] }, d: '每週把覆核確認的配對加入訓練。' },
    { id: 'wk2', band: 'week', t: '重掃合併門檻 τ', cfg: { cfg: [6, '合併門檻 τ'] }, d: '用標註資料重新掃描門檻。' },
    { id: 'wk3', band: 'week', t: '更新註冊資料', cfg: { cfg: [7, '註冊資料'] }, d: '新進人員與服裝變化補進註冊。' }
  ];

  /* ---------- D11 存什麼、存多久：期限一律「待核定」；引用 OTHER_GOV「資料用完即刪、保存期限」 ---------- */
  P.STORE = [
    { data: '原始錄影', step: 1, where: '錄影主機（既有）', keep: '依現行規定；系統不另存', who: '依現行規定' },
    { data: '片段索引與縮圖', step: 2, where: '營區伺服器資料庫', keep: '待核定', who: '待核定' },
    { data: '特徵', step: 3, where: '營區伺服器資料庫', keep: '待核定', who: '待核定' },
    { data: '匿名群與軌跡', step: 6, where: '營區伺服器資料庫', keep: '待核定', who: '待核定' },
    { data: '身分結果與報表', step: 7, where: '營區伺服器資料庫', keep: '待核定', who: '待核定' },
    { data: '註冊資料', step: 7, where: '營區伺服器（與匿名軌跡分開保存）', keep: '待核定', who: '待核定' },
    { data: '刷卡紀錄', step: 7, where: '門禁系統（只讀、不複製）', keep: '依門禁系統現行規定', who: '依門禁系統現行規定' },
    { data: '人工覆核紀錄', step: 'Q', where: '營區伺服器資料庫', keep: '待核定', who: '待核定' }
  ];
  P.STORE_NOTE = { gov: '資料用完即刪、保存期限' };

  /* ---------- 按鈕（固定三種） ---------- */
  P.BUTTONS = [
    { k: 'anim', label: '▶ 動畫', d: '開一個視窗，逐步播放這個方法、系統或步驟' },
    { k: 'cmp', label: '▶ 並排比較', d: '同一組方法放在一起播，直接看差在哪' },
    { k: 'inline', label: '▶ 播放', d: '圖本身的動畫：播放／❚❚ 暫停；「跳到結果」直接看最後一步' }
  ];

  /* ---------- 注意事項：每項只有一個唯一出處，其他地方只放連結；checker 以 sig 計數、超過 max 即失敗（第 3 階段起） ---------- */
  // sig 只算「把這個注意事項再講一遍」的字句：整格就是這句的結構化判斷（方法卡「在我們條件下」表的格子）、欄位名稱不算。
  // max 依目前資料設定；超過就代表有人又在別處重述，請改成 {{cav:…}} 連結。
  P.CAVEATS = [
    { id: 'app-cloth', short: '外觀換裝後失效', at: 'methods', a: 'cue-role-app', sig: /(?<=.)換裝後(即)?失效|換裝後.{0,4}不能/g, max: 3 },
    { id: 'face-near', short: '臉只在近距點位可用', at: 'methods', a: 'cue-role-face', sig: /臉(?:只|僅|限)[^。；]{0,8}近距點位|臉（近距點位|限近距點位|近距點位[^。；]{0,3}臉/g, max: 9 },
    { id: 'height-err', short: '身高誤差約 4–9 cm', at: 'methods', a: 'cue-role-body', sig: /(?:誤差|MAE)[^。；]{0,4}4\s*[–-]\s*9\s*cm/g, max: 2 },
    { id: 'card-aux', short: '刷卡可能被代刷，只當輔助', at: 'problem', a: 'role-card', sig: /(?<!與)代刷/g, max: 13 },
    { id: 'lic-legal', short: '授權待法務確認', at: 'approach', a: 'v1-table', sig: /待法務確認|法務確認/g, max: 4 },
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

/* ============================================================
   data.js — 全站資料（論文、資料集、身分線索、證據）
   證據等級：
     proven   = 原論文實驗直接支持
     inferred = 由多篇文獻推導的合理工程判斷
     open     = 尚未有直接證據，需自行實驗
   「待核對」= 2026 新文獻，數字取自前次研究報告，尚未逐一回到原文核對
   ============================================================ */
window.DATA = (function () {
  'use strict';

  // 身分線索（固定色，全站一致）
  var CUES = [
    { id: 'app', name: 'RGB 外觀', color: 'var(--c-app)', hex: '#2a78d6',
      what: '衣服顏色、紋理、配件、髮型、鞋子等可見外觀。',
      props: { cloth: 4, video: 0, view: 2, occ: 1, lowres: 2, longterm: 1, cost: 1 },
      fail: '同制服、換衣、攝影機色偏', pair: '步態／骨架' },
    { id: 'clip', name: 'CLIP 嵌入', color: 'var(--c-app)', hex: '#2a78d6',
      what: '大型視覺語言預訓練模型的語意特徵；泛化好，但語意上仍會「看到衣服」。',
      props: { cloth: 3, video: 0, view: 2, occ: 2, lowres: 2, longterm: 2, cost: 2 },
      fail: '把「穿迷彩服的人」當成主要語意', pair: '骨架／步態' },
    { id: 'face', name: '臉部', color: 'var(--c-face)', hex: '#6250d6',
      what: '高辨識力且幾乎不受衣服影響，但監視器常拍不到。',
      props: { cloth: 0, video: 0, view: 1, occ: 1, lowres: 0, longterm: 4, cost: 2 },
      fail: '背面、遠距、帽子／口罩', pair: '步態' },
    { id: 'head', name: '頭部', color: 'var(--c-face)', hex: '#6250d6',
      what: '頭型、髮際、帽下輪廓；比臉更常可見，但帽子會遮掉。',
      props: { cloth: 2, video: 0, view: 2, occ: 2, lowres: 2, longterm: 2, cost: 1 },
      fail: '統一軍帽、髮型改變', pair: '體型／步態' },
    { id: 'skel', name: '骨架', color: 'var(--c-skel)', hex: '#eb6834',
      what: '關節點座標與肢段長度；幾乎不含衣服紋理。',
      props: { cloth: 0, video: 1, view: 3, occ: 1, lowres: 1, longterm: 4, cost: 2 },
      fail: '關節點漂移、缺漏（取決於姿態估計器）', pair: '輪廓' },
    { id: 'pose', name: '姿態動態', color: 'var(--c-gait)', hex: '#d55181',
      what: '關節隨時間的角度變化：步頻、擺臂幅度、膝屈曲型態。',
      props: { cloth: 0, video: 4, view: 3, occ: 1, lowres: 1, longterm: 4, cost: 2 },
      fail: '幀率太低、姿態雜訊', pair: '體型' },
    { id: 'sil', name: '輪廓', color: 'var(--c-sil)', hex: '#1baf7a',
      what: '人形二值遮罩；保留密集的身形，但外套與裝備會改變輪廓。',
      props: { cloth: 2, video: 1, view: 2, occ: 2, lowres: 2, longterm: 3, cost: 2 },
      fail: '分割錯誤、厚衣、背包裝備', pair: '骨架' },
    { id: 'gait', name: '步態', color: 'var(--c-gait)', hex: '#d55181',
      what: '輪廓或骨架序列整體學到的行走模式；需要走路畫面。',
      props: { cloth: 1, video: 4, view: 2, occ: 2, lowres: 2, longterm: 4, cost: 3 },
      fail: '沒有在走、軌跡太短、視角大幅改變', pair: '外觀' },
    { id: 'body', name: '體型', color: 'var(--c-3d)', hex: '#9a7b12',
      what: '肩寬、胸腰比例、整體身形。',
      props: { cloth: 2, video: 1, view: 2, occ: 1, lowres: 1, longterm: 3, cost: 2 },
      fail: '衣物改變可見輪廓', pair: '步態' },
    { id: 'anthro', name: '人體比例', color: 'var(--c-3d)', hex: '#9a7b12',
      what: '腿長／身高、肩寬／身高等比例；理論上跨視角穩定。',
      props: { cloth: 0, video: 1, view: 3, occ: 1, lowres: 1, longterm: 4, cost: 2 },
      fail: '透視、尺度校正、姿態誤差', pair: '步態' },
    { id: 'smpl', name: '3D 人體 / SMPL', color: 'var(--c-3d)', hex: '#9a7b12',
      what: '從單眼影像重建 3D 人體形狀與姿態參數。',
      props: { cloth: 0, video: 1, view: 4, occ: 2, lowres: 0, longterm: 4, cost: 4 },
      fail: '單眼重建誤差、遠距低解析', pair: '外觀' }
  ];
  var CUE_PROPS = [
    { k: 'cloth', name: '衣服依賴', good: 'low', tip: '越低越適合同制服' },
    { k: 'video', name: '需要影片', good: 'low', tip: '越高越依賴連續影格' },
    { k: 'view', name: '跨視角', good: 'high', tip: '越高越穩定' },
    { k: 'occ', name: '抗遮擋', good: 'high', tip: '越高越穩定' },
    { k: 'lowres', name: '低解析', good: 'high', tip: '遠距小人形下仍可用的程度' },
    { k: 'longterm', name: '長期穩定', good: 'high', tip: '數週、數月後是否仍相同' },
    { k: 'cost', name: '計算成本', good: 'low', tip: '越高越貴' }
  ];

  // 方法族群（用於分類與上色）
  var FAMILIES = [
    { id: 'appearance', name: '外觀 ReID', color: '#2a78d6' },
    { id: 'cloth', name: '換衣／去衣服', color: '#6250d6' },
    { id: 'uniform', name: '同制服細粒度', color: '#4f5c30' },
    { id: 'gait', name: '步態', color: '#eb6834' },
    { id: 'fusion', name: '多模態／融合', color: '#1baf7a' },
    { id: 'dg', name: '泛化／開放集', color: '#9a7b12' }
  ];

  // 方法：stages 的 kind = in / pre / model / train / emb / match
  var METHODS = [
    { id: 'transreid', name: 'TransReID', venue: 'ICCV 2021', fam: 'appearance', ref: 'transreid',
      problem: '一般影像 ReID', input: '單張 RGB', cue: ['app'], clothDep: 4, videoNeed: 0, uniform: 1,
      learns: '全域 + 局部 patch 外觀；SIE 把攝影機／視角編碼成可學習嵌入',
      stages: [
        { k: 'in', t: '人形裁切', s: '3×256×128' },
        { k: 'pre', t: '重疊切 patch', s: 'N×768' },
        { k: 'model', t: '+ SIE 攝影機/視角嵌入', s: 'camera id, view id' },
        { k: 'model', t: 'ViT 編碼器', s: 'N×768' },
        { k: 'model', t: 'JPM 重排 patch', s: 'k 個局部群組' },
        { k: 'emb', t: '全域 ⊕ 局部特徵', s: '(1+k)×768' },
        { k: 'match', t: '距離排序', s: 'query ↔ gallery' }],
      plus: '強基準；顯式處理攝影機偏差', minus: '沒有機制壓制衣服線索', uniformNote: '作為「純外觀能做到哪裡」的基準。' },
    { id: 'clipreid', name: 'CLIP-ReID', venue: 'AAAI 2023', fam: 'appearance', ref: 'clipreid',
      problem: '一般影像 ReID（無文字標註）', input: '單張 RGB', cue: ['clip'], clothDep: 3, videoNeed: 0, uniform: 1,
      learns: '先為每個 ID 學一組文字 token，再用它監督影像編碼器微調',
      stages: [
        { k: 'in', t: '人形裁切', s: '3×256×128' },
        { k: 'train', t: '階段一：學 ID 文字 token', s: '影像/文字編碼器凍結' },
        { k: 'train', t: '階段二：用文字特徵監督', s: 'ID + triplet + i2t 損失' },
        { k: 'model', t: 'CLIP 影像編碼器', s: 'ViT-B/16 或 RN50' },
        { k: 'emb', t: '視覺嵌入', s: '推論時不用文字' },
        { k: 'match', t: '餘弦距離', s: 'query ↔ gallery' }],
      plus: '預訓練表徵強、泛化好', minus: '文字監督 ≠ 衣服不變性', uniformNote: '你目前已有的工具之一；適合當外觀專家，但需搭配非外觀線索。' },
    { id: 'cal', name: 'CAL', venue: 'CVPR 2022', fam: 'cloth', ref: 'cal',
      problem: '換衣 ReID（只用 RGB）', input: '單張或序列 RGB', cue: ['app'], clothDep: 2, videoNeed: 0, uniform: 2,
      learns: '訓練一個衣服分類器，再用對抗損失讓骨幹特徵「分不出同一人的不同衣服」',
      stages: [
        { k: 'in', t: 'RGB 裁切', s: '需要衣服標籤' },
        { k: 'model', t: 'ResNet-50 骨幹', s: '2048-D' },
        { k: 'train', t: '衣服分類器', s: '學會辨認衣服' },
        { k: 'train', t: 'CAL 對抗損失', s: '讓骨幹騙過衣服分類器' },
        { k: 'emb', t: '去衣服化嵌入', s: '2048-D' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '不需額外輪廓／深度模型', minus: '證明的是「同人換衣」，不是「不同人同衣」', uniformNote: '提供壓制衣服捷徑的訓練技巧，可移植到同制服設定。',
      result: 'CCVID 換衣協定 Rank-1 81.7%、mAP 79.6%' },
    { id: 'fsam', name: 'FSAM', venue: 'CVPR 2021', fam: 'cloth', ref: 'fsam',
      problem: '換衣 ReID', input: 'RGB（訓練時加身形）', cue: ['app', 'body'], clothDep: 2, videoNeed: 0, uniform: 2,
      learns: '身形分支與外觀分支互相學習，把細緻的體型知識灌進外觀特徵',
      stages: [
        { k: 'in', t: 'RGB 裁切', s: '' },
        { k: 'train', t: '身形分支（遮罩/輪廓）', s: '只在訓練時' },
        { k: 'model', t: '外觀分支', s: '' },
        { k: 'train', t: '互學習蒸餾', s: '身形 → 外觀' },
        { k: 'emb', t: '外觀嵌入（含體型知識）', s: '推論只用外觀分支' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '推論成本與一般 ReID 相同', minus: '衣服仍會改變看得到的輪廓', uniformNote: '「訓練時借用結構線索、推論時只用 RGB」的思路值得參考。' },
    { id: 'fgpr', name: 'FGPR', venue: 'IJCV 2020', fam: 'uniform', ref: 'fgpr',
      problem: '同制服細粒度 ReID', input: 'RGB 影片', cue: ['app', 'pose'], clothDep: 1, videoNeed: 3, uniform: 4,
      learns: '影片中的局部動態姿態 + 全域外觀',
      stages: [
        { k: 'in', t: 'RGB 序列', s: '同組人穿同制服' },
        { k: 'pre', t: '姿態／局部區域', s: '' },
        { k: 'model', t: '局部動態姿態特徵', s: '' },
        { k: 'model', t: '全域外觀特徵', s: '' },
        { k: 'emb', t: '序列表徵', s: '' },
        { k: 'match', t: '序列比對', s: '' }],
      plus: '問題定義與你的情境最吻合', minus: '2020 年方法、資料規模小', uniformNote: '目前最直接的同制服證據來源。' },
    { id: 'gpgait', name: 'GPGait', venue: 'ICCV 2023', fam: 'gait', ref: 'gpgait',
      problem: '跨資料集的骨架步態', input: '關節點序列', cue: ['skel', 'pose'], clothDep: 0, videoNeed: 4, uniform: 3,
      learns: '關節拓撲、肢段比例、關節運動；HOT/HOD 把不同資料集的姿態轉成一致表示',
      stages: [
        { k: 'in', t: '影片', s: 'T 幀' },
        { k: 'pre', t: '姿態估計', s: 'T×17×2 關節點' },
        { k: 'pre', t: 'HOT 人體導向轉換', s: '平移/縮放/旋轉正規化' },
        { k: 'pre', t: 'HOD 人體導向描述子', s: '關節＋骨段＋角度' },
        { k: 'model', t: 'PAGCN 部位感知圖卷積', s: '' },
        { k: 'emb', t: '步態嵌入', s: '' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '專為跨資料集泛化設計', minus: '沒有密集身形；強烈依賴姿態品質', uniformNote: '高度相關：一般 RGB 攝影機即可取得骨架。' },
    { id: 'skeletongait', name: 'SkeletonGait', venue: 'AAAI 2024', fam: 'gait', ref: 'skeletongait',
      problem: '骨架步態', input: '關節點序列 → 骨架圖', cue: ['skel', 'pose'], clothDep: 0, videoNeed: 4, uniform: 3,
      learns: '把關節與骨段畫成高斯熱圖（skeleton map），沿用輪廓步態的 CNN 架構',
      stages: [
        { k: 'in', t: '影片', s: 'T 幀' },
        { k: 'pre', t: '姿態估計', s: 'T×17×2' },
        { k: 'pre', t: '高斯骨架圖', s: 'T×2×64×44' },
        { k: 'model', t: '步態 CNN（DeepGaitV2 類）', s: '' },
        { k: 'model', t: '時間池化', s: '' },
        { k: 'emb', t: '步態嵌入', s: '' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '骨架變成「影像」，可重用成熟 CNN', minus: '上游關節點仍是瓶頸', uniformNote: '同上；SkeletonGait++ 再加上輪廓分支。' },
    { id: 'gaitbase', name: 'GaitBase（OpenGait）', venue: 'CVPR 2023', fam: 'gait', ref: 'opengait',
      problem: '實用化輪廓步態', input: '輪廓序列', cue: ['sil', 'gait'], clothDep: 1, videoNeed: 4, uniform: 3,
      learns: '輪廓形狀 + 時間變化；OpenGait 同時重新檢驗了室內結論在野外是否成立',
      stages: [
        { k: 'in', t: '影片', s: 'T 幀' },
        { k: 'pre', t: '人形分割', s: 'T×64×44 二值圖' },
        { k: 'model', t: 'ResNet 類骨幹', s: '' },
        { k: 'model', t: '時間最大池化', s: '' },
        { k: 'model', t: '水平金字塔切分', s: '多條水平帶' },
        { k: 'emb', t: '步態嵌入', s: '' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '簡單、強、跨多資料集', minus: '分割品質與裝備會影響輪廓', uniformNote: '輪廓步態的標準基準。' },
    { id: 'mmgaitformer', name: 'MMGaitFormer', venue: 'CVPR 2023', fam: 'gait', ref: 'mmgaitformer',
      problem: '骨架 + 輪廓融合步態', input: '骨架 + 輪廓序列', cue: ['skel', 'sil', 'gait'], clothDep: 1, videoNeed: 4, uniform: 3,
      learns: '空間融合模組（SFM）與時間融合模組（TFM）讓兩種模態互相補足',
      stages: [
        { k: 'in', t: '影片', s: '' },
        { k: 'pre', t: '姿態估計 + 分割', s: '兩路上游' },
        { k: 'model', t: '骨架分支 / 輪廓分支', s: '' },
        { k: 'model', t: 'SFM 空間融合', s: '交叉注意力' },
        { k: 'model', t: 'TFM 時間融合', s: '' },
        { k: 'emb', t: '融合嵌入', s: '' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '明確的時空跨模態融合', minus: 'CASIA-B 換衣條件 ≠ 同制服監視器', uniformNote: '骨架與輪廓互補的直接證據。',
      result: 'CASIA-B 換衣條件 Rank-1 94.8%' },
    { id: '3dinvar', name: '3DInvarReID', venue: 'ICCV 2023', fam: 'cloth', ref: '3dinvar',
      problem: '長期換衣 ReID', input: 'RGB', cue: ['smpl'], clothDep: 0, videoNeed: 1, uniform: 2,
      learns: '重建 3D 穿衣人體，把衣服、姿態、紋理拆開，保留「裸體形」作為身分',
      stages: [
        { k: 'in', t: 'RGB', s: '' },
        { k: 'pre', t: '3D 人體重建', s: '' },
        { k: 'model', t: '拆解：姿態 / 衣服 / 紋理', s: '' },
        { k: 'emb', t: '內在體形嵌入', s: '' },
        { k: 'match', t: '比對', s: '' }],
      plus: '理論上最接近穩定的身體身分', minus: '遠距監視器重建誤差大、成本高', uniformNote: '長期研究方向，不適合第一批實驗。' },
    { id: 'aio', name: 'AIO', venue: 'CVPR 2024', fam: 'fusion', ref: 'aio',
      problem: '野外多模態 ReID', input: 'RGB / 紅外 / 素描 / 文字', cue: ['app', 'clip'], clothDep: 3, videoNeed: 0, uniform: 1,
      learns: '凍結的大型共享編碼器 + 各模態 tokenizer，把不同模態放進同一身分空間',
      stages: [
        { k: 'in', t: '任一模態', s: 'RGB / IR / sketch / text' },
        { k: 'pre', t: '模態 tokenizer', s: '' },
        { k: 'model', t: '凍結共享編碼器', s: '' },
        { k: 'model', t: '模態專屬頭', s: '' },
        { k: 'emb', t: '共享身分嵌入', s: '' },
        { k: 'match', t: '跨模態比對', s: '' }],
      plus: '「共享身分空間」概念清楚', minus: '非針對步態或制服', uniformNote: '融合架構的參考，不是直接候選。' },
    { id: 'ramoe', name: 'RaMoE', venue: 'CVPR 2021', fam: 'dg', ref: 'ramoe',
      problem: '領域泛化 ReID', input: 'RGB', cue: ['app'], clothDep: 4, videoNeed: 0, uniform: 1,
      learns: '每個來源資料集一個專家，依目標樣本與來源的相關度投票混合',
      stages: [
        { k: 'in', t: 'RGB', s: '' },
        { k: 'model', t: '共享骨幹', s: '' },
        { k: 'model', t: '來源領域專家 ×K', s: '' },
        { k: 'model', t: '相關度投票', s: '動態權重' },
        { k: 'emb', t: '聚合嵌入', s: '' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '動態選專家應對沒看過的場域', minus: '專家是「資料集」不是「生物特徵」', uniformNote: '門控架構可借鏡到「依品質選線索」。' },
    { id: 'snr', name: 'SNR', venue: 'CVPR 2020', fam: 'dg', ref: 'snr',
      problem: '領域泛化 ReID', input: 'RGB', cue: ['app'], clothDep: 4, videoNeed: 0, uniform: 1,
      learns: 'Instance Norm 去掉光照/色調風格，再把被誤刪的身分資訊「還原」回來',
      stages: [
        { k: 'in', t: 'RGB', s: '' },
        { k: 'model', t: 'CNN 區塊', s: '' },
        { k: 'model', t: 'IN 風格正規化', s: '去色偏/對比' },
        { k: 'model', t: '身分資訊還原', s: '雙因果損失' },
        { k: 'emb', t: '泛化嵌入', s: '' },
        { k: 'match', t: '距離排序', s: '' }],
      plus: '直接處理攝影機色偏', minus: '不處理衣服', uniformNote: '跨攝影機的正規化技巧。' },
    { id: 'hamobe', name: 'HAMoBE', venue: 'ICCV 2025', fam: 'fusion', ref: 'hamobe',
      problem: '影片 ReID（多生物特徵）', input: 'RGB 影片', cue: ['clip', 'body', 'gait'], clothDep: 1, videoNeed: 3, uniform: 3,
      learns: '外觀、靜態體型、動態步態三個專家；雙輸入門控依 query–gallery 這一對調整權重',
      stages: [
        { k: 'in', t: 'RGB 影片', s: '' },
        { k: 'model', t: '凍結 CLIP 多層特徵', s: 'g1..g4' },
        { k: 'model', t: '第一層專家 ×8', s: '' },
        { k: 'model', t: '外觀 / 體型 / 步態專家', s: '' },
        { k: 'model', t: '雙輸入決策門控', s: '看 query 與 gallery 兩段' },
        { k: 'emb', t: '融合嵌入', s: '' },
        { k: 'match', t: '比對', s: '' }],
      plus: '最接近「依情況選線索」的系統思路', minus: '尚未在同制服監視器上驗證', uniformNote: '融合章節的核心參考。',
      result: 'MEVID 上 Rank-1 顯著提升（論文報告約 +11～13 個百分點）' }
  ];

  // 資料集：sim = 與軍營同制服相似度 1–5；real = CCTV 真實度 1–4；verify = 是否為待核對
  var DATASETS = [
    { id: 'fgpr', name: 'FGPR', year: 2020, type: '真實', ids: 358, cams: '5 視角', size: '716 段影片 / 134,696 張', uniform: '藍、白、綠三組，同組人穿相同衣服', mod: 'RGB', real: 2, sim: 5, access: '百度網盤下載；綠組需簽協議', limit: '規模小、拍攝較受控', tech: { rgb: 2, skel: 1, sil: 1, gait: 2, face: 0, d3: 1, uni: 2, dg: 1 } },
    { id: 'prcc', name: 'PRCC', year: 2020, type: '真實', ids: 221, cams: '3', size: '33,698 張', uniform: '同一人 A/B 同衣、C 換衣', mod: 'RGB', real: 1, sim: 2, access: '學術用途', limit: '不測不同人同制服', tech: { rgb: 2, skel: 1, sil: 1, gait: 0, face: 0, d3: 1, uni: -1, dg: 1 } },
    { id: 'ltcc', name: 'LTCC', year: 2020, type: '真實', ids: 152, cams: '12', size: '17,119 張', uniform: '換衣；明確假設不同人不穿相同服裝', mod: 'RGB + 衣服標籤', real: 2, sim: 2, access: '需簽協議', limit: '協定排除了同衣不同人', tech: { rgb: 2, skel: 1, sil: 1, gait: 0, face: 0, d3: 1, uni: -1, dg: 1 } },
    { id: 'ccvid', name: 'CCVID', year: 2022, type: '真實', ids: 226, cams: '多場景', size: '2,856 段 / 347,833 框', uniform: '每人 2–5 套衣服', mod: 'RGB 影片', real: 2, sim: 3, access: '官方 repo', limit: '核心是同人換衣', tech: { rgb: 2, skel: 1, sil: 1, gait: 2, face: 0, d3: 1, uni: 0, dg: 1 } },
    { id: 'gait3d', name: 'Gait3D', year: 2022, type: '真實', ids: 4000, cams: '39', size: '25,309 段', uniform: '自然穿著', mod: '輪廓 / 關節點 / SMPL', real: 4, sim: 4, access: '需簽協議、非商用', limit: '不是制服導向', tech: { rgb: 1, skel: 2, sil: 2, gait: 2, face: 0, d3: 2, uni: 0, dg: 2 } },
    { id: 'sustech1k', name: 'SUSTech1K', year: 2023, type: '真實', ids: 1050, cams: '多視角', size: '25,239 段', uniform: '含衣服等共變因子', mod: 'RGB / 輪廓 / 姿態 / LiDAR', real: 3, sim: 4, access: '需簽協議', limit: '感測器配置超過一般監視器', tech: { rgb: 1, skel: 2, sil: 2, gait: 2, face: -1, d3: 1, uni: 0, dg: 2 } },
    { id: 'deepchange', name: 'DeepChange', year: 2023, type: '真實', ids: 1121, cams: '17 戶外', size: '178,407 框 / 12 個月', uniform: '真實長期換衣', mod: 'RGB', real: 4, sim: 4, access: '非商用協議', limit: '非制服基準', tech: { rgb: 2, skel: 1, sil: 1, gait: 1, face: 1, d3: 1, uni: 0, dg: 2 } },
    { id: 'ccpg', name: 'CCPG', year: 2023, type: '真實', ids: 200, cams: '10 視角', size: '16,566 段', uniform: '多種穿著狀態', mod: 'RGB + 輪廓', real: 2, sim: 3, access: '官方', limit: '非完全相同制服', tech: { rgb: 2, skel: 1, sil: 2, gait: 2, face: 0, d3: 1, uni: 0, dg: 1 } },
    { id: 'ccgr', name: 'CCGR', year: 2024, type: '真實', ids: 970, cams: '33 視角', size: '約 160 萬段', uniform: '53 種共變因子（含衣服）', mod: 'RGB / 輪廓 / 解析圖 / 姿態', real: 2, sim: 4, access: '非商用；RGB 另簽', limit: '規模大但拍攝受控', tech: { rgb: 2, skel: 2, sil: 2, gait: 2, face: -1, d3: 1, uni: 0, dg: 2 } },
    { id: 'mevid', name: 'MEVID', year: 2023, type: '真實', ids: 158, cams: '33 視角 / 17 地點', size: '8,092 段 tracklet', uniform: '73 天內 9 個日期，598 套服裝', mod: 'RGB 影片', real: 4, sim: 4, access: '公開', limit: '非制服；但最接近多日跨攝影機', tech: { rgb: 2, skel: 1, sil: 1, gait: 2, face: 1, d3: 1, uni: 0, dg: 2 } },
    { id: 'briar', name: 'BRIAR', year: 2023, type: '真實', ids: 1000, cams: '遠距與無人機視角', size: '35 萬張 + 1,300 小時影片', uniform: '換衣；距離至 1,000 m', mod: 'RGB（臉、全身）', real: 3, sim: 4, access: '向主辦單位申請', limit: '遠距平視／空拍為主，不是近距高架', tech: { rgb: 2, skel: 1, sil: 1, gait: 2, face: 2, d3: 1, uni: 0, dg: 2 } },
    { id: 'industrial', name: 'Industrial-Gait', year: 2026, type: '真實', ids: 150, cams: '2 個相對俯視', size: '1,500 段', uniform: '標準工作服 + 安全帽', mod: 'RGB；公開輪廓 / 關節點', real: 4, sim: 5, access: '去識別化輪廓與關鍵點公開（非商用）；RGB 需申請', limit: '單一場域、150 人；兩個相對的略高視角', src: 'J. Imaging 2026', tech: { rgb: 1, skel: 2, sil: 2, gait: 2, face: 0, d3: 1, uni: 2, dg: 2 } },
    { id: 'constrid', name: 'ConstrID', year: 2026, type: '混合', ids: 138, cams: '真實跨攝影機 + 合成視角', size: '5,137 張', uniform: '安全帽、反光背心、相似穿著', mod: 'RGB', real: 4, sim: 5, access: '申請、學術用途', limit: '規模小；人數與張數待核對原文', verify: true, src: 'Ain Shams Eng. J. 2026', tech: { rgb: 2, skel: 1, sil: 1, gait: 0, face: 0, d3: 1, uni: 2, dg: 2 } },
    { id: 'fgpersonx', name: 'FG-PersonX', year: 2026, type: '合成', ids: 1000, cams: '可控', size: '張數待核對', uniform: '五個制服群體', mod: '合成 RGB', real: 0, sim: 4, access: '論文宣稱公開', limit: '合成到真實的落差；論文測了 20 多個模型', verify: true, src: 'CVPRW 2026', tech: { rgb: 2, skel: 1, sil: 1, gait: 1, face: 1, d3: 1, uni: 2, dg: 2 } },
    { id: 'mmgait', name: 'MMGait', year: 2026, type: '真實', ids: 725, cams: '10 視角', size: '334,060 段', uniform: '正常 / 背包 / 穿外套', mod: '5 種感測器、12 種模態', real: 2, sim: 3, access: 'GitHub 公開', limit: '感測器遠超一般監視器', src: 'CVPR 2026', tech: { rgb: 2, skel: 2, sil: 2, gait: 2, face: -1, d3: 1, uni: 0, dg: 2 } }
  ];
  var TECH_COLS = [
    { k: 'rgb', n: 'RGB / CLIP' }, { k: 'skel', n: '骨架' }, { k: 'sil', n: '輪廓' }, { k: 'gait', n: '步態' },
    { k: 'face', n: '臉' }, { k: 'd3', n: '3D' }, { k: 'uni', n: '同制服' }, { k: 'dg', n: '跨資料集' }
  ];

  // 方法 × 資料集：2 = 原論文已測；1 = 可研究；3 = 研究空缺（特別值得做）；-1 = 不適用
  var GAP = {
    cols: ['FGPR', 'Gait3D', 'SUSTech1K', 'LTCC / PRCC', 'Industrial-Gait'],
    rows: [
      { m: 'FGPR 動態姿態', v: [2, 1, 1, 1, 1] },
      { m: 'CLIP-ReID', v: [1, 1, 1, 1, 1] },
      { m: 'CAL', v: [1, -1, -1, 2, 1] },
      { m: 'GaitBase', v: [1, 2, 2, -1, 1] },
      { m: 'GPGait', v: [1, 2, 1, -1, 1] },
      { m: 'SkeletonGait / ++', v: [1, 2, 2, -1, 1] },
      { m: 'MMGaitFormer', v: [3, 1, 1, -1, 1] },
      { m: '3DInvarReID', v: [1, 1, -1, 2, 1] },
      { m: 'HAMoBE', v: [3, 1, 1, 1, 3] }
    ]
  };

  // 研究主張的證據分級
  var CLAIMS = [
    { lv: 'proven', ch: 'problem', t: '衣服會讓長期 ReID 嚴重失效；CAL 能降低 RGB 特徵對衣服的可預測性。', src: ['cal', 'ltcc'] },
    { lv: 'proven', ch: 'problem', t: 'FGPR 直接收集「不同人穿相同制服」，證明這是獨立的細粒度問題。', src: ['fgpr'] },
    { lv: 'proven', ch: 'cues', t: '骨架與輪廓可形成互補的步態表徵（MMGaitFormer、SkeletonGait++）。', src: ['mmgaitformer', 'skeletongait'] },
    { lv: 'proven', ch: 'fusion', t: '多專家＋門控能依樣本內容動態調整特徵來源（HAMoBE、RaMoE）。', src: ['hamobe', 'ramoe'] },
    { lv: 'proven', ch: 'camera', t: '跨資料集時步態與 ReID 表現明顯下降，室內結論不一定能推到野外（OpenGait、GPGait）。', src: ['opengait', 'gpgait'] },
    { lv: 'inferred', ch: 'cues', t: '同制服時，外觀仍保留鞋、髮型、配件等殘餘線索，不應整個丟掉。', src: [] },
    { lv: 'inferred', ch: 'camera', t: '遠距低解析時，姿態估計器可能比 ReID 骨幹更早失效。', src: ['opengait'] },
    { lv: 'inferred', ch: 'camera', t: '骨架／輪廓去掉了大量色彩風格，可能減少 RGB 的領域落差——但姿態與分割誤差會形成新的落差。', src: ['gpgait'] },
    { lv: 'open', ch: 'fusion', t: '「CLIP + 骨架 + 輪廓 + 品質門控」一定優於單模態同制服 ReID。', src: [] },
    { lv: 'open', ch: 'datasets', t: '合成制服資料（FG-PersonX）預訓練能提升真實監視器的同制服辨識。', src: ['fgpersonx'] },
    { lv: 'proven', ch: 'cues', t: '兩端都是監視畫面時，人臉開集辨識很弱：AdaFace 在 IJB-S 監視對監視 Rank-1 僅 35%。', src: ['adaface'] },
    { lv: 'proven', ch: 'cues', t: '臉看不清時，步態是最強的單一線索；臉、步態、體型融合在 BRIAR 臉受限設定從 30.7% 提升到 65.0%。', src: ['farsight'] },
    { lv: 'proven', ch: 'cues', t: '單目身高估計誤差約 5–6 cm，只比猜平均好一點，只能當弱先驗。', src: ['gunel'] },
    { lv: 'proven', ch: 'methods', t: '換衣基準高分不能外推：同一方法在 CCVID 換衣 R1 87.6，在真實多日的 MEVID 只有 20.1。', src: ['mevid', 'hamobe'] },
    { lv: 'proven', ch: 'methods', t: '無標註學習與有標註仍差約 27–30 mAP（MSMT17）。', src: ['clustercontrast'] },
    { lv: 'inferred', ch: 'fusion', t: '每日數十到數百人的規模，用帶約束的凝聚分群即可，不需大型圖分群模型。', src: [] },
    { lv: 'open', ch: 'fusion', t: 'cannot-link 約束對同制服分群的實際增益——沒有公開數字。', src: [] },
    { lv: 'open', ch: 'openset', t: '同制服 + 多模態 + 開放集拒判的組合效果——幾乎沒有直接研究。', src: ['openworld'] }
  ];

  var REFS = {
    transreid: { a: 'He et al.', t: 'TransReID: Transformer-based Object Re-Identification', v: 'ICCV 2021', u: 'https://openaccess.thecvf.com/content/ICCV2021/html/He_TransReID_Transformer-Based_Object_Re-Identification_ICCV_2021_paper.html' },
    clipreid: { a: 'Li, Sun, Li', t: 'CLIP-ReID: Exploiting Vision-Language Model for Image Re-Identification without Concrete Text Labels', v: 'AAAI 2023', u: 'https://ojs.aaai.org/index.php/AAAI/article/view/25225' },
    cal: { a: 'Gu et al.', t: 'Clothes-Changing Person Re-identification with RGB Modality Only（CAL；提出 CCVID）', v: 'CVPR 2022', u: 'https://openaccess.thecvf.com/content/CVPR2022/html/Gu_Clothes-Changing_Person_Re-Identification_With_RGB_Modality_Only_CVPR_2022_paper.html' },
    fsam: { a: 'Hong et al.', t: 'Fine-Grained Shape-Appearance Mutual Learning for Cloth-Changing Person Re-Identification', v: 'CVPR 2021', u: 'https://openaccess.thecvf.com/content/CVPR2021/html/Hong_Fine-Grained_Shape-Appearance_Mutual_Learning_for_Cloth-Changing_Person_Re-Identification_CVPR_2021_paper.html' },
    fgpr: { a: 'Yin, Wu, Zheng', t: 'Fine-Grained Person Re-identification（FGPR）', v: 'IJCV 2020', u: 'https://www.isee-ai.cn/~yinjiahang/FGPR.html' },
    gpgait: { a: 'Fu et al.', t: 'GPGait: Generalized Pose-based Gait Recognition', v: 'ICCV 2023', u: 'https://openaccess.thecvf.com/content/ICCV2023/html/Fu_GPGait_Generalized_Pose-based_Gait_Recognition_ICCV_2023_paper.html' },
    skeletongait: { a: 'Fan et al.', t: 'SkeletonGait: Gait Recognition Using Skeleton Maps（含 SkeletonGait++）', v: 'AAAI 2024', u: 'https://ojs.aaai.org/index.php/AAAI/article/view/27933' },
    opengait: { a: 'Fan et al.', t: 'OpenGait: Revisiting Gait Recognition Towards Better Practicality（GaitBase）', v: 'CVPR 2023', u: 'https://openaccess.thecvf.com/content/CVPR2023/html/Fan_OpenGait_Revisiting_Gait_Recognition_Towards_Better_Practicality_CVPR_2023_paper.html' },
    mmgaitformer: { a: 'Cui, Kang', t: 'Multi-Modal Gait Recognition via Effective Spatial-Temporal Feature Fusion（MMGaitFormer）', v: 'CVPR 2023', u: 'https://openaccess.thecvf.com/content/CVPR2023/html/Cui_Multi-Modal_Gait_Recognition_via_Effective_Spatial-Temporal_Feature_Fusion_CVPR_2023_paper.html' },
    '3dinvar': { a: 'Liu et al.', t: 'Learning Clothing and Pose Invariant 3D Shape Representation for Long-Term Person Re-Identification（3DInvarReID）', v: 'ICCV 2023', u: 'https://openaccess.thecvf.com/ICCV2023' },
    aio: { a: 'Li et al.', t: 'All in One Framework for Multimodal Re-identification in the Wild', v: 'CVPR 2024', u: 'https://openaccess.thecvf.com/CVPR2024' },
    ramoe: { a: 'Dai et al.', t: 'Generalizable Person Re-identification with Relevance-aware Mixture of Experts', v: 'CVPR 2021', u: 'https://openaccess.thecvf.com/CVPR2021' },
    snr: { a: 'Jin et al.', t: 'Style Normalization and Restitution for Generalizable Person Re-identification', v: 'CVPR 2020', u: 'https://openaccess.thecvf.com/content_CVPR_2020/html/Jin_Style_Normalization_and_Restitution_for_Generalizable_Person_Re-Identification_CVPR_2020_paper.html' },
    hamobe: { a: 'Su, Shi, Liu, Liu', t: 'HAMoBE: Hierarchical and Adaptive Mixture of Biometric Experts for Video-based Person ReID', v: 'ICCV 2025', u: 'https://arxiv.org/abs/2508.05038' },
    openworld: { a: 'Li, Wu, Zheng', t: 'Adversarial Open-World Person Re-Identification', v: 'ECCV 2018', u: 'https://openaccess.thecvf.com/ECCV2018' },
    ltcc: { a: 'Qian et al.', t: 'Long-Term Cloth-Changing Person Re-identification（LTCC）', v: 'ACCV 2020', u: 'https://naiq.github.io/LTCC_Perosn_ReID.html' },
    prcc: { a: 'Yang et al.', t: 'Person Re-identification by Contour Sketch under Moderate Clothing Change（PRCC）', v: 'TPAMI 2021', u: 'https://ieeexplore.ieee.org/document/8936426' },
    gait3d: { a: 'Zheng et al.', t: 'Gait Recognition in the Wild with Dense 3D Representations and A Benchmark（Gait3D / SMPLGait）', v: 'CVPR 2022', u: 'https://gait3d.github.io/' },
    sustech1k: { a: 'Shen et al.', t: 'LidarGait: Benchmarking 3D Gait Recognition with Point Clouds（SUSTech1K）', v: 'CVPR 2023', u: 'https://lidargait.github.io/' },
    deepchange: { a: 'Xu, Zhu', t: 'DeepChange: A Long-Term Person Re-Identification Benchmark with Clothes Change', v: 'ICCV 2023', u: 'https://github.com/PengBoXiangShang/deepchange' },
    ccpg: { a: 'Li et al.', t: 'An In-Depth Exploration of Person Re-identification and Gait Recognition in Cloth-Changing Conditions（CCPG）', v: 'CVPR 2023', u: 'https://openaccess.thecvf.com/CVPR2023' },
    ccgr: { a: 'Zou et al.', t: 'Cross-Covariate Gait Recognition: A Benchmark（CCGR）', v: 'AAAI 2024', u: 'https://github.com/ShinanZou/CCGR' },
    gaitpart: { a: 'Fan et al.', t: 'GaitPart: Temporal Part-based Model for Gait Recognition', v: 'CVPR 2020', u: 'https://openaccess.thecvf.com/CVPR2020' },
    gaitset: { a: 'Chao et al.', t: 'GaitSet: Regarding Gait as a Set for Cross-View Gait Recognition', v: 'AAAI 2019', u: 'https://ojs.aaai.org/index.php/AAAI/article/view/4821' },
    drillis: { a: 'Drillis, Contini, Bluestein', t: 'Body Segment Parameters（本站人體模型的節段比例來源）', v: 'Artificial Limbs 1964', u: '' },
    industrial: { a: 'Bai et al.', t: 'RGB Gait Recognition Using Large Vision Models for Industrial Access Control（Industrial-Gait）', v: 'J. Imaging 2026', u: 'https://doi.org/10.3390/jimaging12090458' },
    constrid: { a: '—', t: 'ConstrID: a hybrid benchmark of real and synthetic images for construction worker re-identification', v: 'Ain Shams Eng. J. 2026', u: 'https://www.sciencedirect.com/science/article/pii/S2090447926003308' },
    fgpersonx: { a: 'Zhang, He et al.', t: 'FG-PersonX: A Scalable Synthetic Dataset for Fine-Grained Person Re-Identification', v: 'CVPRW 2026', u: 'https://openaccess.thecvf.com/content/CVPR2026W/DataCV/papers/Zhang_FG-PersonX_A_Scalable_Synthetic_Dataset_for_Fine-Grained_Person_Re-Identification_CVPRW_2026_paper.pdf' },
    mmgait: { a: 'Wang et al.', t: 'MMGait: Towards Multi-Modal Gait Recognition', v: 'CVPR 2026', u: 'https://openaccess.thecvf.com/content/CVPR2026/html/Wang_MMGait_Towards_Multi-Modal_Gait_Recognition_CVPR_2026_paper.html' },
    mevid: { a: 'Davila et al.', t: 'MEVID: Multi-view Extended Videos with Identities for Video Person Re-Identification', v: 'WACV 2023', u: 'https://arxiv.org/abs/2211.04656' },
    briar: { a: 'Cornett et al.', t: 'Expanding Accurate Person Recognition to New Altitudes and Ranges: The BRIAR Dataset', v: 'WACVW 2023', u: 'https://openaccess.thecvf.com/content/WACV2023W/LRR/html/Cornett_Expanding_Accurate_Person_Recognition_to_New_Altitudes_and_Ranges_The_WACVW_2023_paper.html' },
    farsight: { a: 'Liu et al.', t: 'Person Recognition at Altitude and Range: Fusion of Face, Body Shape and Gait', v: 'arXiv 2025', u: 'https://arxiv.org/abs/2505.04616' },
    sapiensid: { a: 'Kim et al.', t: 'SapiensID: Foundation for Human Recognition', v: 'CVPR 2025', u: 'https://arxiv.org/abs/2504.04708' },
    adaface: { a: 'Kim, Jain, Liu', t: 'AdaFace: Quality Adaptive Margin for Face Recognition', v: 'CVPR 2022', u: 'https://arxiv.org/abs/2204.00964' },
    persvit: { a: 'Hu et al.', t: 'PersonViT: Large-scale Self-supervised Vision Transformer for Person Re-Identification', v: 'arXiv 2024', u: 'https://arxiv.org/abs/2408.05398' },
    solider: { a: 'Chen et al.', t: 'Beyond Appearance: A Semantic Controllable Self-Supervised Learning Framework for Human-Centric Visual Tasks（SOLIDER）', v: 'CVPR 2023', u: 'https://arxiv.org/abs/2303.17602' },
    streid: { a: 'Wang et al.', t: 'Spatial-Temporal Person Re-identification（st-ReID）', v: 'AAAI 2019', u: 'https://arxiv.org/abs/1812.03282' },
    deepgaitv2: { a: 'Fan et al.', t: 'Exploring Deep Models for Practical Gait Recognition（DeepGaitV2）', v: 'arXiv 2023', u: 'https://arxiv.org/abs/2303.03301' },
    biggait: { a: 'Ye et al.', t: 'BigGait: Learning Gait Representation You Want by Large Vision Models', v: 'CVPR 2024', u: 'https://arxiv.org/abs/2402.19122' },
    clustercontrast: { a: 'Dai et al.', t: 'Cluster Contrast for Unsupervised Person Re-Identification', v: 'arXiv 2021', u: 'https://arxiv.org/abs/2103.11568' },
    ipd: { a: '—', t: 'Inter-pupillary distance and face recognition accuracy（arXiv 2503.20108）', v: 'arXiv 2025', u: 'https://arxiv.org/html/2503.20108v1' },
    facepose: { a: '—', t: 'Pose Impact Estimation on Face Recognition using 3D-Aware Synthetic Data', v: 'arXiv 2023', u: 'https://arxiv.org/abs/2303.00491' },
    dronegait: { a: '—', t: 'CVVNet / DroneGait：高俯角步態辨識', v: 'arXiv 2025', u: 'https://arxiv.org/abs/2505.01837' },
    gunel: { a: 'Günel et al.', t: 'What Face and Body Shapes Can Tell Us About Height', v: 'ICCVW 2019', u: 'https://openaccess.thecvf.com/content_ICCVW_2019/papers/WIDER/Gunel_What_Face_and_Body_Shapes_Can_Tell_Us_About_Height_ICCVW_2019_paper.pdf' },
    mltrl: { a: 'Lavin et al.', t: 'Technology readiness levels for machine learning systems（MLTRL）', v: 'Nature Commun. 2022', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9585100' },
    gao: { a: 'GAO', t: 'Technology Readiness Assessment Guide（GAO-20-48G）', v: 'GAO 2020', u: 'https://www.gao.gov/products/GAO-20-48G' },
    moea: { a: '經濟部', t: 'A+ 企業創新研發淬鍊計畫申請須知（查核點規則）', v: '經濟部 2022', u: 'https://service.moea.gov.tw/EE514/wSite/public/Attachment/00106/f1713332671782.pdf' },
    nist1n: { a: 'NIST', t: 'Face Recognition Technology Evaluation 1:N（FNIR/FPIR）', v: 'NIST', u: 'https://pages.nist.gov/frvt/html/frvt1N.html' }
  };

  // 實驗矩陣（對應研究第二階段）
  var EXPERIMENTS = [
    { id: 'E1', q: '同制服讓 RGB 掉多少？', base: 'CLIP-ReID', mod: '無（建立同制服子集）', m: 'Rank-1、mAP；同制服子集' },
    { id: 'E2', q: '骨架能補外觀的缺口嗎？', base: 'CLIP-ReID', mod: '+ GPGait / SkeletonGait 分數融合', m: 'ΔRank-1、錯配對的類型' },
    { id: 'E3', q: '輪廓比骨架更穩嗎？', base: '骨架', mod: '+ GaitBase', m: '依遮擋／解析度分層' },
    { id: 'E4', q: '固定融合 vs 動態融合', base: '串接 / 固定權重', mod: '品質門控', m: '模態失效曲線' },
    { id: 'E5', q: '換攝影機會崩嗎？', base: '同域', mod: '留一台攝影機不訓練', m: '每台攝影機配對矩陣' },
    { id: 'E6', q: '換資料集會崩嗎？', base: '來源資料集', mod: '目標資料集測試', m: '跨資料集 Rank-1 / mAP' },
    { id: 'E7', q: '合成資料有幫助嗎？', base: '只用真實資料', mod: '+ FG-PersonX 預訓練', m: '真實目標的提升量' },
    { id: 'E8', q: 'Gallery 裡沒有這個人怎麼辦？', base: 'Top-1 封閉集', mod: '校準的未知閾值', m: 'FAR / FRR / AUROC / DIR@FAR' },
    { id: 'E9', q: '工程成本', base: '完整模型', mod: '逐一拿掉專家', m: 'FPS、延遲、VRAM' }
  ];

  return { CUES: CUES, CUE_PROPS: CUE_PROPS, FAMILIES: FAMILIES, METHODS: METHODS, DATASETS: DATASETS, TECH_COLS: TECH_COLS, GAP: GAP, CLAIMS: CLAIMS, REFS: REFS, EXPERIMENTS: EXPERIMENTS };
})();

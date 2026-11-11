/* ============================================================
   research.js — 第二輪研究結果（2026-11-10 整合）
   每筆數字都有來源；lv: proven 證實 / inferred 推論 / open 未知
   ============================================================ */
window.R = (function () {
  'use strict';

  // ---------- 授權分級 ----------
  var LIC = {
    ok:   { n: '寬鬆', d: 'MIT / Apache / BSD，內部使用與交付風險低', c: '#0c8a0c' },
    gpl:  { n: 'GPL/AGPL', d: '自用通常不觸發義務；委外交付即屬散布，須公開原始碼或購買授權', c: '#b97e00' },
    acad: { n: '僅學術', d: '作者聲明僅供學術研究、不可商用；正式系統需取得授權或重新實作', c: '#c93434' },
    nc:   { n: '非商用', d: '權重或資料限非商業研究；政府內部用途是否涵蓋不明，需法務確認', c: '#c93434' },
    hl:   { n: 'Hippocratic', d: 'Hippocratic License 3.0，徽章含 MIL（軍事）模組，可能限制軍事用途，須讀條款', c: '#c93434' },
    unk:  { n: '未確認', d: '本次研究未讀到授權條款', c: '#6f7a71' }
  };

  // ---------- 方法總表 ----------
  // fam: app 通用外觀 / vid 影片 / cc 換衣 / uni 同制服 / part 遮擋部位 / gait 步態 / mm 多生物特徵 / uda 無監督 / life 終身 / st 時空 / face 人臉 / det 偵測追蹤
  var FAM2 = {
    app: '通用外觀 ReID', vid: '影片 ReID', cc: '換衣／衣著不變', uni: '同制服細粒度', part: '遮擋／部位', gait: '步態',
    mm: '多生物特徵融合', uda: '無監督／領域適應', life: '終身學習', st: '時空約束', face: '人臉與品質', det: '偵測與追蹤'
  };
  var MT = [
    // 通用外觀
    ['BoT（BagTricks）R50', 'CVPRW 2019', 'app', '單張 256×128', 'Market R1 94.5 / mAP 85.9', 'R50 約 25M', 'ok', '你已有。保留為回歸基準', 'https://github.com/michuanhaohao/reid-strong-baseline'],
    ['AGW', 'TPAMI 2021', 'app', '單張', 'MSMT17 R1 68.3 / mAP 49.3', '略大於 R50', 'unk', '已被自監督預訓練骨幹超越', 'https://arxiv.org/pdf/2001.04193'],
    ['OSNet x1.0', 'ICCV 2019', 'app', '單張', 'MSMT17 R1 78.7 / mAP 52.9', '2.2M · 0.98 GFLOPs', 'unk', '弱伺服器的輕量選項；適合當蒸餾學生', 'https://arxiv.org/pdf/1905.00953'],
    ['OSNet x0.25', 'ICCV 2019', 'app', '單張', 'Market R1 91.2 / mAP 75.0', '0.2M · 0.08 GFLOPs', 'unk', '幾乎不耗算力；精度明顯下降', 'https://github.com/KaiyangZhou/deep-person-reid/blob/master/docs/MODEL_ZOO.md'],
    ['MGN（LUPerson 預訓練）', 'CVPR 2021', 'app', '單張', 'MSMT17 R1 85.5 / mAP 65.7', 'R50 級', 'unk', '多粒度條帶；同制服下鞋、頭部條帶可能有用', 'https://arxiv.org/pdf/2012.03753'],
    ['TransReID', 'ICCV 2021', 'app', '單張 + 相機 ID', 'MSMT17 R1 85.3 / mAP 67.8', 'ViT-B 約 86M', 'ok', 'SIE 相機嵌入的概念值得借用', 'https://github.com/damo-cv/TransReID'],
    ['CLIP-ReID ViT-B/16', 'AAAI 2023', 'app', '單張', 'MSMT17 R1 88.7 / mAP 73.4', 'ViT-B', 'ok', '你已有。作對照骨幹', 'https://arxiv.org/pdf/2211.13977'],
    ['SOLIDER Swin-S', 'CVPR 2023', 'app', '單張', 'MSMT17 R1 90.8 / mAP 76.9', 'Swin-S', 'ok', '首選骨幹之一（MIT）', 'https://github.com/tinyvision/SOLIDER-REID'],
    ['SOLIDER Swin-B', 'CVPR 2023', 'app', '單張', 'MSMT17 R1 90.7 / mAP 77.1', 'Swin-B', 'ok', '高配版', 'https://arxiv.org/pdf/2303.17602'],
    ['PersonViT ViT-S/16', 'arXiv 2024', 'app', '單張', 'MSMT17 R1 89.2 / mAP 74.3', 'ViT-S', 'ok', '弱算力下最划算的起點（Apache-2.0）', 'https://github.com/hustvl/PersonViT'],
    ['PersonViT ViT-B/16', 'arXiv 2024', 'app', '單張', 'MSMT17 R1 92.0 / mAP 80.8', 'ViT-B', 'ok', '本次查到 MSMT17 最高的現成骨幹', 'https://arxiv.org/pdf/2408.05398'],
    ['HAP', 'NeurIPS 2023', 'app', '單張', 'MSMT17 mAP 76.4', 'ViT-B', 'unk', '備選', 'https://arxiv.org/pdf/2310.20695'],
    ['UniHCP', 'CVPR 2023', 'app', '多任務', 'MSMT17 mAP 67.3（微調）', '109M', 'unk', '偏重、ReID 不優，不建議', 'https://arxiv.org/pdf/2303.02936'],
    ['Instruct-ReID', 'CVPR 2024', 'app', '影像 + 文字指令', 'MSMT17 R1 86.9 / mAP 72.4', 'ViT-B', 'nc', '資料限非商業，不建議作生產骨幹', 'https://arxiv.org/html/2306.07520v5'],
    // 影片
    ['AP3D', 'ECCV 2020', 'vid', 'tracklet', 'MARS R1 90.1 / mAP 85.1', '24.2M · 16.9 GFLOPs', 'unk', '時間聚合經典；MEVID 換衣僅 R1 1.8', 'https://arxiv.org/pdf/2007.08434'],
    ['TF-CLIP', 'AAAI 2024', 'vid', 'tracklet', 'MARS R1 93.0 / mAP 89.4', 'CLIP ViT', 'unk', '你在 CLIP 生態，最順手的影片版', 'https://arxiv.org/pdf/2312.09627'],
    // 換衣
    ['PRCC 輪廓草圖', 'TPAMI 2020', 'cc', '邊緣輪廓', 'PRCC 換衣 R1 34.38', '多流', 'unk', '同衣情境反而掉點，不適用', 'https://arxiv.org/pdf/2002.02295'],
    ['CAL', 'CVPR 2022', 'cc', '單張 RGB + 衣服標籤', 'PRCC 換衣 R1 55.2 / mAP 55.8', 'R50', 'ok', '全員同服時沒有可對抗的衣著變異，效益存疑', 'https://github.com/guxinqian/Simple-CCReID'],
    ['AIM', 'CVPR 2023', 'cc', '單張', 'PRCC 換衣 R1 57.9 / mAP 58.3', 'R50 級', 'unk', '僅小幅勝 CAL', 'https://arxiv.org/pdf/2406.09198'],
    ['3DInvarReID', 'ICCV 2023', 'cc', '單張（訓練用 3D）', 'CCVID 換衣 R1 70.2；與 CAL 融合 84.3', '訓練複雜', 'unk', '單用不如 CAL，融合有加成', 'https://arxiv.org/pdf/2308.10658'],
    ['CLIP3DReID', 'CVPR 2024', 'cc', '單張（推論只用 R50）', 'CCVID R1 84.5 / mAP 83.9；PRCC 60.6', 'R50 推論', 'unk', '最貼近「體型而非衣著」，也是 FarSight 的體型模組', 'https://openaccess.thecvf.com/content/CVPR2024/papers/Liu_Distilling_CLIP_with_Dual_Guidance_for_Learning_Discriminative_Human_Body_CVPR_2024_paper.pdf'],
    ['CCAF', 'arXiv 2024', 'cc', '單張 + 人體解析', 'PRCC 換衣 R1 70.4 / mAP 63.7', 'CLIP ViT-B', 'unk', '數字最高但無程式碼', 'https://arxiv.org/pdf/2406.09198'],
    // 同制服
    ['FGPR 方法', 'IJCV 2020', 'uni', 'RGB 序列', '358 人 · 三組同制服 · 5 視角', '—', 'unk', '唯一以「同制服」為題的基準；資料需申請', 'https://www.isee-ai.cn/~yinjiahang/FGPR.html'],
    // 部位
    ['BPBreID', 'WACV 2023', 'part', '單張（訓練需解析標籤）', 'Occluded-Duke R1 75.1 / mAP 62.5', 'HRNet-W32', 'hl', '作者自承不同人可能有相同局部外觀', 'https://github.com/VlSomers/bpbreid'],
    ['KPR', 'ECCV 2024', 'part', '單張 + 關鍵點提示', 'Occluded-Duke R1 84.3 / mAP 75.1', 'Swin', 'hl', '出入口人群遮擋時才需要；授權與算力雙重風險', 'https://arxiv.org/pdf/2407.18112'],
    // 步態
    ['GaitSet', 'AAAI 2019', 'gait', '輪廓 64×44', 'Gait3D R1 36.7 · GREW 48.4', '小', 'acad', '經典集合式', 'https://github.com/ShiqiYu/OpenGait'],
    ['GaitPart', 'CVPR 2020', 'gait', '輪廓', 'Gait3D R1 28.2 · GREW 47.6', '小', 'acad', '經典部位時序', 'https://github.com/ShiqiYu/OpenGait'],
    ['GaitGL', 'ICCV 2021', 'gait', '輪廓', 'Gait3D R1 29.7 · GREW 41.5', '小', 'acad', '經典全域 + 局部', 'https://github.com/ShiqiYu/OpenGait'],
    ['GaitBase', 'CVPR 2023', 'gait', '輪廓', 'Gait3D R1 64.6 · GREW 60.1', '約 1.18 GFLOPs/幀', 'acad', '簡單強基線', 'https://arxiv.org/pdf/2211.06597'],
    ['DeepGaitV2-P3D', '2023', 'gait', '輪廓', 'Gait3D R1 74.4 · GREW 77.7', '11.1M · 2.9 GFLOPs', 'acad', '建議的第一個步態模組', 'https://arxiv.org/html/2303.03301v3'],
    ['SwinGait', '2023', 'gait', '輪廓', 'Gait3D R1 75.0 · GREW 79.3', 'Transformer', 'acad', '備選', 'https://arxiv.org/html/2303.03301v3'],
    ['SkeletonGait++', 'AAAI 2024', 'gait', '輪廓 + 骨架圖', 'Gait3D R1 77.6 · GREW 85.8', '需姿態估計', 'acad', '表中最高；需兩個上游模型', 'https://arxiv.org/html/2311.13444v2'],
    ['GPGait', 'ICCV 2023', 'gait', '骨架座標', 'Gait3D R1 22.5 · GREW 53.6', '小', 'unk', '強在跨資料集泛化；正規化會移除身高資訊', 'https://arxiv.org/abs/2303.05234'],
    ['BigGait（ViT-S）', 'CVPR 2024', 'gait', 'RGB（凍結 DINOv2）', 'CCPG R1 83.1；跨域到 SUSTech1K 64.7（GaitBase 16.8）', '30.8M · 12.7 GFLOPs', 'acad', '免分割免姿態、跨域強；需 GPU', 'https://arxiv.org/html/2402.19122v1'],
    // 多生物特徵
    ['HAMoBE', 'ICCV 2025', 'mm', 'RGB 影片 T=16', 'MEVID 換衣 R1 20.1 / mAP 15.1；CCVID 換衣 R1 87.6', '凍結 CLIP ViT-L/14', 'unk', '真實跨日仍只有約兩成；對弱伺服器偏重', 'https://arxiv.org/html/2508.05038v2'],
    ['SapiensID', 'CVPR 2025', 'mm', '384×384 全身 + 臉', '遮擋 ReID R1 87.3；IJB-S 身體對臉 R1 72.6', '約 35.4 GFLOPs', 'unk', '唯一可用的「臉 + 身體」統一模型候選', 'https://arxiv.org/abs/2504.04708'],
    ['FarSight／BRIAR 融合', 'WACV 2024–2025', 'mm', '臉 + 步態 + 體型', 'TAR@0.1%FAR 臉受限 30.7→65.0', '多個 GPU 模型', 'unk', '品質導引融合的架構藍圖', 'https://arxiv.org/pdf/2505.04616'],
    // 無監督
    ['SpCL', 'NeurIPS 2020', 'uda', '無標籤', 'Market→MSMT17 R1 53.7 / mAP 26.8', 'R50', 'unk', '歷史基準', 'https://arxiv.org/pdf/2006.02713'],
    ['Cluster Contrast', 'arXiv 2021', 'uda', '無標籤', 'MSMT17 R1 67.5 / mAP 38.2（SwAV 初始化）', 'R50', 'ok', '最易上手、與 PyTorch 1.11 相容', 'https://github.com/alibaba/cluster-contrast-reid'],
    ['ISE', 'CVPR 2022', 'uda', '無標籤', 'MSMT17 R1 64.7 / mAP 35.0', 'R50', 'unk', '專門處理「混合叢集」，正是同制服的失敗模式', 'https://arxiv.org/pdf/2204.06892'],
    ['PPLR', 'CVPR 2022', 'uda', '無標籤 + 相機 ID', 'MSMT17 R1 73.3 / mAP 42.2', 'R50', 'unk', '可用相機 ID', 'https://arxiv.org/pdf/2203.14675'],
    ['CALR', 'arXiv 2024', 'uda', '無標籤 + 相機 ID', 'MSMT17 R1 78.1 / mAP 50.4', 'R50-IBN', 'unk', '本次查到最高的無監督數字', 'https://arxiv.org/html/2403.16450v3'],
    // 終身
    ['KRKC', 'TPAMI 2023', 'life', '依序新領域', '已見領域平均 R1 77.0 / mAP 68.2', 'R50', 'unk', '需保存舊樣本（隱私）', 'https://arxiv.org/pdf/2211.16201'],
    ['DSKC', 'arXiv 2025', 'life', '依序新領域、無範例', '已見平均 R1 74.5 / mAP 64.1', 'ViT-S', 'unk', '不留舊影像，契合隱私需求；仍屬研究', 'https://arxiv.org/pdf/2508.03516'],
    // 時空
    ['st-ReID', 'AAAI 2019', 'st', '相機 ID + 時間戳', 'Market R1 91.2→97.2；Duke 83.8→94.0', '幾乎為零', 'ok', '最高優先：營區拓樸固定、成本最低', 'https://arxiv.org/abs/1812.03282'],
    // 人臉
    ['AdaFace R100', 'CVPR 2022', 'face', '112×112 對齊臉', 'IJB-S 監視對監視 R1 35.05；TinyFace R1 72.02', 'R18/R50/R100', 'ok', '程式 MIT；訓練資料條款另計', 'https://arxiv.org/abs/2204.00964'],
    ['MagFace', 'CVPR 2021', 'face', '112×112', 'IJB-C TAR@1e-4 95.81；範數即品質', 'R100', 'ok', '品質估計幾乎零成本（Apache-2.0）', 'https://openaccess.thecvf.com/content/CVPR2021/papers/Meng_MagFace_A_Universal_Representation_for_Face_Recognition_and_Quality_Assessment_CVPR_2021_paper.pdf'],
    ['CR-FIQA', 'CVPR 2023', 'face', '對齊臉', 'TinyFace 上品質排名穩定居前', 'R50/R100', 'nc', 'CC BY-NC 4.0', 'https://github.com/fdbtrs/CR-FIQA'],
    ['SCRFD-2.5GF', 'ICLR 2022', 'face', '整張影像', 'WIDER FACE Hard AP 77.87', '2.5 GFLOPs', 'nc', '小臉偵測；InsightFace 權重限非商業', 'https://arxiv.org/pdf/2105.04714'],
    ['MobileFaceNet', 'CCBR 2018', 'face', '112×112', 'LFW 99.55', '0.99M', 'unk', '最輕量的人臉特徵', 'https://arxiv.org/pdf/1804.07573'],
    // 偵測追蹤
    ['YOLOv7（你現有）', 'CVPR 2023', 'det', '整張影像', 'COCO AP 51.4', '—', 'gpl', 'GPL-3.0；委外交付需注意', 'https://github.com/WongKinYiu/yolov7'],
    ['YOLOX-S', 'arXiv 2021', 'det', '整張影像', 'COCO mAP 40.5', '9.0M · 26.8 GFLOPs', 'ok', '授權乾淨的偵測器', 'https://github.com/Megvii-BaseDetection/YOLOX'],
    ['NanoDet-Plus-m', '2021', 'det', '320–416', 'COCO mAP 27.0–30.4；i7 CPU 5–8 ms', '1.17M', 'ok', 'CPU 友善', 'https://github.com/RangiLyu/nanodet'],
    ['YOLO26n', '2026', 'det', '640', 'COCO mAP 40.9；CPU ONNX 38.9 ms', '2.4M · 5.5 GFLOPs', 'gpl', 'AGPL-3.0', 'https://github.com/ultralytics/ultralytics'],
    ['ByteTrack', 'ECCV 2022', 'det', '偵測框', 'MOT17 HOTA 63.1 / IDF1 77.3', '可忽略', 'ok', '純運動追蹤，CPU 負擔極低（MIT）', 'https://github.com/ifzhang/ByteTrack'],
    ['BoT-SORT', 'arXiv 2022', 'det', '偵測框 + ReID', 'MOT17 HOTA 65.0 / IDF1 80.2', '含 ReID', 'unk', '固定相機時相機運動補償無益', 'https://arxiv.org/abs/2206.14651'],
    ['OC-SORT', 'CVPR 2023', 'det', '偵測框', '單 CPU 超過 700 FPS（不含偵測）', '可忽略', 'unk', '非線性運動穩', 'https://arxiv.org/abs/2203.14360']
  ];
  var METHODS2 = MT.map(function (r) { return { n: r[0], v: r[1], fam: r[2], input: r[3], res: r[4], cost: r[5], lic: r[6], verdict: r[7], url: r[8] }; });

  // ---------- 圖表資料 ----------
  var CH_MSMT = [
    ['AGW', 49.3], ['OSNet x1.0', 52.9], ['CLIP-ReID R50', 63.0], ['MGN（LUPerson）', 65.7], ['TransReID', 67.8],
    ['CLIP-ReID ViT-B（你已有）', 73.4, 'have'], ['PersonViT ViT-S', 74.3, 'pick'], ['SOLIDER Swin-S', 76.9, 'pick'], ['SOLIDER Swin-B', 77.1], ['PersonViT ViT-B', 80.8]
  ];
  var CH_UDA = [
    ['SpCL（Market→MSMT 適應）', 26.8], ['PPLR', 31.4], ['Cluster Contrast', 33.0], ['ISE', 35.0], ['Cluster Contrast（SwAV）', 38.2],
    ['PPLR + 相機 ID', 42.2], ['ISE + PLIP 預訓練', 46.4], ['CALR + 相機 ID', 50.4]
  ];
  var CH_GAIT = [
    ['GPGait（骨架）', 22.5, ''], ['GaitPart', 28.2, ''], ['GaitGL', 29.7, ''], ['GaitSet', 36.7, ''], ['SkeletonGait（只用骨架）', 38.1, ''],
    ['GaitBase', 64.6, '約 1.2 GF/幀'], ['DeepGaitV2-2D', 68.2, '2.4 GF'], ['DeepGaitV2-3D', 72.8, '6.8 GF'], ['DeepGaitV2-P3D', 74.4, '2.9 GF', 'pick'], ['SwinGait', 75.0, ''], ['SkeletonGait++', 77.6, '需姿態']
  ];
  var CH_MEVID = [['AP3D', 1.8], ['CAL', 3.5], ['AGRL', 4.9], ['PSTA', 5.6], ['HAMoBE', 20.1]];
  var CH_BRIAR = [
    { n: '臉', a: 66.4, b: 30.7 }, { n: '步態', a: 66.3, b: 61.2 }, { n: '體型', a: 55.4, b: 47.8 }, { n: '三者融合', a: 83.1, b: 65.0 }
  ];
  var CH_IPD = [[30, 96.9], [20, 98.4], [15, 100], [10, 95.3], [5, 26.6]];
  var CH_ADAFACE = [['監視 → 單張註冊照', 70.42, 58.27], ['監視 → 入監照', 70.93, 58.02], ['監視 → 監視', 35.05, 4.96]];
  var CH_SR = [['原始低解析探針', 74.61], ['4× 超解析（單一假設）', 60.92, 'bad'], ['4× 超解析（多假設）', 76.61], ['註冊照降質到同解析度', 86.61, 'pick'], ['降質 + 多尺度累積', 93.53, 'pick']];
  var CH_ST = [{ n: 'Market-1501', a: 91.2, b: 97.2 }, { n: 'DukeMTMC-reID', a: 83.8, b: 94.0 }];

  // ---------- 身分線索證據卡 ----------
  var CUECARDS = [
    { id: 'face', n: '人臉（品質門控）', verdict: '主線，但只在近距離、低俯角點位有效', lv: 'proven',
      how: '偵測臉 → 依 5 點對齊成 112×112 → ArcFace／AdaFace 骨幹輸出 512 維特徵。AdaFace 用特徵範數當影像品質的代理，依品質動態調整 margin，讓模糊樣本不主導訓練；MagFace 的範數本身就是品質分數。',
      req: [['臉部有效', 'BRIAR 以頭高 ≥ 20 px 定義臉「可用」'], ['兩眼間距', '受控 1:1 實驗：10 px 仍 95.3%，5 px 掉到 26.6%'], ['俯仰角', '合成資料研究：±20° 內穩定，超過約 30° 錯誤率急升']],
      ev: ['AdaFace 在 IJB-S「監視對監視」Rank-1 只有 35.05%，1% FPIR 下 TPIR 約 5%——兩端都是監視畫面時，開集辨識非常弱', '臉部超解析不是解法：4× 單一假設超解析反而從 74.6% 掉到 60.9%；把註冊照降質到同解析度可達 86.6%', '品質評估：CR-FIQA 在約 30 px 的 TinyFace 上排名穩定居前'],
      fail: '帽簷遮擋（軍營常態）、俯角太大、背面、兩端皆低品質', lic: 'AdaFace（MIT）、MagFace（Apache）可用；InsightFace 權重（含 SCRFD）與 CR-FIQA 限非商用',
      src: ['https://arxiv.org/pdf/2204.00964', 'https://arxiv.org/html/2503.20108v1', 'https://arxiv.org/pdf/2303.00491', 'https://arxiv.org/pdf/2211.15225'] },
    { id: 'gait', n: '步態', verdict: '臉不可用時最強的單一線索；高俯角必須自行微調', lv: 'proven',
      how: '分割出人形輪廓（64×44）或估計骨架，取約 30 幀序列；模型學習跨幀的時空模式。DeepGaitV2 用 3D／偽 3D 卷積；SkeletonGait 把關節畫成熱圖；BigGait 直接用凍結的 DINOv2 特徵，免分割。',
      req: [['序列長度', '訓練多用約 30 幀；最短可用幀數 [未知]'], ['人形大小', '輸入固定 64×44；最低人高像素 [未知]'], ['視角', '公開資料多為平視到小俯角']],
      ev: ['BRIAR 臉受限時：步態 TAR@0.1%FAR 61.2%，臉只有 30.7%', '打亂幀序會掉 3.7–15.8 點，時間資訊確實重要', '高俯角：DroneGait 低角度訓練、高角度測試，DeepGaitV2 只剩 25.7%、CVVNet 34.3%'],
      fail: '人沒在走、軌跡太短、高俯角、群行遮擋、負重與列隊行進讓步態同質化', lic: 'OpenGait 聲明僅限學術用途；正式系統需重新實作或取得授權',
      src: ['https://arxiv.org/pdf/2505.04616', 'https://arxiv.org/html/2303.03301v3', 'https://arxiv.org/pdf/2505.01837v3'] },
    { id: 'height', n: '身高', verdict: '只能當弱先驗（過濾候選、剔除異常），不能辨識', lv: 'proven',
      how: '相機一次性校準（地面量 4 點以上求單應性）後，把腳點與頭頂像素轉成公尺高度；多幀取中位數抵消走路時的頭高起伏。',
      req: [['校準', '每台相機一次，碰撞後重做'], ['腳點可見', '人群遮擋腳時位置不可信'], ['誤差', '腳點 1 像素誤差造成的距離誤差隨距離平方成長']],
      ev: ['最佳學習式估計 MAE 5.56 cm，只比「猜性別平均身高」（5.91 cm）好 0.35 cm', '3D 模型法在高拍攝仰角下失效；鞋、姿勢可造成約 6 cm 誤差', '推論：誤差 4–5 cm、人群標準差 6–7 cm 時，身高只能把候選砍成約一半'],
      fail: '高俯角透視縮短、軍帽軍靴（全員一致，偏差相近）、遮擋腳點', lic: '自行以 OpenCV 實作，無授權問題',
      src: ['https://openaccess.thecvf.com/content_ICCVW_2019/papers/WIDER/Gunel_What_Face_and_Body_Shapes_Can_Tell_Us_About_Height_ICCVW_2019_paper.pdf', 'https://openaccess.thecvf.com/content/CVPR2021W/WMF/papers/Thakkar_On_the_Feasibility_of_3D_Model-Based_Forensic_Height_and_Weight_CVPRW_2021_paper.pdf'] },
    { id: 'body', n: '體型／3D', verdict: '不建議作主線；可借用「體型蒸餾」的輕量做法', lv: 'proven',
      how: 'HMR 2.0 用 ViT-H 從裁切圖回歸 SMPL 姿態與形狀；CLIP3DReID 則把 CLIP 的體型描述蒸餾進 R50，推論時只跑 R50。',
      req: [['算力', 'HMR 2.0 需 ViT-H 級 GPU'], ['解析度', '論文自述低解析度會降低重建品質']],
      ev: ['BRIAR 中體型是最弱單一線索：TAR@0.1%FAR 55.4%（臉可見）／47.8%（臉受限）', '2D 關鍵點擬合偏向平均體型，體積誤差約 20.6%', 'CLIP3DReID 在 CCVID 換衣 R1 84.5，推論只需 R50'],
      fail: '制服寬鬆遮蔽體型、俯視縮短、人物像素小', lic: '4D-Humans 程式 MIT，SMPL 模型需註冊、研究用途',
      src: ['https://arxiv.org/pdf/2505.04616', 'https://arxiv.org/pdf/2305.20091'] },
    { id: 'resid', n: '殘餘外觀（同制服下）', verdict: '當日有用、跨日不可靠；目前沒有公開證據', lv: 'open',
      how: '部位式 ReID（PCB 條帶、MGN 多粒度、BPBreID／KPR 部位注意力）讓模型注意鞋、頭部、配件、背包等局部差異。',
      req: [['解析度', '局部細節需要較大人形'], ['資料', '必須有同制服資料才能訓練與驗證']],
      ev: ['BPBreID 作者自承：不同人可能有相同的局部外觀——正是同制服的核心難題', 'PRCC 跨衣時，RGB 基線 PCB 僅 22.86% R1', 'FGPR 是唯一以同制服為題的公開基準（358 人、三組同制服）'],
      fail: '跨日換鞋、背包、髮型；全員配件一致', lic: 'BPBreID／KPR 為 Hippocratic License（含軍事模組）',
      src: ['https://arxiv.org/abs/2211.03679', 'https://www.isee-ai.cn/~yinjiahang/FGPR.html'] },
    { id: 'st', n: '時空約束', verdict: '最高優先：成本近乎零、完全不受制服影響', lv: 'proven',
      how: '估計每對相機之間的轉移時間分布 p(Δt | a→b)，用它修正外觀分數；物理上不可能的轉移（太快、同時出現在兩處）直接設為不可連。',
      req: [['元資料', '每段軌跡要有相機 ID 與時間戳'], ['拓樸', '需知道相機間的通道與距離']],
      ev: ['st-ReID：Market-1501 R1 91.2→97.2；DukeMTMC-reID 83.8→94.0', '推論：營區人流密度高、同時段多人走相同路線時，時空約束的區分力可能下降'],
      fail: '跨日時只剩「作息規律」這類弱先驗；集合、出操時大量人同向移動', lic: '自行實作',
      src: ['https://arxiv.org/abs/1812.03282'] }
  ];

  // ---------- 融合與分群 ----------
  var NORM = [
    ['Min-Max', "s' = (s − min) / (max − min)", '簡單；對離群值敏感'],
    ['Z-score', "s' = (s − μ) / σ", '假設近似高斯；對離群值敏感'],
    ['Tanh', "s' = ½ [tanh(0.01 (s − μ)/σ) + 1]", '用穩健估計量，較抗離群值'],
    ['似然比 LR', 'LR = p(s | 同人) / p(s | 不同人)', '把各模態轉成同一個「證據強度」語意；缺模態時該項不加'],
    ['Platt 校準', 'P(同人 | s) = 1 / (1 + e^(As+B))', '參數少，需少量標註'],
    ['Isotonic', '單調非參數映射', '彈性高；資料少時易過擬合']
  ];
  var CLUSTER_ALGS = [
    ['約束式平均連結凝聚', '小規模（每日數千 tracklet）', '免訓練；最容易加入 cannot-link', '建議首選', 'inferred'],
    ['HDBSCAN / DBSCAN', '中規模', '自動決定群數；離群點會被當雜訊', '雜訊需另報為「低信心」，不能丟', 'inferred'],
    ['Infomap', '中大規模', '圖社群偵測', '同上', 'inferred'],
    ['Linkage-GCN（CVPR 2019）', '大規模人臉', '把分群當連結預測', '需要自己的標註資料微調', 'proven'],
    ['GCN-V / GCN-E', '大規模', '頂點信心 + 邊強度；比先前監督法快約 10 倍', '規模優勢用不上', 'proven'],
    ['STAR-FC', '百萬級', '部分 MS1M pairwise F 91.97、310 秒', '規模優勢用不上', 'proven'],
    ['OGMC 線上分群', '持續增量', '每身分多高斯；新資料不需整體重聚；IJB-B 約快 6 倍', '適合跨日增量連結', 'proven'],
    ['Ball Cluster Learning', '影片', '學一個合併停止半徑，同時估群數', '可用於估人數', 'proven']
  ];

  // ---------- 系統假想 ----------
  var STAGES = [
    { id: 's1', n: '攝取與偵測', io: '影片 → 人框 + 時間戳', alg: '輕量偵測器（YOLOX／NanoDet；現有 YOLOv7）；抽幀 2–5 fps；空場跳過', m: '偵測 AP、漏檢率', lv: 'proven', run: '夜間批次', note: '解碼常被低估，必須實測' },
    { id: 's2', n: '單相機追蹤', io: '人框 → tracklet（內部 must-link）', alg: 'ByteTrack 或 OC-SORT（純運動、CPU 負擔可忽略）', m: 'IDF1、HOTA', lv: 'proven', run: '夜間批次', note: '固定相機不需相機運動補償' },
    { id: 's3', n: 'Tracklet 特徵', io: 'tracklet → {臉, 外觀, 身高, 步態, 品質 q}', alg: '臉：品質門檻 + 前 k 張加權池化；外觀：PersonViT-S／SOLIDER-S；身高：腳點 + 校準；步態：長 tracklet 才算', m: '各模態 EER；品質與誤差相關性', lv: 'inferred', run: '夜間批次', note: '重模型只跑關鍵幀' },
    { id: 's4', n: '成對分數與校準', io: '兩段 tracklet → P(同人)', alg: '各模態分數 → 校準成似然比（以營區自己的歷史資料估「不同人」分布）；缺模態該項不加', m: '校準誤差 ECE、AUC', lv: 'inferred', run: '夜間批次', note: '不能沿用公開資料集的校準' },
    { id: 's5', n: '時空約束', io: '相機對 + 時間 → cannot-link、轉移時間修正', alg: '相機拓樸 + 轉移時間分布；同時異地、轉移過快 → 不可連', m: '約束違反率、被誤排除的真配對率', lv: 'proven', run: '夜間批次', note: 'st-ReID 在公開基準 R1 +6～10 點' },
    { id: 's6', n: '同日分群（分類）', io: '親和矩陣 + 約束 → 日內匿名 ID', alg: '約束式平均連結凝聚；低信心 tracklet 另存', m: 'BCubed F、純度、碎裂率、人數誤差', lv: 'inferred', run: '夜間批次', note: '約束的增益沒有公開數字，需自己量' },
    { id: 's7', n: '跨日連結', io: '日內 ID → 全域匿名 ID', alg: '只用跨日穩定特徵（臉、步態、身高）；多原型 template；高門檻、多證據；增量方式（OGMC 風格）', m: '跨日 IDF1、誤併率', lv: 'open', run: '每日一次', note: '保留凍結的種子 template 防漂移' },
    { id: 's8', n: '識別（比對資料庫）', io: '全域匿名 ID → 已註冊 ID 或「未知-#N」', alg: '整群多段證據一致 + top1／top2 間隔；先壓低 FPIR 再看 FNIR', m: 'FNIR@FPIR、DIR@FAR', lv: 'inferred', run: '每日一次', note: '沒有資料庫時這一步跳過，分類照常運作' },
    { id: 's9', n: '軌跡與報表', io: '→ 期間獨立人數、每人每日軌跡、疑義清單', alg: '依時間排序 tracklet，對應平面圖座標（單應性）', m: '軌跡完整度、人工覆核負荷', lv: 'inferred', run: '每日一次', note: '低信心結果進人工覆核佇列' }
  ];
  var FAILS = [
    ['相似者被誤併', '同制服讓外觀分數整體偏高', '外觀只當弱證據；以臉、身高、約束把關；合併前檢查 cannot-link；報純度'],
    ['同一人被拆成多群（日內）', '視角、光線、遮擋讓特徵差異大', '第二輪以時空連續性提高親和；允許人工確認'],
    ['跨日拆分', '次日殘餘外觀改變', '只用跨日穩定特徵；多證據累積；寧可「未連結」也不強連'],
    ['誤差滾雪球', '錯併的 tracklet 汙染 template', '只用高信心更新；保留種子 template；可回溯'],
    ['門檻漂移', '季節、光線、換相機、模型更新', '定期用標註子集重估校準；監控分數分布；固定模型版本'],
    ['人數高估或低估', '分群門檻不當', '報區間而非單一數字；雜訊 tracklet 另計'],
    ['訪客被認成官兵', '開集 + 低品質比對', '多證據 + top1／top2 間隔；先設 FPIR 上限']
  ];
  var STACK = [
    ['偵測', 'YOLOv7（現有，GPL-3.0）', 'YOLOX-S／NanoDet（Apache）', '自用不受影響；委外交付時換掉'],
    ['追蹤', '—', 'ByteTrack 原倉庫（MIT）', '不要用 BoxMOT（AGPL）'],
    ['外觀特徵', 'CLIP-ReID、FastReID（現有）', 'PersonViT ViT-S（Apache）／SOLIDER Swin-S（MIT）→ 蒸餾成 OSNet', '先零樣本比較，再用辦公室資料微調'],
    ['人臉', '—', 'AdaFace／MagFace（程式寬鬆）；偵測器需找非 InsightFace 權重', '訓練資料條款需確認'],
    ['步態', '—', 'DeepGaitV2-P3D（OpenGait，僅學術）', '研究階段可用；正式系統需重新實作'],
    ['分群、時空、融合', '—', '自行實作（scikit-learn、OpenCV）', '無授權問題'],
    ['標註', '—', 'CVAT（MIT）或 Label Studio（Apache），皆可自架', '']
  ];

  // ---------- 驗證 ----------
  var METRICS = [
    ['外觀／步態 ReID', 'Rank-k、mAP、mINP', '必須分開報「同日」與「跨日、跨相機」；同日同相機的近鄰會灌水'],
    ['分類（分群）', 'Pairwise F、BCubed F、NMI、純度、碎裂率、人數誤差', '誤併與拆人後果不同，要分開報'],
    ['識別（開集）', 'FNIR@FPIR（NIST 1:N 主指標）、DIR@FAR', '先固定可接受的誤認率，再看保住多少已知人員'],
    ['追蹤', 'IDF1、HOTA', '跨日需自訂：每日重置 ID 視為不同序列'],
    ['系統', '身分數量誤差、軌跡完整度、跨日 ID 一致率、人工覆核量', '無標準，自訂並固定定義']
  ];
  var EXPS = [
    { id: 'E1', q: '同制服讓外觀掉多少？', base: 'BoT、CLIP-ReID（現有）', mod: '在辦公室同制服資料上零樣本測試', m: '同日 vs 跨日 Rank-1／mAP', go: '量到掉幅即完成；掉幅越大，後續越有說服力' },
    { id: 'E2', q: '新骨幹值得換嗎？', base: 'CLIP-ReID', mod: 'PersonViT-S、SOLIDER-S 零樣本與微調', m: '跨日 mAP、每張推論 ms', go: '跨日 mAP 提升且速度可接受才換' },
    { id: 'E3', q: '時空約束值多少？', base: '最佳外觀', mod: '+ 轉移時間先驗 + cannot-link', m: 'Rank-1、分群純度', go: '若增益 < 3 點，檢查拓樸資料是否正確' },
    { id: 'E4', q: '人臉在我們的俯角下能用嗎？', base: '—', mod: 'SCRFD + AdaFace，依距離／俯角分層', m: '各層 TPIR@FPIR、可用 tracklet 比例', go: '可用比例太低就限縮到門口點位' },
    { id: 'E5', q: '步態在高俯角能用嗎？', base: '外觀 + 時空', mod: '+ DeepGaitV2-P3D 分數融合', m: 'ΔRank-1、有效序列長度門檻', go: '零樣本無增益時先微調；仍無增益則停' },
    { id: 'E6', q: '融合方式', base: 'Z-score 加總', mod: '似然比加總 vs 小型學習式門控', m: '跨日 mAP、ECE', go: '學習式勝不過 LR 就用 LR（較好解釋）' },
    { id: 'E10', q: '換裝前後連得起來嗎？', base: '只用外觀', mod: '+ 臉（近距點位）＋體型＋步態，依品質加權', m: '換裝連結率、跨服裝 Rank-1', go: '換裝連結率明顯高於只用外觀才算可行；否則逐一檢查哪條線索在換裝後失效' },
    { id: 'E7', q: '分群能數對人嗎？', base: '無約束凝聚', mod: '+ cannot-link、門檻掃描', m: 'BCubed F、人數誤差、純度', go: '人數誤差先求 ±10% 以內' },
    { id: 'E8', q: '陌生人怎麼辦？', base: 'Top-1 封閉集', mod: '多證據 + top1/top2 間隔', m: 'FNIR@FPIR=1%', go: '先壓 FPIR，再看 FNIR' },
    { id: 'E9', q: '營區伺服器跑得動嗎？', base: '完整流程', mod: '逐一拿掉／縮小模組', m: '每相機小時處理分鐘數', go: '全營區相機量需在夜間窗口內完成' }
  ];

  // ---------- 品控 ----------
  var TRL = [
    [1, '觀察到基本原理', '文獻回顧、問題定義、使用情境描述、既有方法比較'],
    [2, '形成技術概念與應用構想', '方法設計、初步架構、假設與成功指標、資料需求、公開資料初步實驗'],
    [3, '關鍵功能的實驗性概念驗證', '可重現的實驗（版本管理）、對比基線、失敗案例分析'],
    [4, '實驗室環境驗證元件', '以接近營區的代表性資料驗證；端到端管線原型；明確指標'],
    [5, '相關環境驗證', '模擬或試驗性營區攝影機網路；整合測試；效能報告；資料治理'],
    [6, '相關環境展示原型', '試驗營區完整運行；穩健性測試；使用者回饋'],
    [7, '實際作業環境展示', '實際營區長時間運行；維運文件'],
    [8, '系統完成並通過驗證', '測試鑑定報告、操作手冊、合規核定'],
    [9, '實際任務中證明可行', '長期監控、資料漂移監測、維護紀錄']
  ];
  var MLTRL = [
    [0, '第一原理', '文獻、數學基礎、資料可得性；開始建立 TRL Card', '約 TRL 1'],
    [1, '目標導向研究', '樣本資料上的低層實驗；程式、模型、資料皆版本管理', '約 TRL 1–2'],
    [2, '原理驗證', '測試平台或模擬資料；研究主張可重現', '約 TRL 2–3'],
    [3, '系統開發', '原型級程式碼附測試與文件；專用測試資料子集', '約 TRL 3'],
    [4, '概念驗證', '真實代表性資料、貼近使用者的指標、倫理考量', '約 TRL 4'],
    [5, 'ML 能力', '以展示或 API 分享；起草產品需求；資料治理', '約 TRL 4–5'],
    [6, '應用開發', '產品級程式碼、穩健性檢查、部署情境、合規', '約 TRL 5–6'],
    [7, '整合', '關鍵情境測試、黃金資料集、變形測試', '約 TRL 6–7'],
    [8, '任務就緒', '影子／金絲雀測試、資料分布紀錄、走或不走決策', '約 TRL 7–8'],
    [9, '部署', '監控資料與概念漂移；變更退回 Level 7', 'TRL 9']
  ];
  var GATES = [
    ['SRR', '系統需求審查', '確認需求已被理解且可行', '高：可當專案啟動審查'],
    ['SFR', '系統功能審查', '功能配置與需求一致', '中'],
    ['PDR', '初步設計審查', '初步設計能滿足需求、風險可控', '中：TRL 3 末做簡化版'],
    ['CDR', '關鍵設計審查', '詳細設計可進入製作', '低：TRL 5 以後'],
    ['TRR', '測試整備審查', '測試前人員、環境、程序就緒', '中：實地測試前'],
    ['PRR／FCA／PCA', '生產整備／構型稽核', '量產與成品一致性', '研究階段不適用']
  ];
  var FRAMEWORKS = [
    { n: 'TRL／TRA', d: '1–9 級技術成熟度；TRA 由獨立人員逐項評級。系統等級取決於最弱的關鍵元件。', use: '對外報告的共同語言', src: 'https://www.gao.gov/products/GAO-20-48G', lv: 'inferred' },
    { n: 'MLTRL（Nature Communications 2022）', d: 'AI 專用的 0–9 級，每級有審查關卡與必備證據，用「TRL Card」記錄。', use: '內部檢查表：版本管理、可重現、資料切分、同儕審查', src: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9585100', lv: 'proven' },
    { n: '經濟部科專查核點', d: '每子項每季至少一個查核點，須具體、可驗證、可量化；次月 21 日前交工作報告；實際進度達預定累計 75% 為撥款門檻。', use: '月報的查核點寫法與紅黃綠燈標準', src: 'https://service.moea.gov.tw/EE514/wSite/public/Attachment/00106/f1713332671782.pdf', lv: 'proven' },
    { n: 'IRL／SRL', d: 'IRL 衡量元件間介面整合程度；SRL 把各元件 TRL 與 IRL 合成系統指標。', use: '偵測、追蹤、特徵、分群、識別之間的介面就是 IRL 的對象', src: 'https://ndia.dtic.mil/wp-content/uploads/2006/systems/Thursday/sauser.pdf', lv: 'inferred' },
    { n: 'MRL', d: '製造成熟度 1–10 級。', use: 'TRL 5–6 以後才會是議題', src: 'https://acqnotes.com/acqnote/tasks/manufacturing-readiness-level', lv: 'inferred' },
    { n: '系統工程審查（MIL-STD-1521B）', d: 'SRR、SFR、PDR、CDR、TRR 等審查節點。', use: '研究階段只需 SRR 與簡化版 PDR', src: 'https://apps.dtic.mil/sti/pdfs/ADA633324.pdf', lv: 'inferred' },
    { n: 'CDAO 負責任 AI 工具包、AI 測評框架', d: '美國國防部把 AI 倫理原則落實到生命週期各階段的檢查項目；另有模型、系統整合、人機整合的測評框架。', use: '月報「風險與品質」章節的檢查清單', src: 'https://www.ai.mil/Latest/Blog/Article-Display/Article/3940314/responsible-ai-toolkit/', lv: 'inferred' },
    { n: 'ISO 9001 設計與開發管制', d: '規劃、輸入、管制、輸出、審查、驗證、確認、變更管制。', use: '可轉成月報的固定欄位', src: 'https://www.dnv.com/tw/services/as-9100-aerospace-quality-management-3279/', lv: 'inferred' }
  ];
  var MODULES = [
    { k: 'det', n: '人形偵測', cur: 3, note: '已有 YOLOv7，可在辦公室影片上跑' },
    { k: 'trk', n: '單相機追蹤', cur: 2, note: '尚未整合' },
    { k: 'app', n: '外觀特徵', cur: 3, note: '已有 FastReID、CLIP-ReID' },
    { k: 'face', n: '人臉（品質門控）', cur: 1, note: '文獻階段' },
    { k: 'gait', n: '步態', cur: 1, note: '文獻階段' },
    { k: 'st', n: '時空約束', cur: 1, note: '需相機拓樸資料' },
    { k: 'clu', n: '同日分群', cur: 1, note: '文獻階段' },
    { k: 'xday', n: '跨日連結', cur: 1, note: '文獻階段' },
    { k: 'id', n: '開集識別', cur: 1, note: '文獻階段' }
  ];
  var PLAN6 = [
    ['第 1 月', '辦公室同制服資料第 1 輪拍攝與標註規格定稿', '資料規格文件；≥ 10 人、≥ 2 天、≥ 2 機位的原始影片', 'E1 前置'],
    ['第 2 月', '外觀基準：現有模型在同制服資料上的掉幅', '同日 vs 跨日 Rank-1／mAP 表（E1）', '外觀 TRL 3'],
    ['第 3 月', '骨幹比較與時空約束', 'E2、E3 結果表；相機拓樸與轉移時間資料', '外觀、時空 TRL 3'],
    ['第 4 月', '人臉與步態的可用範圍', '依距離／俯角分層的 E4、E5 結果', '人臉、步態 TRL 3'],
    ['第 5 月', '同日分群原型', 'BCubed F、人數誤差（E7）；分群程式可重現', '分群 TRL 3'],
    ['第 6 月', '端到端離線流程 + 伺服器實測', '一日影片 → 人數與軌跡報表；E9 處理時間', '系統走向 TRL 4（簡化版 PDR）']
  ];

  return {
    LIC: LIC, FAM2: FAM2, METHODS2: METHODS2,
    CH_MSMT: CH_MSMT, CH_UDA: CH_UDA, CH_GAIT: CH_GAIT, CH_MEVID: CH_MEVID, CH_BRIAR: CH_BRIAR, CH_IPD: CH_IPD, CH_ADAFACE: CH_ADAFACE, CH_SR: CH_SR, CH_ST: CH_ST,
    CUECARDS: CUECARDS, NORM: NORM, CLUSTER_ALGS: CLUSTER_ALGS, STAGES: STAGES, FAILS: FAILS, STACK: STACK,
    METRICS: METRICS, EXPS: EXPS, TRL: TRL, MLTRL: MLTRL, GATES: GATES, FRAMEWORKS: FRAMEWORKS, MODULES: MODULES, PLAN6: PLAN6
  };
})();

/* slots.js — 方法層槽位資料：window.SLOTDATA = { 卡片名: { slots, diff, part } }。卡片名＝c.m || c.x.n；讀取一律用 PIPE.slotsOf(card)。
   slots 值：文字，或 {v, mark:'skip'|'merge'|'extra', n}；diff＝與該組基準不同的槽位；part＝提供 BASE.ours 組合基準該格的卡。「待確認」＝卡片內容查不到。 */
window.SLOTDATA = {
 "YOLOX-S": {
  slots: {
   input: "整張畫面縮放到 640×640",
   backbone: "CSPDarknet＋PAFPN",
   head: "無錨框；分類與回歸解耦",
   train: "COCO 預訓練；SimOTA 指派",
   post: "只留「人」類；框＋信心分數"
  },
  diff: []
 },
 "YOLOv7（你現有）": {
  slots: {
   input: "整張畫面（640）",
   backbone: "E-ELAN＋重參數化卷積",
   head: "依預設錨框預測偏移",
   train: "COCO 預訓練",
   post: "人框＋分數"
  },
  diff: ["backbone","head","train"]
 },
 "NanoDet-Plus-m": {
  slots: {
   input: "320–416 縮放畫面",
   backbone: "ShuffleNetV2＋輕量 PAN",
   head: "GFL 偵測頭",
   train: "COCO；輔助模組指導指派",
   post: "人框＋分數"
  },
  diff: ["input","backbone","head","train"]
 },
 "ByteTrack": {
  slots: {
   predict: "卡爾曼濾波預測下一幀位置",
   cue: "框重疊度（IoU）",
   assign: "高分框先配，低分框第二輪",
   reconnect: "消失軌跡保留一段時間等回來",
   clean: {"v":"—","mark":"skip"}
  },
  diff: [],
  part: ["predict","cue","assign","reconnect"]
 },
 "片段淨化（自行實作）": {
  slots: {
   predict: {"v":"—","mark":"skip"},
   cue: "前後窗外觀、身高、位置",
   assign: {"v":"—","mark":"skip"},
   reconnect: {"v":"—","mark":"skip"},
   clean: "任一項突變超過門檻就切開"
  },
  diff: ["cue"],
  part: ["clean"]
 },
 "OC-SORT": {
  slots: {
   predict: "卡爾曼＋觀測回補虛擬軌跡",
   cue: "框重疊＋運動方向一致性",
   assign: "匈牙利匹配＋運動方向一致性",
   reconnect: "重新被看到時回補並校正",
   clean: {"v":"—","mark":"skip"}
  },
  diff: ["predict","cue","reconnect"]
 },
 "SOLIDER Swin-S": {
  slots: {
   prep: "256×128 人形裁切",
   rep: "RGB 外觀影像",
   backbone: "Swin Transformer＋語意值 λ",
   loss: "LUPerson 自監督；ID＋三元組",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "人物嵌入向量"
  },
  diff: []
 },
 "CLIP-ReID ViT-B/16": {
  slots: {
   prep: "256×128 人形裁切",
   rep: "RGB 外觀影像",
   backbone: "CLIP ViT-B/16 影像編碼器",
   loss: "文字 token 圖文對比；ID＋三元組",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "視覺嵌入向量"
  },
  diff: ["backbone","loss"]
 },
 "PersonViT ViT-S/16": {
  slots: {
   prep: "256×128 人形裁切",
   rep: "RGB 外觀影像",
   backbone: "ViT-S/16（約 22M 參數）",
   loss: "MIM＋對比預訓練；ID＋三元組",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "嵌入向量"
  },
  diff: ["backbone","loss"]
 },
 "OSNet x1.0": {
  slots: {
   prep: "256×128 人形裁切",
   rep: "RGB 外觀影像",
   backbone: "多尺度殘差塊＋聚合閘門",
   loss: "ID＋三元組；可由 SOLIDER 蒸餾",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "512 維嵌入"
  },
  diff: ["backbone","loss","out"]
 },
 "CAL": {
  slots: {
   prep: "RGB 人形裁切＋衣服標籤",
   rep: "RGB（去衣服化）",
   backbone: "ResNet-50＋衣服分類器",
   loss: "衣服對抗損失，交替訓練",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "2048 維去衣服化嵌入"
  },
  diff: []
 },
 "CLIP3DReID": {
  slots: {
   prep: "單張 RGB",
   rep: "RGB＋體型（3D、文字監督）",
   backbone: "教師 CLIP＋SMPL→ResNet-50",
   loss: "文字描述＋3D 體型雙重蒸餾",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "偏向體型的嵌入"
  },
  diff: ["prep","rep","backbone","loss","out"]
 },
 "DeepGaitV2-P3D": {
  slots: {
   prep: "人形分割取剪影，約 30 幀 64×44",
   rep: "黑白剪影序列；骨架為輔",
   backbone: "深層殘差＋偽 3D 卷積",
   loss: "三元組＋ID 分類損失",
   agg: "時間最大池化＋水平切帶",
   out: "多水平帶串接的步態嵌入"
  },
  diff: [],
  part: ["prep","rep","backbone","loss","agg","out"]
 },
 "RTMPose（MMPose）": {
  slots: {
   prep: "人形裁切（由①的框）",
   rep: "17 個關節點",
   backbone: "CSPNeXt＋SimCC 頭",
   loss: "COCO 關節點標註",
   agg: {"v":"—","mark":"skip"},
   out: "17 點座標＋信心值"
  },
  diff: ["prep","rep","backbone","loss","out"]
 },
 "GaitBase": {
  slots: {
   prep: "64×44 剪影序列",
   rep: "黑白剪影序列",
   backbone: "逐幀 2D 卷積（ResNet9 類）",
   loss: "三元組＋ID 損失",
   agg: "時間最大池化＋水平切帶",
   out: "步態嵌入"
  },
  diff: ["backbone"]
 },
 "SkeletonGait++": {
  slots: {
   prep: "剪影＋關節點畫成骨架熱圖",
   rep: "剪影＋骨架熱圖",
   backbone: "DeepGaitV2 類骨幹",
   loss: "三元組＋ID 損失",
   agg: "時間池化（同 DeepGaitV2 骨幹）",
   out: "步態嵌入"
  },
  diff: ["prep","rep"]
 },
 "GPGait": {
  slots: {
   prep: "骨架平移、縮放、旋轉到統一座標",
   rep: "關節點序列＋關節骨段角度描述子",
   backbone: "部位感知圖卷積",
   loss: "三元組＋ID 損失",
   agg: "整段骨架序列一起編碼",
   out: "步態嵌入"
  },
  diff: ["prep","rep","backbone"]
 },
 "AdaFace R100": {
  slots: {
   prep: "5 點對齊 112×112 臉",
   rep: "對齊人臉 RGB",
   backbone: "IResNet-100",
   loss: "自適應邊界（依品質調難度）",
   agg: {"v":"單張；片段聚合由系統做（見④）","mark":"skip"},
   out: "512 維臉部特徵"
  },
  diff: ["out"],
  part: ["rep","backbone","loss"]
 },
 "MagFace": {
  slots: {
   prep: "112×112 對齊臉",
   rep: "對齊人臉 RGB",
   backbone: "IResNet",
   loss: "長度感知邊界損失",
   agg: "單張；特徵長度可當品質權重",
   out: "512 維特徵＋品質分數"
  },
  diff: ["loss"],
  part: ["agg","out"]
 },
 "SCRFD-2.5GF": {
  slots: {
   prep: "人框上半部偵測臉並給 5 點",
   rep: {"v":"—","mark":"skip"},
   backbone: "神經架構搜尋的輕量骨幹",
   loss: "WIDER FACE 偵測訓練",
   agg: {"v":"—","mark":"skip"},
   out: "臉框＋5 個特徵點"
  },
  diff: ["backbone","loss","out"],
  part: ["prep"]
 },
 "肢體比例（由骨架估計，自行實作）": {
  slots: {
   prep: "取全身可見幀；依俯角透視修正",
   rep: "關節骨段長度比例",
   backbone: {"v":"—","mark":"skip"},
   loss: "不需訓練；用已知身材同仁校準",
   agg: "取整段片段的中位數與變異",
   out: "比例向量（4–6 個數）＋不確定度"
  },
  diff: []
 },
 "單目身高估計（自行實作）": {
  slots: {
   prep: "取全身可見、腳點清楚的幀",
   rep: "腳點與頭頂點位置",
   backbone: {"v":"—","mark":"skip"},
   loss: "不需訓練；可自動標定",
   agg: "取片段身高中位數",
   out: "身高中位數＋不確定度"
  },
  diff: []
 },
 "似然比融合（對數相加）": {
  slots: {
   in: "各線索比對分數",
   quality: {"v":"—","mark":"skip"},
   calib: "兩分布高度比取對數",
   combine: "各線索證據直接相加",
   missing: "缺線索該項為 0",
   out: "總證據（可換成同人機率）"
  },
  diff: ["combine"],
  part: ["calib","missing","out"]
 },
 "品質條件化（依品質調整證據）": {
  slots: {
   in: "分數＋品質變數",
   quality: "依品質分 2–3 級各估分布",
   calib: {"v":"同似然比，按品質分層估計","mark":"merge"},
   combine: {"v":"—","mark":"skip"},
   missing: {"v":"—","mark":"skip"},
   out: "依品質調整過的證據"
  },
  diff: ["in","calib"],
  part: ["quality"]
 },
 "品質加權片段聚合": {
  slots: {
   in: "逐幀特徵＋每幀品質",
   quality: "品質加權平均，取前 k 幀",
   calib: {"v":"—","mark":"skip"},
   combine: {"v":"—","mark":"skip"},
   missing: {"v":"—","mark":"skip"},
   out: "每段每線索一個特徵"
  },
  diff: ["quality","out"],
  part: ["in"]
 },
 "相關線索合組（避免重複計算）": {
  slots: {
   in: "各線索證據＋線索間相關係數",
   quality: {"v":"—","mark":"skip"},
   calib: {"v":"—","mark":"skip"},
   combine: "相關線索併組，組內取最強加部分其他項",
   missing: {"v":"—","mark":"skip"},
   out: "修正後的總證據"
  },
  diff: ["in"],
  part: ["combine"]
 },
 "Z-score／Min-Max 正規化後加總": {
  slots: {
   in: "各線索分數",
   quality: {"v":"—","mark":"skip"},
   calib: "Z-score 或 Min-Max 縮放",
   combine: "依固定權重相加",
   missing: "無內建，要另外處理",
   out: "融合分數"
  },
  diff: ["calib","combine","out"]
 },
 "小型學習式門控": {
  slots: {
   in: "分數＋品質＋缺線索遮罩",
   quality: "品質變數當模型輸入",
   calib: {"v":"併入學習式模型一起學","mark":"merge"},
   combine: "邏輯迴歸或兩層 MLP",
   missing: "缺線索遮罩當輸入",
   out: "同一人的機率"
  },
  diff: ["in","quality","calib","combine","missing"]
 },
 "st-ReID": {
  slots: {
   where: "攝影機 ID＋起訖時間",
   model: "攝影機兩兩轉移時間機率分布",
   param: "標註資料統計（自動）",
   use: "時間差機率與外觀分數合成",
   out: "加入時空資訊的比對分數"
  },
  diff: ["where","model","use","out"],
  part: ["param"]
 },
 "不可能配對規則（cannot-link）": {
  slots: {
   where: "片段時間＋攝影機視野",
   model: "硬規則：重疊或短於最短步行",
   param: "最短步行時間表，先用距離÷3 m/s 估",
   use: "只排除、不加分",
   out: "不可能配對清單（交給⑥）"
  },
  diff: ["where","param"],
  part: ["model","use","out"]
 },
 "畫面座標轉平面圖（單應性）": {
  slots: {
   where: "腳點換成平面圖座標",
   model: {"v":"—","mark":"skip"},
   param: "每台攝影機 4 點以上人工對應",
   use: "視野重疊時可直接用位置連結",
   out: "平面圖座標"
  },
  diff: ["param","use"],
  part: ["where"]
 },
 "約束式平均連結凝聚分群": {
  slots: {
   sim: "片段兩兩總證據（④）",
   cons: "兩群間有不可能配對就跳過",
   merge: "平均證據最高的兩群先合併",
   stop: "最高平均證據低於門檻 τ",
   except: "低信心片段另列"
  },
  diff: [],
  part: ["sim","cons","merge","stop","except"]
 },
 "Cluster Contrast": {
  slots: {
   sim: "特徵與群中心（叢集記憶）",
   cons: {"v":"—","mark":"skip"},
   merge: "DBSCAN 分群，每群一個偽身分",
   stop: "待確認",
   except: "待確認",
   extra: {"v":"用分群結果反覆訓練外觀模型","mark":"extra","n":"回頭訓練外觀模型"}
  },
  diff: ["sim","cons","merge"]
 },
 "HDBSCAN": {
  slots: {
   sim: "相互可達距離矩陣",
   cons: {"v":"—","mark":"skip"},
   merge: "最小生成樹，依群穩定度選群",
   stop: "不需預設群數；設最小群大小",
   except: "密度不足點標為雜訊（另報低信心）"
  },
  diff: ["sim","cons","merge","stop","except"]
 },
 "ISE": {
  slots: {
   sim: "無標註訓練的外觀特徵",
   cons: {"v":"—","mark":"skip"},
   merge: "待確認",
   stop: "待確認",
   except: "邊界生成支援樣本，分開混群"
  },
  diff: ["except"]
 },
 "OGMC 線上分群": {
  slots: {
   sim: "新群特徵與各身分的高斯分量",
   cons: {"v":"—","mark":"skip"},
   merge: "落入某身分分量就併入，否則新建",
   stop: "線上處理，不必整批重聚",
   except: "待確認"
  },
  diff: ["sim","merge","stop"]
 },
 "整群多證據比對＋第一第二名間隔": {
  slots: {
   gallery: "名冊中每人的多服裝註冊特徵",
   unit: "整群多段片段",
   score: "群內最好前 k 段證據平均",
   decide: "第一名過門檻且高出第二名一段間隔",
   aux: {"v":"—","mark":"skip"},
   out: "身分／未知-#N／待確認"
  },
  diff: [],
  part: ["unit","score","decide","out"]
 },
 "刷卡紀錄當輔助證據與一致性檢查": {
  slots: {
   gallery: {"v":"—","mark":"skip"},
   unit: "刷卡前後 ±2 分鐘出現在該門口的群",
   score: "刷卡證據（有上限；依時間接近分配）",
   decide: "影像與卡主不符且證據夠強則列待查",
   aux: "刷卡時間地點加一項證據",
   out: "身分判定＋與刷卡不符清單"
  },
  diff: ["unit","score","decide","out"],
  part: ["aux"]
 },
 "在營區攝影機下建立註冊資料": {
  slots: {
   gallery: "每人每種服裝多個原型",
   unit: {"v":"—","mark":"skip"},
   score: {"v":"—","mark":"skip"},
   decide: {"v":"—","mark":"skip"},
   aux: {"v":"—","mark":"skip"},
   out: "名冊註冊特徵"
  },
  diff: [],
  part: ["gallery"]
 },
 "SapiensID": {
  slots: {
   gallery: {"v":"沿用整群比對","mark":"skip"},
   unit: "單張全身影像（384×384）",
   score: "臉＋全身統一嵌入",
   decide: {"v":"沿用整群比對","mark":"skip"},
   aux: {"v":"—","mark":"skip"},
   out: "臉＋全身統一嵌入"
  },
  diff: ["unit","score"]
 }
};

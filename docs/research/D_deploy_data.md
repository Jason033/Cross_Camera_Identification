# D 軌道：部署、工具鏈、相機幾何、資料蒐集

撰寫日期：2026-11-10。標籤說明：[證實]＝已讀到來源頁面；[推論]＝本人依證實數字推算或依一般知識判斷；[未知]＝本次未能查證。

**研究方法的限制（請先讀）**：本次 WebSearch 只回傳連結標題、沒有內文摘要，約 20 次搜尋；而 WebFetch 僅限 arxiv.org / github.com / openaccess.thecvf.com。因此 (a) IEC 62676-4 DORI 數值、台灣個資法條文、Axis/NIST 等網站內容**無法直接讀取**，相關處明確標為 [未知] 或 [推論]；(b) github 上 `robots_disallowed` 的頁面（mmpose/projects/rtmpose、insightface/detection/scrfd）未能讀取，RTMPose 與 SCRFD 改引 arxiv 摘要。

---

## 1. 輕量元件選型

### 1.1 人物偵測器

| 模型 | 參數 / FLOPs | 精度 | 速度（來源所述硬體） | 授權 | 來源 |
|---|---|---|---|---|---|
| YOLOv5n (640) | 1.9M / 4.5B | COCO mAP 28.0 | CPU b1 45 ms；V100 b1 6.3 ms（CPU 型號頁面未載明） | AGPL-3.0 或企業授權 [證實] | [1] |
| YOLOv5s (640) | 7.2M / 16.5B | mAP 37.4 | CPU b1 98 ms；V100 6.4 ms | 同上 | [1] |
| YOLO26n (640) | 2.4M / 5.5B | mAP 40.9 | CPU ONNX 38.9 ms；T4 TensorRT10 1.7 ms | 同上 | [2] |
| YOLO26s (640) | 9.5M / 20.9B | mAP 48.6 | CPU ONNX 87.2 ms；T4 TRT 2.5 ms | 同上 | [2] |
| YOLOX-Nano (416) | 0.91M / 1.08G | mAP 25.8 | 頁面未列 | Apache-2.0 [證實] | [3] |
| YOLOX-Tiny (416) | 5.06M / 6.45G | mAP 32.8 | 未列 | Apache-2.0 | [3] |
| YOLOX-S (640) | 9.0M / 26.8G | mAP 40.5 | V100 9.8 ms | Apache-2.0 | [3] |
| NanoDet-Plus-m (320) | 1.17M / 0.9G | mAP 27.0 | ARM 4xA76 11.97 ms；i7-8700 CPU 5.25 ms | Apache-2.0 | [4] |
| NanoDet-Plus-m (416) | 1.17M / 1.52G | mAP 30.4 | ARM 19.77 ms；i7-8700 8.32 ms | Apache-2.0 | [4] |
| YOLOv7（你現有） | 未取得 | AP 51.4 | batch1 161 fps（頁面未標硬體，推測為高階 GPU） | GPL-3.0 [證實] | [5] |
| RT-DETR-R50 | 未取得 | AP 53.1 | T4 108 fps | [未知]（未查授權） | [6] |
| RT-DETR-R101 | 未取得 | AP 54.3 | T4 74 fps | [未知] | [6] |

重點判讀：
- [推論] RT-DETR 系列最小是 R50 等級，對「弱伺服器、無 GPU」不合適，T4 才能到 108 fps；不列為首選。
- [推論] 監控視角下行人在畫面中偏小（見第 4 節，20 m 處約 80 px 高），偵測輸入解析度比模型大小更影響召回；COCO mAP 不能直接代表高角度小目標表現，需在自有影片上驗證。
- Jetson Orin Nano 實測（學術論文）：YOLOv8n 於 TensorRT FP32/FP16/INT8 分別為 37.0 / 40.0 / 44.9 FPS，INT8 的 mAP50-95 由 0.8439 掉到 0.7190（該論文自有資料集，非 COCO）；YOLOv8s 為 27.0 / 37.9 / 41.2 FPS，INT8 mAP 由 0.8622 降到 0.7968 [證實][7]。論文建議 FP16 為速度與精度的平衡點 [證實][7]。另一個 GitHub 基準以 MAXN_SUPER 模式、640 輸入、batch 1，YOLOv8n TensorRT FP16 為 4.43 ms（225 FPS），INT8 為 3.49 ms（286 FPS），僅計 GPU 計算時間、不含資料搬移 [證實][8]。兩份數字差異極大（約 40 vs 225 FPS）是因為前者含完整端到端管線 [推論]，部署估算應採端到端的保守值。

### 1.2 追蹤器

| 追蹤器 | 報告成績 | 速度 / 備註 | 授權 | 來源 |
|---|---|---|---|---|
| ByteTrack | MOT17 test：MOTA 80.3、IDF1 77.3、HOTA 63.1 | 29.6 FPS（V100，含偵測器）；有 ONNX / TensorRT / ncnn / DeepStream 部署範例 | MIT [證實] | [9][10] |
| OC-SORT | 論文主打 DanceTrack 等非線性運動 | 僅追蹤器、給定偵測時單 CPU 超過 700 FPS | 授權 [未知] | [11] |
| Deep OC-SORT | MOT17 HOTA 64.9；MOT20 63.9；DanceTrack 61.3 | 加入自適應外觀融合，需 ReID 特徵 | [未知] | [12] |
| BoT-SORT | MOT17 test：MOTA 80.5、IDF1 80.2、HOTA 65.0 | 含相機運動補償與 ReID 變體 | [未知] | [13] |
| StrongSORT | 未取得數值 | AFLink 每張影像約 +1.7 ms，GSI 約 +7.1 ms（MOT17） | [未知] | [14] |
| BoxMOT（整合庫） | 表列 BoT-SORT、StrongSORT、Deep OC-SORT、ByteTrack、OC-SORT 等 | README 不提供 FPS | **AGPL-3.0** [證實] | [15] |

[推論] 對固定機位、人流密度中等的營區：ByteTrack 或 OC-SORT（皆為純運動、CPU 負擔可忽略）+ 你自己的 ReID 特徵做「tracklet 層級」合併，比使用整套 BoT-SORT/StrongSORT 的逐幀外觀比對省算力；且相機固定時相機運動補償無益。

### 1.3 輕量 ReID

| 模型 | 參數 | GFLOPs | Market1501 R1 (mAP) | MSMT17 R1 (mAP) | 來源 |
|---|---|---|---|---|---|
| OSNet x1.0 | 2.2M | 0.98 | 94.2 (82.6) | 74.9 (43.8) | [16] |
| OSNet x0.75 | 1.3M | 0.57 | 93.7 (81.2) | 72.8 (41.4) | [16] |
| OSNet x0.5 | 0.6M | 0.27 | 92.5 (79.8) | 69.7 (37.5) | [16] |
| OSNet x0.25 | 0.2M | 0.08 | 91.2 (75.0) | 61.4 (29.5) | [16] |
| MobileNetV2 x1.0 | 2.2M | 0.2 | 85.6 (67.3) | 57.4 (29.3) | [16] |
| OSNet-AIN x1.0（跨域 MSMT17→Market） | 2.2M | 0.98 | 70.1 (43.3) | — | [16] |
| CLIP-ReID ViT-B/16 變體 | 未取得 | 未取得 | — | MSMT17 含 re-ranking：mAP 86.7、R1 91.1 | [17] |

- [證實] torchreid 官方 model zoo 同時給出參數與 FLOPs [16]；OSNet x0.25 僅 0.08 GFLOPs，是 CPU 上極便宜的選項。
- [推論] 這些 Market/MSMT 成績來自衣著多樣資料集；你的「全員同制服」情境判別資訊主要在體型、步態、背包、髮型、鞋，通用 benchmark 數字**不可外推**，必須在自蒐資料上重新評估。
- FastReID 為 Apache-2.0，tools/deploy 提供 Caffe/ONNX/TensorRT 轉換，另有 FastDistill（模型蒸餾）[證實][18]。可用 CLIP-ReID ViT 當教師、OSNet x0.5 當學生，蒸餾到弱伺服器可用大小 [推論]。
- CLIP-ReID 官方環境需求 PyTorch 1.8.0 + CUDA 10.2、MIT 授權 [證實][17]，與你現有 PyTorch 1.11 差距不大，但需自行確認。

### 1.4 人臉偵測 / 辨識、姿態、分割

| 項目 | 已證實資訊 | 來源 |
|---|---|---|
| SCRFD | 論文摘要：SCRFD-34GF 在 WIDER FACE hard 比 TinaFace 高 3.86% AP，VGA 解析度 GPU 上快 3 倍以上。小型變體（500M/2.5G）數字本次未能讀到 [未知] | [19] |
| MobileFaceNet | 0.99M 參數、4.0 MB、221M MAdds、LFW 99.55%；Snapdragon 820 CPU（4 執行緒、NCNN）24 ms | [20] |
| AdaFace | 以特徵範數近似影像品質、調整自適應邊界，針對低品質人臉（IJB-S、TinyFace 等）；骨幹列為 R18 / R50 / R100，R18 的訓練集含 CASIA-WebFace、VGGFace2、WebFace4M | [21][22] |
| RTMPose | 摘要：RTMPose-m 75.8% AP、i7-11700 CPU 90+ FPS；RTMPose-s 72.2% AP、Snapdragon 865 70+ FPS。-t 與 -s 在伺服器 CPU 的 FPS 未能讀到 [未知] | [23] |
| 輪廓分割 | 本次未查到適用的輕量分割數據 [未知] | — |

[推論] 對高掛 CCTV：見第 4 節，人臉兩眼間距多半僅個位數像素，人臉辨識只在少數近距離點位（門口、閘門）有意義；其他位置應以全身 ReID 為主。AdaFace 設計目標雖是低品質，但無法補救低於約 10 px IPD 的資訊缺失（見第 4.3 節的實驗）。

### 1.5 加速工具鏈

- ONNX Runtime / OpenVINO：OpenVINO Apache-2.0，支援 x86/ARM CPU、Intel GPU/NPU，可吃 PyTorch 與 ONNX 模型，NNCF 提供量化與稀疏化 [證實][24]。ncnn 為 BSD-3-Clause、無第三方執行期依賴、含 ARM NEON、fp16 與 int8 推論 [證實][25]。
- TensorRT：只適用 NVIDIA（Jetson 或 dGPU）；Jetson 數字見 1.1。
- INT8 風險：實測偵測 mAP 下降可達 6.5 至 12.5 個百分點（YOLOv8s/n，Orin Nano）[證實][7]；ReID 特徵 INT8 對「同制服、差異細微」的判別影響本次無資料 [未知]，建議 ReID 保持 FP16/FP32，僅對偵測器評估 INT8。
- [推論] 以 ONNX 為中介格式可把推論與 PyTorch 1.11 解耦，舊環境匯出、新 runtime 執行。

---

## 2. 運算量預算估算（全為 [推論]，依假設逐步算）

**假設**（皆為本人假設，非來源）：
- 夜間批次窗口 10 小時（600 分鐘）。
- 影片 1080p、25 fps、H.264；偵測 5 fps（每 5 幀取 1 幀）。
- 偵測器：YOLO26n 類 CPU ONNX 38.9 ms/幀 [2]，視為伺服器 CPU 約同級（硬體未知；弱 CPU 可能慢 1.5 至 2 倍）。
- 解碼：假設 4 ms/幀、須解全部 25 fps（跳幀解碼受 GOP 限制）。**此為假設，須實測**。
- 追蹤：OC-SORT 類，相對偵測可忽略 [11]。
- ReID：每相機小時 1,600 個裁切（200 tracklet × 每條 8 關鍵幀），OSNet x1.0 假設 15 ms/裁切。

**每相機小時成本**
1. 偵測：3600 s × 5 = 18,000 幀；18,000 × 38.9 ms = 700 s ≈ 11.7 分鐘。
2. 解碼：3600 × 25 = 90,000 幀 × 4 ms = 360 s = 6.0 分鐘。
3. ReID：1,600 × 15 ms = 24 s ≈ 0.4 分鐘。
4. 合計約 18.1 分鐘 / 相機小時。

**可處理量**：600 ÷ 18.1 ≈ 33 相機小時 / 夜（單進程等效、CPU 全用）。若 10 路相機每天錄 24 小時 = 240 相機小時，則弱 CPU 無法全量處理，需要：
- 動態/空場跳過：假設營區相機 60% 時間無人，則有效 96 相機小時，約需 3 台等效或再降偵測 fps [推論]。
- 偵測降到 2 fps：偵測成本降到 4.7 分鐘；若解碼可用硬體或跳幀降低，合計約 8 至 11 分鐘，約 55 至 75 相機小時 / 夜。
- 有 Jetson Orin Nano 類加速：YOLOv8n 端到端約 40 FPS（FP16）[7]，18,000 幀 ÷ 40 = 450 s = 7.5 分鐘 / 相機小時，若解碼走硬體解碼器，約 80 相機小時 / 夜（偵測瓶頸）。
- 若 ReID 換成 ViT 類（CLIP-ReID），單次成本推測為 OSNet 的 10 倍以上 [推論，ViT-B/16 FLOPs 本次未查]，建議只對 tracklet 的 3 至 5 張高品質關鍵幀跑，並用 OSNet 蒸餾版做日常，ViT 版只做疑難複核。

**建議**：先拿一台實際伺服器跑 10 分鐘影片，量測「解碼、偵測、ReID」各自 ms，再替換上表假設；解碼常被低估。

---

## 3. 授權與軍用內部使用

| 元件 | 授權 | 狀態 | 軍用內部使用風險 | 來源 |
|---|---|---|---|---|
| Ultralytics YOLO（v5/v8/11/26） | AGPL-3.0 或企業授權；企業授權針對商業產品 | [證實] | 見下方分析 | [1][2] |
| YOLOv7（現用） | GPL-3.0 | [證實] | 純內部使用通常不觸發散布義務 [推論] | [5] |
| YOLOX | Apache-2.0 | [證實] | 低 | [3] |
| NanoDet | Apache-2.0 | [證實] | 低 | [4] |
| ByteTrack | MIT | [證實] | 低 | [9] |
| BoxMOT | AGPL-3.0 | [證實] | 同 Ultralytics，且各子追蹤器原授權另計 | [15] |
| FastReID | Apache-2.0 | [證實] | 低；資料集與預訓練權重另計 | [18] |
| CLIP-ReID | MIT | [證實] | 低；依賴 CLIP 權重授權另查 | [17] |
| OpenGait | README 聲明僅供學術用途、不可商用 | [證實] | **高**：若為正式系統不可直接使用，需向作者取得授權 | [26] |
| MMPose | Apache-2.0（程式碼）；權重與資料集授權未載明 | [證實] | 中：權重訓練資料（COCO 等）需自行確認 | [27] |
| InsightFace | 程式碼 MIT；預訓練模型與標註僅供非商業研究；buffalo_l 另需授權 | [證實] | **高**：「非商業」是否涵蓋政府內部使用不明確 [未知]，建議不採用其權重 | [28] |
| AdaFace | 倉庫標示 MIT；權重與訓練資料集授權頁面未說明 | [證實]/[未知] | 中：訓練集（MS1MV2、WebFace 等）常為研究限定 [推論] | [22] |
| OpenCLIP | 授權文字本次未讀到；README 指出部分程式改編自 OpenAI | [未知] | 需實查 LICENSE 與各權重 model card | [29] |
| CVAT Community | MIT（部分依賴另有授權） | [證實] | 低；可自架 Docker，支援 MOT 匯出 | [30] |
| Label Studio | Apache-2.0 | [證實] | 低；可自架 | [31] |

**AGPL 分析 [推論，非法律意見]**：
1. AGPL/GPL 的主要義務在「散布或提供網路服務給他人」時要求公開對應原始碼。若由軍方單位自行開發、自用、封閉網路運行，且沒有對外交付，通常義務不被觸發。
2. 若是**委外廠商開發後交付軍方**，即屬散布，廠商須提供含修改的原始碼，與機密專案衝突。此時應向 Ultralytics 購買企業授權，或避開 AGPL 元件。
3. AGPL 第 13 條涉及「經網路與程式互動的使用者」；營區內多使用者經內網查詢系統是否算，需法務判斷 [未知]。
4. 保守路線：偵測改用 YOLOX（Apache-2.0）或自訓 NanoDet，追蹤用 ByteTrack（MIT）原倉庫而非 BoxMOT，ReID 用 FastReID + OSNet（torchreid 授權本次未查 [未知]）；人臉權重**自行以授權乾淨的資料重訓**或取得商用授權。
5. 預訓練權重、資料集（Market-1501、MSMT17 等）多為研究條款 [推論，未查]；自蒐同制服資料的價值之一就是可獲得授權乾淨的微調資料。

---

## 4. 相機幾何

### 4.1 針孔模型與像素高度公式（[推論]，標準幾何推導）

符號：影像寬 W_px、水平視角 HFOV、焦距像素 f_px、相機高度 h_c、人高 H、人與相機地面水平距離 D。

- 焦距像素：f_px = W_px / (2·tan(HFOV/2))；或 f_px = f_mm · W_px / sensor_width_mm。
- 垂直於視線的人體投影長度：H·cosβ，β 為視線相對水平面的俯角，tanβ = (h_c − H/2)/D。
- 人像素高度：h_px ≈ f_px · H · cosβ / R，R = √(D² + (h_c − H/2)²)。
- 地面點測距：貼地點在影像的 v 座標與地平線 v_h 相差 (v − v_h)，則 D ≈ f_px · h_c / (v − v_h)（小俯角近似）；腳點像素誤差 δv 造成的距離誤差 ≈ D² · δv / (f_px · h_c)，即**誤差隨距離平方成長**。

**數值範例**（1080p，W_px=1920，HFOV 90° → f_px = 960；h_c = 4 m；H = 1.7 m）：

| 地面距離 D | 人像素高 | 水平像素密度（2D·tan45° 場景寬） |
|---|---|---|
| 10 m | 約 149 px | 1920 / 20 m = 96 px/m |
| 20 m | 約 80 px | 1920 / 40 m = 48 px/m |
| 30 m | 約 54 px | 1920 / 60 m = 32 px/m |

（逐步算：D=10：R=√(100+9.92)=10.48，β=17.5°，cosβ=0.954，h_px=960×1.7×0.954/10.48≈149；D=20：R=20.25，cosβ=0.988，h_px≈80；D=30：R=30.16，cosβ=0.9945，h_px≈54。）

人臉：成年人 IPD 約 63 mm 為一般常識 [推論，未引來源]；10 m 處 96 px/m 的像素密度下 IPD 約 6 px，20 m 處約 3 px，印證「臉已不可用」。

### 4.2 DORI（IEC 62676-4）

- 本次搜尋找到 Axis 白皮書《Pixel density based on IEC 62676-4:2014》與 TP-Link、Infiniti Optics 的 DORI 說明頁（標題層級）[證實存在][32][33]，但依規則無法讀取其內文。
- 我憑記憶的數值為：Detect 25、Observe 62、Recognize 125、Identify 250 px/m（標準對應 Detection 25、Observation 62、Recognition 125、Identification 250）。**此組數值本次未查證，標為 [未知，請以 Axis 白皮書或標準原文核對]**；Recognize 的定義是「已知對象的辨認」，Identify 才是「陌生人可靠辨識」，兩者容易被混用 [推論]。
- 套用上表：D=10 m 約 96 px/m，位於 Observe 與 Recognize 之間（若數值屬實），遠不到 Identify，即以像素密度標準來看，一般 CCTV 於 10 m 以上無法達到人臉身份鑑別。

### 4.3 人臉辨識解析度

- arXiv 2503.20108（研究 IPD 影響）[證實][34]：以 ArcFace（Glint360K, R100，1-in-10k 閾值 0.356）測試，IPD 30 / 20 / 15 / 10 / 5 px 的整體準確率分別為 96.9% / 98.4% / 100% / 95.3% / 26.6%；人類觀察者在 10 px 已接近隨機（50.7%）、5 px 低於隨機。該實驗為受控的 1:1 比對、樣本小（人類 100 人 / 320 次），**不能外推到 1:N 與模糊監控畫面** [推論]。
- NIST FRVT 品質報告（pages.nist.gov/frvt/reports/quality_sidd）與 IPFC 簡報出現在搜尋結果 [證實存在][35]，但本次未能讀其 IPD 建議值 [未知]。
- 一般業界常用「IPD ≥ 60 px 為佳」之類說法，本次**無來源證實** [未知]。

### 4.4 影像座標到平面圖座標

1. **單應性（homography）**：在地面量測至少 4 個非共線點（建議 8 至 12 個，用 RANSAC / 最小二乘；卷尺或地磚線）；人的**腳點**（bbox 底部中心）經 H 映射到平面圖 (X, Y)。僅對地面平面成立，樓梯、坡道需分區各一個 H。
2. **消失點**：由建築直線求水平消失點與垂直消失點，可估 f 與俯角（Manhattan 場景）；對營區的長廊、整齊建築可用 [推論]。
3. **以行人自動標定**：搜尋結果顯示有多篇以行人頭腳點估計消失線與焦距的研究（BMVC 2011、AVSS 2010 等）[證實存在][36]，內文未讀；[推論] 假設人高近似一致（同軍種身高分布窄）可作為弱尺度約束，但誤差會隨距離放大（見 4.1 的 D²·δv 公式），建議只作為檢核而非主要標定。
4. **實務建議**：每鏡頭一次性拍攝帶地面標記的校準影片，保存 H 與 5 至 6 個檢核點的重投影誤差；相機被碰撞後重標。腳點被遮擋時（人群）退回用 bbox 底部不可靠，應標記「位置不確定」而非硬給座標 [推論]。

---

## 5. 自蒐同制服資料集的蒐集協定

### 5.1 既有資料集設計參考（[證實]）

| 資料集 | 設計重點 | 來源 |
|---|---|---|
| Gait3D | 4,000 人、約 25,309 條序列、39 台相機、超市場景；7 天、每天隨機抽兩段各 2 小時；先以偵測與 FastReID 自動串接，人工去除 ID 切換；3,000 ID 訓練、1,000 ID 測試，query 每人 1 條 | [37] |
| MEVID | 158 人、598 套服裝、8,092 tracklets、33 個相機視角（17 地點）、73 天內共 9 天；室內外；附半自動標註 GUI | [38] |
| DeepChange | 1,121 人、178,407 框、17 台戶外相機、橫跨 12 個月 | [39] |
| CCVID | 226 人、2,856 序列、每人 2 至 5 套服裝；通用與換衣兩種評測設定；訓練 75 人、測試 151 人 | [40] |
| FineGPR | 合成資料（GTA5），1,150 人，約 2,028,600 張；我無法確認使用者所指「FGPR」是否即此，標 [未知] | [41] |

[推論] 以上資料集都**不是同制服**情境；沒有找到專為同制服設計的公開資料集（搜尋僅返回換衣類）。

### 5.2 建議方案（[推論]；人數與天數無文獻依據，為工程折衷）

- **受測者**：至少 30 至 40 人（評估 1:N 與開集需要「已註冊」與「未註冊干擾」兩群，例如 25 註冊 + 10 至 15 未註冊）。比較：CCVID 226 人、MEVID 158 人，你的規模遠小，故主要用於**評估與領域微調**，不宜從零訓練。
- **天數**：至少 5 個蒐集日，分散在 3 週以上，以捕捉跨日差異（睡眠、衣物洗燙、髮型、鞋、背包內容物）；理想有 1 至 2 次「間隔 ≥ 2 週」的日子，用來測長期。MEVID 為 73 天內 9 天 [38]，可作量級參考。
- **相機**：3 至 4 個機位，優先複製營區真實幾何：同高度與俯角（高掛 3 至 5 m、俯角 20 至 40°，依營區實測調整）、同解析度與壓縮設定（實際碼率、H.264/H.265、低光）。另加 1 台**近距離高解析**參考機供人臉標註與 ground truth 輔助，不用於評測輸入。
- **路線**：每次錄 3 至 5 條路線，覆蓋近、中、遠距（對應 4.1 表的 10/20/30 m），含直行、轉彎、交會與短暫遮擋。
- **協變量矩陣**：帽（戴/脫）、口罩（有/無）、手持物或背包（無/背/提）、速度（慢走/正常/快走/小跑）、制服細節（外套有無、袖口捲起）。每人每日跑「基準 + 隨機抽 2 個協變量」，避免組合爆炸。
- **標註**：以 tracklet 層級 ID（自動偵測 + 追蹤產生，人工修正 ID 切換與合併，沿 Gait3D / MEVID 的半自動做法 [37][38]）。工具：CVAT Community（MIT，自架，支援 MOT 匯出 [30]）或 Label Studio（Apache-2.0，自架，支援影片 [31]）。因同制服難以人工確認，應在受測者身上加**只供標註用的標記**（如不影響外觀的 ID 手環或手機 BLE/UWB 紀錄），評測前再抹去標記視覺線索 [推論]。
- **資料切分**：
  1. subject-disjoint：訓練與測試人員不重疊（Gait3D、CCVID 皆如此 [37][40]）。
  2. 跨日：gallery 用早期日、query 用後期日，並單獨報「同日」與「跨日」兩種成績。
  3. 跨相機：query 與 gallery 不同相機。
  4. 開集：測試集含未註冊人員，量 FNIR@FPIR。
  5. 留一整日 / 留一整機位作為最終 holdout，不參與任何調參。
- **同意與隱私**：書面知情同意（說明目的、保存期限、可退出與刪除）、資料加密與存取控管、僅在內網處理；詳見第 7 節。

---

## 6. 各功能評估指標

| 功能 | 指標 | 說明 | 來源 |
|---|---|---|---|
| ReID | Rank-k (CMC)、mAP、mINP | mINP 衡量「找到最難正樣本」的難度，出自 Ye 等的 ReID 綜述／AGW 基線；定義細節本次未讀 [未知] | [42] |
| 叢集（匿名 ID） | Pairwise precision/recall/F、BCubed P/R/F、NMI | 皆為標準叢集評估；本次未查來源 [推論] | — |
| 開集身份辨識 | FNIR@FPIR（NIST FRTE 1:N 的主要指標）、DIR@FAR（開集 ROC 對應） | NIST 1:N 頁面存在 [證實存在]，定義文字未讀 [未知] | [43] |
| 追蹤 | IDF1、HOTA（拆成偵測、關聯、定位）、MOTA | HOTA 論文主張平衡偵測、關聯與定位，並可分解 5 種基本錯誤 [證實] | [44] |
| 系統層級 | 身份數量誤差（估計獨立人數 vs 實際）、軌跡完整度（覆蓋時間比、斷裂次數）、跨日 ID 一致率 | 自訂，無標準 [推論] | — |

建議：同制服情境下 Rank-1 容易被「同日同相機近鄰」灌水，**必須同時報告跨日跨相機成績**，並報「身份數量誤差」，因叢集過度分裂會讓人數膨脹，而軌跡層面更貼近使用者需求 [推論]。

---

## 7. 隱私與法律（簡述）

- 本次僅搜到台灣個資法相關法規與解釋的連結，以及 2025 年底「台灣通過個資法重大修正」的律所報導標題 [證實存在][45]，**內文未能讀取**，無法確認修正後條文。
- [推論，須法務確認] 憑一般認知：個資法第 6 條列舉的特種個資（病歷、醫療、基因、性生活、健康檢查、犯罪前科）未明列生物特徵；但臉部特徵屬可識別個人資料，仍受蒐集、處理、利用需有特定目的與法定要件（公務機關依第 15 條，須執行法定職務必要範圍）、告知與安全維護義務。國防軍事單位是否有特別規範或豁免、以及修正後是否新增生物辨識規定，**皆為 [未知]**。
- 自蒐資料同事影像：屬蒐集個資，應有書面同意與告知；步態與全身 ReID 特徵同樣視為可識別資料處理較穩妥 [推論]。
- 設計建議：資料最小化（只存 embedding 與 tracklet 摘要，原始影片限期保存）、匿名 ID 與真實身份對照表分離、存取日誌、刪除機制 [推論]。

---

## 8. 結論與建議優先順序

1. 立即實測伺服器的解碼與偵測 ms，取代第 2 節假設。
2. 授權：先確認系統是「自用」或「交付」；若交付，避開 Ultralytics / BoxMOT / OpenGait / InsightFace 權重，改 YOLOX 或 NanoDet + ByteTrack + FastReID（OSNet）。
3. 幾何：為每鏡頭做單應性標定，並以 4.1 公式計算每個區域的像素密度，標出「ReID 可用區」與「僅偵測區」。
4. 資料：30 至 40 人、5 個以上日期、3 至 4 機位，以跨日跨相機開集切分，用於評估與微調。
5. 指標：同時報跨日 Rank-1/mAP、FNIR@FPIR、HOTA/IDF1、身份數量誤差。

---

## 來源清單（去重）

[1] https://github.com/ultralytics/yolov5
[2] https://github.com/ultralytics/ultralytics
[3] https://github.com/Megvii-BaseDetection/YOLOX
[4] https://github.com/RangiLyu/nanodet
[5] https://github.com/WongKinYiu/yolov7
[6] https://arxiv.org/abs/2304.08069
[7] https://www.arxiv.org/pdf/2502.15737
[8] https://github.com/hokwangchoi/jetson-orin-nano-benchmarks
[9] https://github.com/ifzhang/ByteTrack
[10] https://arxiv.org/abs/2110.06864
[11] https://arxiv.org/abs/2203.14360
[12] https://arxiv.org/abs/2302.11813
[13] https://arxiv.org/abs/2206.14651
[14] https://arxiv.org/abs/2202.13514
[15] https://github.com/mikel-brostrom/boxmot
[16] https://github.com/KaiyangZhou/deep-person-reid/blob/master/docs/MODEL_ZOO.md
[17] https://github.com/Syliz517/CLIP-ReID
[18] https://github.com/JDAI-CV/fast-reid
[19] https://arxiv.org/abs/2105.04714
[20] https://arxiv.org/pdf/1804.07573
[21] https://arxiv.org/abs/2204.00964
[22] https://github.com/mk-minchul/AdaFace
[23] https://arxiv.org/abs/2303.07399
[24] https://github.com/openvinotoolkit/openvino
[25] https://github.com/Tencent/ncnn
[26] https://github.com/ShiqiYu/OpenGait
[27] https://github.com/open-mmlab/mmpose
[28] https://github.com/deepinsight/insightface
[29] https://github.com/mlfoundations/open_clip
[30] https://github.com/cvat-ai/cvat
[31] https://github.com/HumanSignal/label-studio
[32] https://whitepapers.axis.com/en/pixel-density-based-on-iec-62676-4-2014（僅見標題，未讀）
[33] https://infinitioptics.com/dori（僅見標題，未讀）
[34] https://arxiv.org/html/2503.20108v1
[35] https://pages.nist.gov/frvt/reports/quality_sidd/frvt_quality_sidd_report.pdf（僅見標題，未讀）
[36] https://bmva-archive.org.uk/bmvc/2011/proceedings/paper117/abstract.pdf（僅見標題，未讀）
[37] https://arxiv.org/pdf/2204.02569
[38] https://arxiv.org/abs/2211.04656
[39] https://arxiv.org/abs/2105.14685
[40] https://arxiv.org/pdf/2204.06890
[41] https://arxiv.org/pdf/2109.10498
[42] https://arxiv.org/pdf/2001.04193（僅見標題，未讀）
[43] https://pages.nist.gov/frvt/html/frvt1N.html（僅見標題，未讀）
[44] https://arxiv.org/abs/2009.07736
[45] https://www.jonesday.com/en/insights/2025/12/taiwan-passes-major-amendments-to-the-personal-data-protection-act（僅見標題，未讀）

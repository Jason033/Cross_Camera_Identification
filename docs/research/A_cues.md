# 軌道 A：身分線索（Identity Cues）深度評估報告

專案：軍營跨攝影機人員辨識（同款迷彩制服、高架俯視 CCTV、臉部低品質、弱算力地端伺服器）
日期：2026-11-10
證據標籤：[證實] 論文實驗中報告；[推論] 工程推論；[未知] 查無證據。
方法限制：WebSearch 僅回傳標題，數字多數來自 WebFetch 讀取 arxiv / CVF / GitHub 頁面；未能開啟的論文（Criminisi 原文、IJB-S 原始協定、FarSight 原文）不引用其數字。

---

## 0. 結論先行

1. 臉是唯一「在同制服下仍有大量身分資訊」且成熟的線索，但高俯角加低解析度會讓它大幅衰退；必須做品質門檻（quality gating），只用高品質幀進庫、低品質幀只做追蹤。
2. 步態在 BRIAR 實驗中是「臉不可見時最強的單一線索」，但現有公開步態模型幾乎全在水平視角資料集訓練；高俯角證據弱（DroneGait 垂直 60–80° 時跨視角方法僅 34–37% rank-1，專門蒸餾方法 81.0%，來源為綜述表）。
3. 身高只能當弱先驗（篩選候選），不能當獨立身分線索；單目法誤差多在 4–9 cm，約與人群散佈相當。
4. SMPL 體型（betas）在低解析度、俯視、單視角下不穩，BRIAR 中 body shape 是最弱單一線索；不建議作主線。
5. 制服細節（臂章、名條、鞋、眼鏡、髮型）：未找到任何針對「同制服 ReID」的成熟公開資料集或模型；FG-PersonX、Industrial-Gait、ConstrID 三者均查無此名稱資料集（見 §5）。需自建資料。

---

## 1. 低品質監視臉部辨識

### 1.1 技術原理
- 輸入：偵測後依 5 點 landmark 對齊的 112×112 RGB 臉（ArcFace 系，AdaFace 權重註明為 BGR 輸入）。
- ArcFace：以 angular margin softmax 學習超球面上的類內緊湊特徵。
- AdaFace（CVPR 2022）：以特徵範數近似影像品質，依品質動態調整 margin，讓低品質樣本不主導訓練 [證實]（https://arxiv.org/abs/2204.00964）。
- MagFace（CVPR 2021）：特徵範數同時編碼品質，無需額外品質標註，推論幾乎零成本 [證實]。

### 1.2 量化證據
AdaFace（ResNet100）[證實]，來源 https://arxiv.org/pdf/2204.00964：

| 訓練集 | TinyFace Rank-1 | IJB-S Surv-to-Single R1 / TPIR@1%FPIR | IJB-S Surv-to-Booking R1 / TPIR | IJB-S Surv-to-Surv R1 / TPIR | IJB-C TAR@1e-4 |
|---|---|---|---|---|---|
| MS1MV2 | 68.21 | 65.26 / 51.66 | 66.27 / 50.87 | 23.74 / 2.50 | 96.89 |
| WebFace4M | 72.02 | 70.42 / 58.27 | 70.93 / 58.02 | 35.05 / 4.96 | 97.39 |

重點：Surveillance-to-Surveillance（雙方皆為監視影像，最接近你的「跨日監視對監視」）Rank-1 僅 23–35%、1% FPIR 的開集 TPIR 僅約 2.5–5%。這是目前最貼近你情境的公開基準，結果說明：兩端皆低品質時，臉的開集辨識非常弱。
MagFace：IJB-C TAR@1e-4 為 95.81%（ArcFace 95.74%），MagFace+ 品質加權 95.97%；IJB-B 94.33% [證實]（https://openaccess.thecvf.com/content/CVPR2021/papers/Meng_MagFace_A_Universal_Representation_for_Face_Recognition_and_Quality_Assessment_CVPR_2021_paper.pdf）。

### 1.3 人臉品質評估（FIQA）
- SER-FIQ：多次 dropout 前向，成本高。SDD-FIQA：以正負樣本相似度分佈的 Wasserstein 距離產生偽標籤再訓練迴歸網路（LFW AOC 約 0.81 vs SER-FIQ 約 0.66，作者自報）[證實]（https://arxiv.org/pdf/2103.05977）。CR-FIQA：以「與類中心／最近負類中心的相對分類性」學習品質，需訓練。
- 獨立比較（https://arxiv.org/pdf/2303.13294）[證實]：CR-FIQA(L) 在 LFW 與 TinyFace（約 30 像素的極低解析度）兩者都穩定居前；MagFace 在 LFW 第一但 TinyFace 中段；SER-FIQ 在 TinyFace 最好、LFW 最差；排名對評估設定很敏感。
- 推論 [推論]：你的情境接近 TinyFace，應以 CR-FIQA(L) 或 MagFace 範數為門檻，並用自己的辦公室資料校準閾值，不要沿用論文閾值。

### 1.4 超解析（Face SR）有沒有幫助
- SCface 4.2 m（平均裁切臉約 22×29 像素）：單假設 SR 2×/4×/8× 為 73.07/60.92/52.92%（基準 74.61%），反而退步；多假設 SR 為 74.15/76.61/76.30%；把「註冊影像降質到與探針同解析度」（resolution matching）達 86.61%，再結合多尺度累積最高 93.53% [證實]（https://arxiv.org/pdf/2211.15225）。
- 另一篇也指出降質註冊影像比超解析探針更有效（https://arxiv.org/pdf/1907.10104）。SR 在較高解析度、受控資料上有幾個百分點增益（碩論 https://arxiv.org/abs/2101.10845 ，ICB-RW 40×40：SRGAN 77.3% vs bicubic 62.0%），但單一小資料集、變異大。
- 結論 [推論]：SR 不是主解。優先做「把註冊圖庫降質到實際探針解析度」與多幀聚合；SR 只在視覺複核時使用，避免幻覺細節進入身分判定。

### 1.5 解析度與俯角需求
- BRIAR 實務定義：臉部「有效」的頭高至少 20 px，瞳距約 15–100 px [證實]（https://arxiv.org/pdf/2505.04616）。
- 俯仰角：合成資料研究顯示 ±20° 內穩定，pitch 超過約 30° 後錯誤率急升，部分 FNMR/FMR 超過 80%（ArcFace、MagFace、AdaFace 等五系統）[證實]（https://arxiv.org/pdf/2303.00491）。高架 3–6 m、俯視陡峭的 CCTV 很可能落入此區間 [推論]，特別是近距離時俯角更大。
- 空中場景：FaceNet 在 IJB-S 約 3.33%；IJB-S-UAV 早期模型約 7.6% rank-1（綜述 https://arxiv.org/pdf/2511.17674）[證實]。
- 所需幀數：[未知]（無直接實驗）；建議以品質加權的 template 聚合（MagFace+ 與 SDD-FIQA 的 set-based 驗證 TAR 約 0.962 vs 無加權 0.947 為旁證）。

### 1.6 小臉偵測
- SCRFD（ICLR 2022）WIDER FACE（VGA 輸入）AP Easy/Med/Hard：34GF 96.06/94.92/85.29；10GF 95.16/93.87/83.05；2.5GF 93.78/92.16/77.87；0.5GF 90.57/88.12/68.51；0.5GF 僅 0.57M 參數、0.508 GFLOPs [證實]（https://arxiv.org/pdf/2105.04714）。
- 該論文延遲為 GPU（2080 Ti）數據，未報 CPU 速度 [證實/未知]。CPU 可行性：2.5GF 屬輕量，[推論] 可用 ONNX Runtime/OpenVINO 在 CPU 上以低幀率（抽幀）運行，需實測。

### 1.7 算力與實作
- R50/R100 ResNet 與 ViT 皆可 CPU 推論，但吞吐量有限；R18/R50 版本較適合弱伺服器 [推論]。臉特徵為 512 維向量，註冊庫與聚類（HDBSCAN/連結式）成本低。
- 開源與授權：
  - AdaFace https://github.com/mk-minchul/AdaFace：MIT；權重（R18/R50/R100，CASIA、VGGFace2、WebFace4M/12M、MS1MV2/3）見 README 的 Google Drive；訓練資料集本身各有使用條款。[證實]
  - CVLface https://github.com/mk-minchul/CVLface：MIT；含 AdaFace-ViT、KP-RPE，權重在 Hugging Face；權重授權需查各模型頁（頁面未載明）。
  - InsightFace https://github.com/deepinsight/insightface：程式碼 MIT，但訓練資料標註與其訓練出的模型（含 buffalo_l 及 SCRFD 權重）限非商業研究用途 [證實]（README）。軍方內部研發若屬研究用途可用，量產採購需法務確認 [推論]。
  - MagFace https://github.com/IrvingMeng/MagFace：Apache-2.0；官方稱為精簡版，原始碼未公開。
  - CR-FIQA https://github.com/fdbtrs/CR-FIQA：CC BY-NC 4.0（非商用），權重 iresnet100(MS1MV2)/iresnet50(CASIA)。

### 1.8 失敗模式
- 同制服：臉是少數不受制服影響的線索，價值高。
- 高俯視：臉部被帽簷遮擋與俯角使特徵下降；帽子是軍營常態 [推論]。
- 低解析度：見上；Surv-to-Surv 才 23–35% rank-1。
- 跨日：臉的長期穩定性好（短期以數日計），但兩端皆為低品質是主要風險。

**判定**：主線線索，但需「品質門檻 + 多幀聚合 + 註冊庫降質匹配」；不能單靠它做全時段辨識。

---

## 2. 單目身高 / 人體測量

### 2.1 原理
單視角度量（Criminisi 1999）利用地平面消失線與垂直消失點，由參考高度推得其他物體高度；監視場景可由行走者的頭腳點對自動校準（BMVC 2011 與 AVSS 2010 有相關論文，標題見來源，但本次未開啟全文，不引用其誤差數字）。若相機固定，只需一次性校準（量測地面標記）即可把每位行人的頭腳像素轉為公尺高度，這比自動校準穩定得多 [推論]。

### 2.2 量化證據
- 影像 + 學習式：Günel et al. ICCVW 2019，IMDB-100K 上 MAE 5.56 cm，而「預測性別平均」基準為 5.91 cm，僅差 0.35 cm；自建 Lab-test 為 8.53 cm [證實]（https://openaccess.thecvf.com/content_ICCVW_2019/papers/WIDER/Gunel_What_Face_and_Body_Shapes_Can_Tell_Us_About_Height_ICCVW_2019_paper.pdf）。
- 重力參考（影片）：跳躍動作 MAE 3.9 cm（12 人，4 m 與 7 m）；跑步 12.3–18.9 cm；需要人原地跳躍，不適用被動監視 [證實]（https://arxiv.org/pdf/1909.02211）。
- 3D 模型取向（Thakkar CVPRW 2021）：地面真值參考下模擬誤差約 0.5%（中性姿勢正面），但高拍攝仰角時「breaks down」；名人照 6.4–7.1 cm；鞋、姿勢（走路達約 6 cm）、脊椎壓縮（約 1.9 cm）都造成誤差 [證實]（https://openaccess.thecvf.com/content/CVPR2021W/WMF/papers/Thakkar_On_the_Feasibility_of_3D_Model-Based_Forensic_Height_and_Weight_CVPRW_2021_paper.pdf）。
- AI 估高人像研究：中位誤差約 4.4% 身高（約 ±8 cm @183 cm），比不上專家以外的基準（https://www.nature.com/articles/s41598-023-31821-3.pdf）。

### 2.3 鑑別力
- 人群身高 SD 我未取得可引用數值；從 Günel 的「性別平均基準 MAE 5.91 cm」可推得男女分開後 SD 約在 7 cm 量級（正態下 MAE ≈ 0.8 SD）[推論]。
- 若實測誤差 σ≈4–5 cm、人群 SD≈6–7 cm，則高度資訊約只有 1 位元（約把 N 人砍成 N/2～N/3）；在數百人營區只能當「候選過濾」，不能辨識 [推論]。
- 制服軍帽、軍靴增加 2–4 cm 的系統性偏差，但因全員相同，偏差大致一致 [推論]。

### 2.4 需求與失敗
- 需固定相機一次校準、地平面近似平整；走動時頭高隨步態波動（約數 cm）需用多幀中位數 [推論]。
- 高俯視（3–6 m、陡 pitch）時頭頂至腳底的透視縮短強，對校準誤差更敏感；Thakkar 指出高仰角下失效 [證實]。
- 算力：極低（只需偵測與關鍵點，CPU 可）。
- 開源：無單一標準實作；可用 OpenCV 自行實作（homography + vanishing point）。

**判定**：低成本、對跨日穩定（身高不變）、但鑑別力弱；建議作「軌跡關聯時的先驗」與「異常值剔除」，不作主辨識。

---

## 3. 體型 / 3D（SMPL）

- 原理：HMR 2.0（4DHumans，ICCV 2023）用 ViT-H/16 讀 256×192 人物裁切，輸出 SMPL 姿態、形狀與相機 [證實]（https://arxiv.org/pdf/2305.20091）。訓練需 8×A100 約 6–7 天。
- 論文自述低解析度會降低重建品質；且沒有專門的形狀指標（僅 MPJPE/PA-MPJPE），形狀只被間接評估 [證實]。
- 形狀穩定性：Thakkar 指出 2D 關鍵點擬合偏向平均體型、體積（體重）誤差約 20.6%，不優於猜平均 [證實]。
- BRIAR（含 body shape 模型 CLIP3DReID）中 body shape 為最弱單一線索：TAR@0.1%FAR 55.4%（臉可見）/47.8%（臉受限）[證實]（https://arxiv.org/pdf/2505.04616）。
- 開源：https://github.com/shubham-goel/4D-Humans 為 MIT，但需另行註冊下載 SMPL（SMPL 模型授權為研究用途，商用需另購）[證實：需註冊；授權條款細節未查]。
- 算力：ViT-H 需 GPU；弱伺服器不可行。
- 失敗：制服厚重寬鬆遮蔽體型；俯視縮短身體；人物像素小。

**判定**：不建議。僅可在有 GPU 的離線批次作為輔助研究。

---

## 4. 步態（Gait）

### 4.1 原理
輸入通常為 64×44 二值剪影序列（OpenGait 設定）；模型（GaitSet/GaitPart/GaitGL/GaitBase/DeepGaitV2）學習跨幀的步態時空特徵。骨架式（GPGait、SkeletonGait）用 HRNet 等關鍵點；BigGait 直接用 RGB，經凍結的 DINOv2 取特徵。

### 4.2 量化證據
| 方法 | CASIA-B (NM/BG/CL) | OU-MVLP | GREW | Gait3D | 來源 |
|---|---|---|---|---|---|
| GaitBase | 97.6/94.0/77.4 | 90.0（論文）| 60.1 | 64.6 | https://arxiv.org/pdf/2211.06597 |
| DeepGaitV2 (2D/3D/P3D) | 約 88.8/89.6/89.6（總體）| 90.0/92.0/91.9 | 68.6/79.4/77.7 | 68.2/72.8/74.4 | https://arxiv.org/pdf/2303.03301 |
| SkeletonGait++ | – | – | 85.8 | 77.6 | https://arxiv.org/pdf/2412.11495 |
| MultiGait++（剪影+光流/解析）| – | – | 93.4 | 85.4 | 同上 |
| BigGait（CCPG 平均）| – | – | – | – | 87.2（全換衣 82.6）https://arxiv.org/pdf/2402.19122 |

GaitBase 每幀約 1.18 GFLOPs（ResNet9）；BigGait 約 30.8M 參數、12.7 GFLOPs @448×224（ViT-S/14 版）[證實]。GPGait（姿態式）跨域增益大，但同域不如剪影法，且正規化移除了絕對身高線索 [證實]（https://arxiv.org/pdf/2303.05234）。
SUSTech-Competition（HID 2025）冠軍 rank-1 94.2%，前幾名多用 DeepGaitV2 加骨架對齊 [證實]（https://arxiv.org/pdf/2602.07565）。
注意：這些高分來自資料集內評測；GREW 與 Gait3D 為野外但視角多為平視到小俯角。

### 4.3 高俯角證據
- VersatileGait（合成資料）：俯仰角僅涵蓋 0/15/30/60°；只用 0° 訓練的模型跨俯角明顯變差，且 60° 超出訓練範圍時下降 [證實]（https://arxiv.org/pdf/2105.14421）。
- DroneGait（96 人、垂直角 0–80°）：低角度訓練、高角度測試，CVVNet 34.3% rank-1，DeepGaitV2 25.7% [證實]（https://arxiv.org/pdf/2505.01837v3）。綜述表：60–80° 垂直視角下 V-Distill 81.0%、CVVNet 34.3–36.7%、30–60° 為 85.5–91.2%（https://arxiv.org/pdf/2511.17674）。
- ORNL 長距離評估：陡俯角（steep pitch）仍是最難條件，舊基準演算法無法處理（https://arxiv.org/pdf/2409.01540v1）。
- BRIAR（俯角至 50°）：gait 在臉受限時仍有 TAR@0.1%FAR 61.2%，臉可見時 66.3% [證實]。
- 推論 [推論]：你的 3–6 m 高架通常為近距離大俯角（可能 30–60°+），超出 CASIA-B/OU-MVLP 視角分佈；需要在目標視角上微調。

### 4.4 序列長度與解析度
- 官方訓練多用約 30 幀隨機取樣；[未知] 最短可用幀數的系統性研究（PeerJ 的少量幀研究未取得數字，不引用）。OpenGait 論文證實打亂幀序降低 3.7–15.8 點，時間資訊重要。
- 剪影解析度：RobustGait 固定 64×44，未做解析度壓力測試；局部失真（模糊、雜訊、遮擋）損害最大，剪影擷取器品質直接影響結果 [證實]（https://arxiv.org/pdf/2511.13065v1）。
- 人高像素下限：[未知]。

### 4.5 失敗模式
- 同制服：對步態是利多（剪影不依賴顏色，且衣服不變使 CL 因素少）。軍營中可能有負重/步槍/列隊行進等同步行為，使步態較同質 [推論]。
- 俯視、遮擋、群行：剪影分割與軌跡切割失敗。
- 跨日：步態短期穩定，疲勞、負重、鞋靴會影響；長期穩定性公開證據少 [未知]。

### 4.6 開源與授權
- OpenGait https://github.com/ShiqiYu/OpenGait：README 註明僅供學術用途，不可商用；支援 GaitBase、DeepGaitV2、SkeletonGait(++)、BigGait 等；權重在 Hugging Face（opengait/OpenGait）[證實]。
- 算力：GaitBase 類模型 CPU 可跑（剪影小），但需要前端分割或姿態；BigGait 與 DINOv2 需 GPU 才實用 [推論]。

**判定**：高潛力次要線索，尤其臉不可用時；但高俯角需自行資料驗證與微調，不能直接信任公開指標。

---

## 5. 制服下的殘餘細粒度外觀

### 5.1 技術
部件式 ReID：PCB（水平條帶）、MGN（多粒度）、BPBreID（以姿態/解析生成身體部位注意力）、KPR（關鍵點提示）。
- BPBreID（WACV 2023）：Occluded-Duke 上較前人 mAP +0.7、Rank-1 +5.6 [證實]（https://arxiv.org/abs/2211.03679）。作者自承「不同人可能有相同局部外觀」，這正是同制服的核心難題。程式碼 https://github.com/VlSomers/bpbreid ：Hippocratic License 3.0（含倫理使用限制，非標準 OSS），需 PifPaf + Mask-RCNN 產生標籤，權重 HRNet-W32 在 Google Drive。
- KPR（ECCV 2024）：Occ-PoseTrack-ReID 約 92% Rank-1；Occluded-Duke 約 80–84% Rank-1 [證實]（https://arxiv.org/pdf/2407.18112v1）。Swin 骨幹，算力需 GPU。

### 5.2 同制服證據
目前所有主流 ReID 基準（Market、Duke、MSMT）依賴衣著顏色差異。換衣研究顯示去除衣著後性能大跌：PRCC 跨衣 RGB 基線 PCB 僅 22.86% rank-1（來源 https://arxiv.org/pdf/2002.02295 ，該文提出輪廓草圖法 34.38%）。同制服比換衣更糟：外觀資訊被徹底壓平，只剩體型、鞋、配件、髮型。
[推論] 這類模型直接拿來用，在全員同制服下會退化成「比體型 + 背景 + 時間」，不可靠。

### 5.3 資料集是否存在（逐一查證）
- **FG-PersonX**：多次搜尋未找到。僅找到 PersonX（合成，1,266 身分、273,456 框）與 FineGPR（GTA5 合成，約 203 萬圖、1,150 身分、36 虛擬攝影機、13 項屬性，限研究用途，https://arxiv.org/pdf/2109.10498）。FineGPR 論文中不含 FG-PersonX。**結論：查無 FG-PersonX 這個名稱的資料集；可能是與 FineGPR / PersonX 混淆。[未知]**
- **Industrial-Gait**：搜尋僅得到工業環境步態隱私論文、UAV-Gait50 等，無名為 Industrial-Gait 的資料集。**查無。**
- **ConstrID**：搜尋僅得到營造工地安全監控與 ReID 應用論文，無名為 ConstrID 的公開資料集。**查無。**
- **FGPR（IJCV 2020）**：dblp 有 Yin、Wu、Zheng 之 "Fine-Grained Person Re-identification"（https://dblp.org/rec/journals/ijcv/YinWZ20.html）。我嘗試以 arXiv 2002.02295 驗證，但該文件是 PRCC 換衣論文，並非 FGPR 本體，因此 FGPR 的資料集內容與數字 [未知]，請使用者自行取原文確認，不要引用我對其內容的任何描述。

### 5.4 判定
殘餘外觀可做「配件／鞋／髮型／眼鏡」的弱屬性，但只有自建資料才能驗證；目前無公開資料可證明可行。建議以辦公室同制服同事資料做實測，才能判斷價值。

---

## 6. 全身 / 多生物特徵（遠距）

### 6.1 BRIAR 與 FarSight
- BRIAR（Cornett et al., WACVW 2023）：約 1,000 人、超過 35 萬張靜態影像與 1,300 小時影片，涵蓋至 1,000 m 距離、UAV 高視角 [證實]（https://openaccess.thecvf.com/content/WACV2023W/LRR/html/Cornett_Expanding_Accurate_Person_Recognition_to_New_Altitudes_and_Ranges_The_WACVW_2023_paper.html）。取得需向主辦單位申請，授權條件頁面未載 [未知]。
- FarSight 型多模融合（https://arxiv.org/pdf/2505.04616，BRIAR Protocol V5.0.1，Treatment 424 人）[證實]：

| 模態 | TAR@0.1%FAR 臉可見 / 臉受限 | Rank-20 |
|---|---|---|
| 臉（ViT + KP-RPE）| 66.4 / 30.7 | 80.0 / 42.9 |
| 步態（BigGait）| 66.3 / 61.2 | 93.2 / 90.6 |
| 體型（CLIP3DReID）| 55.4 / 47.8 | 82.9 / 79.1 |
| 融合（品質引導）| 83.1 / 65.0 | 95.5 / 91.0 |

啟示：融合勝過任何單一線索；臉不可見時步態最強。注意其指標是 Rank-20 與 TAR@0.1%FAR，並非 Rank-1，且資料含至 50° 俯角與最遠 1,000 m。
- BRIARNet（Faster R-CNN 全身偵測）：沒有臉資料訓練時 rank-20 跌到約 38%、TAR@1%FAR 約 23%（有臉 75.13%、54.09%），顯示臉資訊貢獻很大 [證實]（https://arxiv.org/pdf/2311.05725v1）。
- 純影像外觀模型（Swin-BIDDS）在 BRIAR 全部探針（皆換衣）Rank-1 僅 0.391、TAR@FAR1e-3 為 0.358，UAV 子集 Rank-1 0.405 [證實]（https://arxiv.org/pdf/2502.07130）。

### 6.2 SapiensID（CVPR 2025）
ViT-B + KP-RPE + AdaFace loss；Retina Patch 同時取全身、上半身、臉三區；人物 384×384；臉辨識 IJB-B/C 為 95.07/96.43（AdaFace 95.60/97.14）；IJB-S 以身體探針對臉圖庫 Surv2Single Rank-1 72.6、UAV2Book 39.2 [證實]（https://arxiv.org/pdf/2504.04708）。FLOPs 約 35.4G（ViT 基準 24.7G）；需大量 GPU 訓練（7 張）。程式碼 https://github.com/mk-minchul/sapiensid 已公開，含預訓練模型，授權類型頁面未顯示 [未知]。算力對弱伺服器偏重，可離線批次。

### 6.3 判定
概念上正確的方向（品質引導的臉 + 步態 + 體型融合），但公開系統需 GPU，且多數針對遠距平視/UAV，不是近距高架俯視。可借用其「品質加權融合」設計。

---

## 7. 跨線索比較表

| 線索 | 最低解析度（已證實處） | 高俯角穩健性 | 跨日穩定 | 算力 | 同制服價值 | 成熟度 |
|---|---|---|---|---|---|---|
| 臉（AdaFace/MagFace）| 頭高 ≥20 px（BRIAR 定義）；瞳距 15–100 px 為實測範圍 | 低（pitch >30° 急降）| 高 | 低–中（CPU 可，需抽幀）| 高 | 高 |
| 身高（單目）| [未知] | 中低（高仰角失效）| 高 | 極低 | 低（弱先驗）| 中 |
| 體型 SMPL | 低解析度降質，數字 [未知] | 低 | 中 | 高（GPU）| 低 | 低 |
| 步態（剪影/DeepGaitV2）| [未知]（64×44 剪影輸入）| 低–中（需微調，高垂直角大降）| 中（長期 [未知]）| 低–中 | 高 | 中（實驗室高，野外中）|
| 殘餘外觀（部件 ReID）| 無同制服證據 | 中 | 低–中 | 中–高 | 低（未驗證）| 低 |
| 多模融合（FarSight/SapiensID）| 頭高 ≥20 px 劃分；人體至數十像素 | 中（BRIAR 至 50°）| 中 | 高 | 高 | 中（研究）|

---

## 8. 對本專案的建議（決策導向）

1. 主線：臉（SCRFD-2.5GF/10GF 偵測 + AdaFace/MagFace 特徵 + CR-FIQA 或範數門檻），註冊影像降質匹配，品質加權的 track-level 聚合。
2. 副線：步態（DeepGaitV2/GaitBase 類剪影法），在你自己的高俯角影片上做微調與視角分組評估；用於臉不可見的軌跡。
3. 弱先驗：校準後的身高、軌跡時空約束（同日攝影機拓撲、速度）。
4. 暫不採用：SMPL 體型、通用部件 ReID。
5. 授權警示：InsightFace 預訓練模型（含 SCRFD、buffalo_l）、CR-FIQA、OpenGait 皆限非商用/學術；若將轉成正式採購系統，需改用 MIT/Apache 的 AdaFace/CVLface/MagFace 並重新訓練或取得授權。
6. 自建驗證：辦公室同制服同事資料應拆成「高俯角、不同日」協定，量測 Surv-to-Surv 的 TPIR@FPIR，而非依賴公開 Rank-1。

---

## 來源清單（去重）

- AdaFace: Quality Adaptive Margin for Face Recognition, CVPR 2022 — https://arxiv.org/abs/2204.00964 、https://arxiv.org/pdf/2204.00964
- AdaFace repo — https://github.com/mk-minchul/AdaFace
- CVLface repo — https://github.com/mk-minchul/CVLface
- MagFace, CVPR 2021 — https://openaccess.thecvf.com/content/CVPR2021/papers/Meng_MagFace_A_Universal_Representation_for_Face_Recognition_and_Quality_Assessment_CVPR_2021_paper.pdf ；repo https://github.com/IrvingMeng/MagFace
- SDD-FIQA, CVPR 2021 — https://arxiv.org/pdf/2103.05977
- CR-FIQA, CVPR 2023 — https://openaccess.thecvf.com/content/CVPR2023/supplemental/Boutros_CR-FIQA_Face_Image_CVPR_2023_supplemental.pdf ；repo https://github.com/fdbtrs/CR-FIQA
- Considerations on the Evaluation of Biometric Quality Assessment Algorithms, 2023 — https://arxiv.org/pdf/2303.13294
- Meet-in-the-middle: cross-resolution face recognition, WACVW 2023 — https://arxiv.org/pdf/2211.15225
- Exploring Factors for Improving Low Resolution Face Recognition, 2019 — https://arxiv.org/pdf/1907.10104
- Analysis of deep SR for LR face recognition（碩論）, 2021 — https://arxiv.org/abs/2101.10845
- Pose Impact Estimation on Face Recognition using 3D-Aware Synthetic Data, 2023 — https://arxiv.org/pdf/2303.00491
- SCRFD, ICLR 2022 — https://arxiv.org/pdf/2105.04714
- InsightFace — https://github.com/deepinsight/insightface （README: https://raw.githubusercontent.com/deepinsight/insightface/HEAD/README.md）
- Person Recognition at Altitude and Range: Fusion of Face, Body Shape and Gait, 2025 — https://arxiv.org/pdf/2505.04616
- Unconstrained Body Recognition at Altitude and Range, 2025 — https://arxiv.org/pdf/2502.07130
- Whole-body Detection, Recognition and Identification at Altitude and Range (BRIARNet), 2023 — https://arxiv.org/pdf/2311.05725v1
- BRIAR dataset, WACVW 2023 — https://openaccess.thecvf.com/content/WACV2023W/LRR/html/Cornett_Expanding_Accurate_Person_Recognition_to_New_Altitudes_and_Ranges_The_WACVW_2023_paper.html
- Long-Range Biometric Identification in Real World Scenarios, ORNL, 2024 — https://arxiv.org/html/2409.01540v1
- SapiensID, CVPR 2025 — https://arxiv.org/abs/2504.04708 ；repo https://github.com/mk-minchul/sapiensid
- Person Recognition in Aerial Surveillance: A Decade Survey, 2025 — https://arxiv.org/pdf/2511.17674
- Gravity as a Reference for Estimating a Person's Height from Video, ICCV 2019 — https://arxiv.org/pdf/1909.02211
- What Face and Body Shapes Can Tell Us About Height, ICCVW 2019 — https://openaccess.thecvf.com/content_ICCVW_2019/papers/WIDER/Gunel_What_Face_and_Body_Shapes_Can_Tell_Us_About_Height_ICCVW_2019_paper.pdf
- On the Feasibility of 3D Model-Based Forensic Height and Weight Estimation, CVPRW 2021 — https://openaccess.thecvf.com/content/CVPR2021W/WMF/papers/Thakkar_On_the_Feasibility_of_3D_Model-Based_Forensic_Height_and_Weight_CVPRW_2021_paper.pdf
- AI vs experts height estimation, Sci Rep 2023 — https://www.nature.com/articles/s41598-023-31821-3.pdf
- Single View Metrology (Criminisi), ICCV 1999 — https://www.graphics.pku.edu.cn/docs/Criminisi99singleViewMetrology.pdf （僅確認存在，未取數字）
- Humans in 4D (HMR 2.0), ICCV 2023 — https://arxiv.org/pdf/2305.20091 ；repo https://github.com/shubham-goel/4D-Humans
- OpenGait / GaitBase, CVPR 2023 — https://arxiv.org/pdf/2211.06597 ；repo https://github.com/ShiqiYu/OpenGait
- DeepGaitV2 — https://arxiv.org/pdf/2303.03301
- BigGait, CVPR 2024 — https://arxiv.org/pdf/2402.19122
- Exploring More from Multiple Gait Modalities (MultiGait++/SkeletonGait++), 2024 — https://arxiv.org/pdf/2412.11495
- GPGait, ICCV 2023 — https://arxiv.org/pdf/2303.05234
- CVVNet / DroneGait, 2025 — https://arxiv.org/pdf/2505.01837v3
- VersatileGait — https://arxiv.org/pdf/2105.14421
- RobustGait — https://arxiv.org/pdf/2511.13065v1
- HID 2025 competition report — https://arxiv.org/pdf/2602.07565
- Cross-Covariate Gait Recognition (CCGR/CCPG) — https://arxiv.org/pdf/2312.14404
- BPBreID, WACV 2023 — https://arxiv.org/abs/2211.03679 ；repo https://github.com/VlSomers/bpbreid
- KPR, ECCV 2024 — https://arxiv.org/pdf/2407.18112v1
- FineGPR / Less is More (synthetic), 2021 — https://arxiv.org/pdf/2109.10498
- Fine-Grained Person Re-identification, IJCV 2020（僅確認書目）— https://dblp.org/rec/journals/ijcv/YinWZ20.html
- Person Re-identification by Contour Sketch under Moderate Clothing Change (PRCC), 2020 — https://arxiv.org/pdf/2002.02295

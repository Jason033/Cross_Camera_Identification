# 軌 C：多模態融合、身分分群與系統級關聯研究報告

適用情境：軍營、全員同制服、高架 RGB CCTV、人臉模糊、每營區僅有弱算力伺服器、每日批次影片。
標記：[證實]＝有文獻或我實際讀到的摘要/頁面支持；[推論]＝由證據合理推導但未直接驗證於本情境；[未知]＝查無資料或本次未能取得。
方法說明：本次以 WebSearch 共 26 次為主，搭配 arxiv.org 摘要頁的 WebFetch。多數搜尋僅回傳連結而無內文，因此本報告中「數字」只收錄我實際讀到的頁面；凡未讀到全文表格者，標 [未知] 而不補數字。

---

## 0. 先釐清兩個任務（分類 vs 識別）

| 項目 | 分類 (clustering) | 識別 (identification) |
|---|---|---|
| 輸入 | 一天（或一段期間）所有 tracklet | 一個匿名 cluster + 註冊資料庫 |
| 輸出 | 匿名 ID 集合，今日不同人數 | 已知 ID 或「未知」 |
| 評估 | pairwise/BCubed F、NMI、人數誤差 | DIR@FAR、FPIR/FNIR |
| 關鍵風險 | 相似制服造成誤併、人被拆成多群 | 假陽性（把訪客認成官兵） |

設計原則 [推論]：兩者必須解耦。分群品質決定「人數」與「軌跡」；識別只是在「已聚好的群」上做一次 1:N 開集比對，且可用整個 cluster 的多張證據，比單 tracklet 比對穩定。

---

## 1. 多生物特徵融合

### 1.1 融合層級
- 感測器層／特徵層／分數層／決策層。[證實] 這是 Ross & Jain 與 Nandakumar 系列標準分類（背景見 https://arxiv.org/pdf/1011.6220 的多模態生物辨識綜述）。
- 特徵層：把各模態 embedding 串接或交叉注意力。優點是資訊最完整；缺點是需要「同一批人多模態成對訓練資料」，且缺模態時要特殊處理。[推論]
- 分數層：各模態各自算比對分數再合併。最常用，因為各模態模型可獨立訓練與升級，適合你「弱伺服器、模型分開部署」的情況。[推論]
- 決策層：各模態先各自判是否同人，再投票。資訊損失最大，對軍營場景不建議。[推論]

### 1.2 分數正規化
各模態分數尺度不同（人臉 cosine、步態距離、身高差），不能直接相加。

| 方法 | 公式 | 特性 |
|---|---|---|
| Min-Max | s' = (s − min)/(max − min) | 簡單，對離群值敏感 |
| Z-score | s' = (s − μ)/σ | 假設近似高斯，對離群值也敏感 |
| Tanh | s' = ½[tanh(0.01(s−μ)/σ)+1] | 用穩健估計量，對離群值較穩 |
| Likelihood ratio | LR = p(s|同人)/p(s|不同人) | 轉成同一個機率語意，理論上最佳 |
| Platt（sigmoid 校準） | P(同人|s)=1/(1+exp(As+B)) | 參數少，需少量標註 |
| Isotonic | 單調非參數映射 | 彈性高，資料少時易過擬合 |

- 前三者的比較在 Jain、Nandakumar、Ross 的正規化論文（連結見 https://doi.org/10.1016/J.PATCOG.2005.01.012）。[證實：論文存在與主題；我未讀到其中的量化比較表，因此不引用其數字，數字 [未知]]
- Nandakumar 的似然比融合：用有限高斯混合模型估計同人與異人分數的聯合密度，再以 LR 當融合分數（背景見 https://apps.dtic.mil/sti/pdfs/ADA488585.pdf）。[證實：方法存在；具體增益數字 [未知]]
- 平白解釋：LR 融合的好處是「把每個模態變成『證據強度』」，在獨立假設下，總證據是對數似然比相加，也就是 log LR_total = Σ_m log LR_m。對缺模態很自然——缺的就不加（相當於該項 LR=1）。[推論，來自 LR 數學性質，非特定論文結論]
- 對你的場景：同制服下人臉分數、身高分數的「異人分布」與一般資料集差異極大（身高分布窄），因此應以「營區自己的歷史資料」估計 p(s|異人)，而不是沿用公開資料集的校準。[推論]

### 1.3 品質融合與缺模態
- 品質相依融合基準：BioSecure DS2 上有 22 個融合系統被比較，輸入包含各子系統分數以及註冊/測試樣本的品質量測，並測試了採集或比對失敗時的表現。[證實] https://arxiv.org/abs/2111.08703 （摘要未給出「誰最佳」，勝者與增益 [未知]）
- BRIAR 全身融合（FarSight 系列）：對串接後的分數矩陣做正規化，品質估計器自骨幹中間特徵預測各模態權重，再用 mixture-of-experts 層做加權和；兩階段訓練（先 ranking loss 訓練品質，再凍結並以 score triplet loss 訓練融合）。[證實] https://arxiv.org/pdf/2505.04616
  - 論文只報告三模態都在的情況，未說明缺模態處理。[證實，同上]
  - 數字：BRIAR EVP 5.0.1、Treatment 探針集、Simple 圖庫，TAR@0.1% FAR；僅人臉在 Face-Restricted 為 30.7%，三模態融合為 65.0%；Face-Included 為人臉 66.4%、融合 83.1%。[證實] https://arxiv.org/pdf/2505.04616
  - 同一組作者的初版系統與最新版之間，TAR@0.1% FAR 絕對增益 34.1%（這是版本間，非單純融合增益）。[證實] https://arxiv.org/abs/2505.04616
- HAMoBE（ICCV 2025）：凍結 CLIP ViT-L/14；第一層 8 個 MLP 專家，第二層 3 個專家（長期體型、短期外觀、時序步態），softmax gate 加權；gate 同時看 gallery 與 query 影片。[證實] https://arxiv.org/abs/2508.05038
  - MEVID 換衣設定：mAP 15.1%、Top-1 20.1%，分別勝過第二名 5.5 與 8.9 點；MARS 約 +1.7 mAP；LS-VID 約 +1.4 mAP。[證實] 同上（該頁自己提到基線標示可能有誤，引用時需審慎）
- FusionAgent：用多模態 LLM 決定每個樣本呼叫哪些專家模型，並提出 Anchor-based Confidence Top-k (ACT) 融合，用最有信心的模型當錨。[證實] https://arxiv.org/abs/2603.26908 （摘要無數字；對弱伺服器而言 LLM 代理過重 [推論]）
- 學習式融合 vs 正規化後加總：BRIAR 與 HAMoBE 都顯示學習式加權在其基準上有效，但我**沒有找到**在同一基準上「學習式融合」與「z-score/LR 簡單和」嚴格對照的量化表。[未知] 建議在自家資料做這個消融（見 §7）。

### 1.4 融合建議 [推論]
1. 先用「校準 + 對數似然比相加」作為基線（可解釋、可處理缺模態、不需大量成對資料）。
2. 品質變數（臉的清晰度、軌跡長度、遮擋比例、是否俯視角度過大）作為 LR 的條件變數：p(s|同人, q)。
3. 資料夠多後，才換成小型學習式 gate（可用 logistic regression 或 2 層 MLP 取代 LLM/大型 MoE）。

---

## 2. Tracklet 層級聚合

- 集合式人臉識別（IJB 風格）：不再逐張比，而把一個 track 的多張臉聚合成一個 template。
- 品質加權池化：f_T = Σ w_i f_i / ‖Σ w_i f_i‖，w_i 為品質分數。Multicolumn Network 先以自我品質模組給各影像權重，再依集合內相對有用度重校準；在 IARPA IJB 基準上對先前架構提升 2–6%。[證實] https://arxiv.org/abs/1807.09192
- 機率式聚合：Probabilistic Face Embeddings 把每張臉表示為高斯分布（均值＋不確定度），可依不確定度做機率式融合，且不確定度能預測比對準確度。[證實] https://arxiv.org/abs/1904.09658 （摘要無具體數字）
- 品質評估：SER-FIQ 以隨機 embedding 的穩健度做無監督品質估計。[證實] https://arxiv.org/abs/2003.09373 （數字 [未知]）
- 對你的場景 [推論]：
  - 用 tracklet 內的「高品質前 k 張」做門檻選擇（quality gate），其他幀只貢獻外觀/身高。
  - 同時保存 template 的「張數與品質總和」，在聚類階段當作信心度（短且糊的 tracklet 容易誤併，應降權或延後併入）。
  - 身高：多幀用中位數或加權中位數，並記錄不確定度（像素高度→實際高度依賴相機標定與腳點偵測）。

---

## 3. 未知身分的分群

### 3.1 演算法一覽
| 類別 | 代表 | 重點 | 證據 |
|---|---|---|---|
| 傳統 | DBSCAN/HDBSCAN、階層式凝聚、Infomap | 免訓練、可直接用；DBSCAN 需調 eps | [推論]，我未取得它們在制服情境的數據 |
| 監督式圖方法 | Linkage-GCN (Wang et al. CVPR2019) | 把分群視為連結預測；為每個實例建子圖，用 GCN 推論兩點是否同人；不需預先知道群數，能處理雜訊與離群 | [證實] https://arxiv.org/abs/1903.11306 （摘要無 F 值，[未知]） |
| 監督式圖方法 | GCN-V/GCN-E (Yang et al.) | GCN-V 估計頂點信心，GCN-E 估計邊連結強度；比先前監督法約快十倍 | [證實] https://arxiv.org/abs/2004.00445 |
| 監督式圖方法 | Learning to cluster on affinity graph (CVPR2019) | GCN 加偵測與分割模組 | [證實] https://arxiv.org/abs/1904.02749 |
| 大規模 | STAR-FC | 結構保持子圖取樣，訓練樣本由約 10 萬擴至 1000 萬；部分 MS1M 上 pairwise F=91.97，耗時 310 秒 | [證實] https://arxiv.org/abs/2103.13225 |
| 圖精煉 | Ada-NETS | 在結構空間中精煉特徵，自適應決定每點鄰居數以刪除跨身分雜訊邊 | [證實] https://arxiv.org/abs/2202.03800 （數字 [未知]） |
| 線上 | OGMC | 每個身分用多個相連高斯；新臉不需整體重聚；IJB-B 上 F 最高且約快 6 倍；三百萬干擾下僅小幅下降；約兩小時處理超過三百萬張 | [證實] https://arxiv.org/abs/2103.17272 |
| 影片 | Ball Cluster Learning | 學一個球半徑當合併停止條件，同時估群數 | [證實] https://arxiv.org/abs/1908.03381 |

重點觀察 [推論]：上述監督式方法都在「單一網域、人臉特徵清晰、身分多（數十萬到數百萬）」的資料集訓練與測試。你的場景是「每日人數少（數十～數百）、特徵品質差、人與人高度相似」，因此：(a) 大規模 GCN 的優勢（算力與規模）用不上；(b) 它們的訓練域與你不同，需要自己的標註資料微調。小規模下，帶約束的階層式凝聚往往已足夠，且最容易加入 cannot-link。

### 3.2 約束式分群（你的最大槓桿）
- must-link：同一 tracker 產生的同一 tracklet 內所有偵測（甚至跨攝影機重疊視野且地面座標吻合者）。
- cannot-link：
  1. 同一影格內兩個不同偵測框（一人不可同時出現兩處）。
  2. 兩個 tracklet 時間重疊但在不重疊視野的不同攝影機。
  3. 兩個 tracklet 的轉移時間小於攝影機間最短可行步行時間（物理不可能）。
- 傳遞閉包：若 A must-link B、B cannot-link C，則 A cannot-link C。
- 做法 [推論]：先對 tracklet（不是對單幀）建親和矩陣 S_ij（融合分數的校準機率），把 cannot-link 的 S 設為 0（或負無窮），再做平均連結凝聚；合併時檢查整群之間是否有任何 cannot-link，有就禁止。
- 影片人臉分群利用約束的相關研究：Constrained Video Face Clustering using 1NN Relations（BMVC 2020，資料來源見 https://www.bmva-archive.org.uk/bmvc/2020/assets/papers/0899.pdf）。[證實：論文存在；增益數字 [未知]]

### 3.3 估計人數
- 做法一：距離門檻 τ 從驗證集選擇（最大化 pairwise F）。簡單，但門檻會隨天氣、季節、相機漂移，見 §5。
- 做法二：學習停止條件（如 Ball Cluster Learning 學半徑）。[證實] https://arxiv.org/abs/1908.03381
- 做法三：Infomap/HDBSCAN 自動決定群數，但離群點當雜訊——你需要「人數」，所以雜訊必須單獨報告成「低信心 tracklet」而非丟棄。[推論]
- 人數誤差應同時報 |K̂ − K| 與 ±區間，區間可由 bootstrap 或在不同 τ 下的人數曲線穩定平台推得。[推論]

### 3.4 評估指標
- Pairwise F：以所有 tracklet 對是否同人的精確率/召回率；對大群敏感。
- BCubed F：以每個元素為單位計算其所屬群的 P/R，再平均；對群大小較公平。
- NMI：資訊量；對群數過多/過少較不敏感。
- 另加：**純度（誤併率）與碎裂率**分開報，因為軍事場景中「誤併」與「拆人」的後果不同。[推論]
- 公共基準的數字多屬人臉資料集，我未找到制服/俯視 CCTV 場景的分群基準。[未知]

---

## 4. 多目標多攝影機追蹤 (MTMC)

### 4.1 指標
- IDF1：以全局最佳身分對應計算 ID 級的 precision/recall，其原論文提出兩個「計入所有錯誤類型且優先考慮身分正確」的精確率/召回率度量，並同時發布 DukeMTMC（8 台攝影機、超過 2,700 身分、約 85 分鐘、超過 200 萬幀 1080p/60fps）。[證實] https://arxiv.org/abs/1609.01775
- HOTA：把偵測、關聯、定位三種能力平衡成單一分數，並由子指標分別對應五種基本錯誤。[證實] https://arxiv.org/abs/2009.07736
- 對你的場景 [推論]：IDF1 與 HOTA 的 AssA 最貼近「軌跡是否跨相機連續」；但你的真正目標是「同日 + 跨日同一人」，需自訂跨日 IDF1（以每日重置的 ID 作為不同序列）。

### 4.2 AI City Challenge
- 2023 年第七屆首次新增「多目標多攝影機人員追蹤」賽道，可使用真實與高擬真合成資料。[證實] https://arxiv.org/abs/2304.07500 （摘要無 MTMC 成績）
- 2024 年第八屆強化了攝影機數量、人物數量、3D 標註、相機矩陣，並鼓勵線上演算法。[證實] https://arxiv.org/abs/2404.09432 （摘要無冠軍與 HOTA 數字）
- 我確認存在的參賽論文：2023 Nguyen 等（https://openaccess.thecvf.com/content/CVPR2023W/AICity/html/Nguyen_Multi-Camera_People_Tracking_With_Mixture_of_Realistic_and_Synthetic_Knowledge_CVPRW_2023_paper.html）、2024 Xie 等的幾何一致性線上系統（https://openaccess.thecvf.com/content/CVPR2024W/AICity/papers/Xie_A_Robust_Online_Multi-Camera_People_Tracking_System_With_Geometric_Consistency_CVPRW_2024_paper.pdf）、2024 OCMCTrack（https://openaccess.thecvf.com/content/CVPR2024W/AICity/html/Specker_OCMCTrack_Online_Multi-Target_Multi-Camera_Tracking_with_Corrective_Matching_Cascade_CVPRW_2024_paper.html）與以 anchor-feature 階層式分群的線上方法（https://mlanthology.org/cvprw/2024/cherdchusakulchai2024cvprw-online）。[證實：論文存在；各自 HOTA/名次 [未知]，本次未讀全文]
- 共通設計 [推論，由標題與賽題性質推斷，非逐篇驗證]：單相機 tracking → 以 ReID 特徵做 tracklet → 以相機幾何/時間約束做跨相機階層式分群。這與你的架構同構，但這些賽事是工廠/倉儲環境、有重疊視野與標定，而你的是非重疊 CCTV。

### 4.3 攝影機拓撲與轉移時間
- 做法：估計相機對 (a,b) 之間的轉移時間分布 p(Δt | a→b)，並以它對 ReID 外觀分數做貝氏式修正：P(同人|外觀, Δt) ∝ P(外觀|同人)·p(Δt|a→b)。[推論，為通用公式]
- 距離型拓撲推論：以相機標定與尺度差估計相機間距，再估各人步速以適應不同轉移時間，在大型相機網路上有增益。[證實] https://arxiv.org/abs/1712.00158 （摘要無數字）
- 其他拓撲/轉移時間論文：Loy 等 CVPR2009/IJCV2010（連結見 https://staff.ie.cuhk.edu.hk/~ccloy/files/ijcv_2010.pdf）。[證實：存在；數字 [未知]]
- 軍營情境優勢 [推論]：營區道路與建築固定、人流有作息規律（集合、用餐、出操），轉移時間分布更可預測，且可引入「時段先驗」（早點名時段多人同方向）。

### 4.4 時空約束的量化增益
- st-ReID（AAAI 2019）：在 Market-1501 Rank-1 從約 91.2% 升到 98.1%；DukeMTMC-reID 從約 83.8% 升到 94.4%。[證實] https://arxiv.org/abs/1812.03282 （頁面未給 mAP；基線為視覺法，該頁未明確標示）
- 重要警告 [推論]：這兩個資料集的相機為校園/街道、人穿著各異，外觀本已有力；時空約束增益來自「剔除時間上不可能的候選」。你的場景外觀鑑別力更弱，時空約束的相對價值可能**更大**，但因為人流密度高（同時間許多人走相同路徑），時空約束的「鑑別力」也可能**較低**。哪一個占上風 [未知]，需實測。

---

## 5. 跨日／長期連結與開集

### 5.1 為什麼跨日最難
- 同制服的「當日殘留外觀」（髮型、鞋、背包、體型輪廓）次日可能改變；跨日主要可靠的線索是：人臉（若品質夠）、身高/體型比例、步態。[推論]
- 因此建議「雙層身分」：
  - 日內身分 (day-ID)：用所有線索，約束強。
  - 跨日身分 (global-ID)：只用「跨日穩定」的特徵（臉、身高、步態）做 cluster 到 cluster 比對，且要求更高的證據。

### 5.2 增量分群與 template 更新
- 線上人臉分群可不重聚整個資料庫：OGMC 以多高斯代表單一身分以涵蓋光線/姿態/遮擋變化，每個新臉增量處理。[證實] https://arxiv.org/abs/2103.17272
- Template 更新風險：把錯併的 tracklet 納入 template 後 template 漂移，形成「滾雪球式」誤併。[推論] 緩解：(1) 只用高信心、含高品質前 k 張的 tracklet 更新；(2) 保留多原型而非單一平均；(3) 保存「凍結種子」template 作回溯基準；(4) 設定新資料與種子的距離上限。
- Lifelong ReID（持續學習、避免遺忘）：有 2024–2025 的多篇綜述/方法（例如 https://arxiv.org/pdf/2411.06023v1、https://arxiv.org/html/2508.01587v3），主題為跨域持續學習與災難性遺忘。[證實：存在；與你「固定營區單域」的相關性有限，數字 [未知]]

### 5.3 新兵與訪客（開集）
- 開集 1:N 的標準指標：FPIR（非註冊者被誤判為某註冊者的比率）與 FNIR（註冊者被漏識或誤識的比率），NIST FRVT Part 2 / FRTE 1:N 即採此（https://pages.nist.gov/frvt/html/frvt1N.html、https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.8271.pdf）。[證實：報告存在；具體 FNIR 數值 [未知]，本次未讀]
- DIR@FAR 為較早的開集度量（偵測與識別率對應一個假警報率）。
- 在/不在圖庫判斷：2025 年的方法改用同一身分其他註冊照片的排名作特徵，訓練分類器，而非只靠分數門檻；只對以 margin loss 訓練的新匹配器有效。[證實] https://arxiv.org/abs/2508.06357
- 建議流程 [推論]：cluster 與 DB 比對時，用整個 cluster 的所有 tracklet 做「多證據」投票（至少 k 個獨立 tracklet 一致且最佳與次佳分數有明確間隔）才宣告已知；否則維持「未知-#N」，並累積至 N 次出現後提示人工註冊。

---

## 6. 已量化證據總表

| 主張 | 數字 | 資料集/條件 | 來源 |
|---|---|---|---|
| 時空約束 | Rank-1 91.2→98.1% | Market-1501 | https://arxiv.org/abs/1812.03282 |
| 時空約束 | Rank-1 83.8→94.4% | DukeMTMC-reID | https://arxiv.org/abs/1812.03282 |
| 三模態融合 | TAR@0.1%FAR 66.4→83.1%（Face-Included）；30.7→65.0%（Face-Restricted） | BRIAR EVP 5.0.1 | https://arxiv.org/pdf/2505.04616 |
| 集合品質加權 | IJB 基準提升 2–6% | VGGFace2 訓練 | https://arxiv.org/abs/1807.09192 |
| 專家混合 | MEVID 換衣 15.1 mAP / 20.1 Top-1 | 換衣設定 | https://arxiv.org/abs/2508.05038 |
| 分群 | pairwise F 91.97，310 秒 | 部分 MS1M（STAR-FC） | https://arxiv.org/abs/2103.13225 |
| 線上分群 | 約 6 倍加速；>300 萬臉約 2 小時 | IJB-B / MS-Celeb 子集 | https://arxiv.org/abs/2103.17272 |
| GCN-V/E | 約 10 倍快 | 兩個大型資料集 | https://arxiv.org/abs/2004.00445 |

**約束式分群的增益**、**學習式融合 vs 簡單和**、**制服場景分群 F 值**：均 [未知]，本次沒有找到可引用的數字。

---

## 7. 系統假想

### 7.1 架構總覽
每日批次：影片 → 偵測/追蹤 → tracklet 特徵 → 日內分群 → 跨日連結 → 識別 → 軌跡/報表。

| 階段 | 演算法選項 | 輸入 → 輸出 | 評估指標 | 證據狀態 |
|---|---|---|---|---|
| 1 攝取與偵測 | 輕量偵測器（如 YOLO 系，量化後可跑 CPU/小 GPU）；逐路串流處理後釋放原始幀 | 影片 → 人框、時間戳 | 偵測 AP、漏檢率 | 偵測本身屬成熟技術；本次未取數字 [未知] |
| 2 單相機追蹤 | ByteTrack/BoT-SORT 類；輸出 tracklet 與 tracklet 內 must-link | 人框 → tracklet | IDF1、HOTA | [證實 HOTA/IDF1 為標準指標；具體追蹤器數字 [未知]] |
| 3 Tracklet 特徵 | 臉：品質門檻 + 品質加權池化（或 PFE）；全身 ReID embedding；身高（腳點+標定）；步態（長 tracklet 才算）；品質向量 q | tracklet → {f_face, f_body, h, g, q} | 各模態 EER、品質-誤差相關 | 臉聚合 [證實]；身高/步態在制服情境 [推論] |
| 4 成對分數與校準 | 各模態分數 → 校準 LR（Platt/isotonic/GMM），以營區歷史資料估 p(s|異人)；缺模態項略過 | 兩 tracklet → P(同人) | 校準誤差(ECE)、AUC | LR 融合 [證實存在]；制服情境校準 [推論] |
| 5 時空約束 | 相機拓撲 + 轉移時間分布；產生 cannot-link 與似然修正項 | 相機對/時間 → 約束、p(Δt) | 約束違反率、被誤排除的真匹配率 | st-ReID 增益 [證實]；軍營情境 [推論] |
| 6 同日分群 | 約束式平均連結凝聚（小規模）；規模大時可試 HDBSCAN/Infomap 或預訓練 GCN；低信心 tracklet 另存 | 親和矩陣 + 約束 → day-ID | pairwise/BCubed F、NMI、純度、碎裂率、人數誤差 | 純演算法 [證實]；約束增益數字 [未知] |
| 7 跨日連結 | 日內 cluster 以「跨日穩定特徵」建 template（多原型）；與全域庫以增量方式比對（OGMC 風格）；高門檻、多證據 | day-ID 群 → global-ID | 跨日 IDF1、誤併率 | 增量分群 [證實]；制服跨日 [推論/未知] |
| 8 識別 | 每個 cluster 對註冊 DB 做 1:N；多 tracklet 一致 + top1/top2 間隔；否則「未知」 | global-ID → 已知/未知 | FPIR@FNIR 操作點、DIR@FAR | 指標 [證實]；cluster 級決策 [推論] |
| 9 軌跡與報表 | 依時間排序 tracklet，連接相機；輸出人數、每人軌跡、信心與疑義清單 | → 報表、人工覆核佇列 | 軌跡 IDF1、人工覆核負荷 | [推論] |

### 7.2 部署於弱伺服器 [推論]
- 夜間批次執行；原始影片只保留 tracklet 特徵與少量代表影像。
- 分群在 tracklet 層（每日可能僅數千筆），O(N²) 成對矩陣即可，不需 GCN。
- 只對「邊界模糊的群」呼叫較重的模型（如更高解析度臉部、步態）——類似 FusionAgent 的「依需呼叫專家」思想，但用規則而非 LLM。

### 7.3 失敗模式與對策
| 失敗模式 | 成因 | 對策 | 狀態 |
|---|---|---|---|
| 相似者被誤併 | 同制服、外觀分數整體偏高 | 外觀只當弱證據；以身高/臉/約束把關；合併須通過 cannot-link 檢查；輸出純度指標 | [推論] |
| 同一人被拆成多群（日內） | 視角、光線、遮擋造成 tracklet 特徵差 | 第二輪合併：以時空連續性提高親和；允許人工確認 | [推論] |
| 跨日拆分 | 次日外觀變 | 只用跨日穩定特徵；多證據累積；容忍「未連結」而非強連 | [推論] |
| 誤差傳播 | 錯併的 tracklet 污染 template，後續更多誤併 | 只用高信心更新；保留種子；可回溯 | [推論] |
| 門檻漂移 | 季節、光線、換相機、模型更新 | 定期以標註子集重估校準；監控分數分布；固定模型版本號 | [推論] |
| 人數低估/高估 | τ 不當 | 報區間；穩定平台；雜訊 tracklet 另計 | [推論] |
| 假陽性識別（訪客被認成官兵） | 開集 + 低品質比對 | 多證據、top1/top2 間隔、FPIR 先於 FNIR 設定 | [推論；FPIR 指標 [證實]] |
| 隱私與安全 | 生物特徵集中保存 | 特徵加密、保留期限、稽核 | [推論] |

### 7.4 建議的首輪實驗 [推論]
1. 在營區自採 1–2 週資料，人工標註約 30–50 人（跨日），建立分群與開集基準。
2. 消融：外觀單獨 vs 加身高 vs 加臉 vs 加步態；z-score 和 vs LR 和 vs 小型學習式融合——補上目前 [未知] 的空白。
3. 消融：有/無 cannot-link；有/無轉移時間先驗。
4. 報告：BCubed F、純度、碎裂率、人數誤差、跨日 IDF1、FPIR@FNIR。

---

## 8. 本報告的限制
- 搜尋工具多僅回傳連結，數字只來自我實際讀取的 arxiv 摘要/全文頁；許多論文的結果表（Linkage-GCN、Ada-NETS 的 F 值、AI City 名次、NIST FNIR 等）未讀取，因此標 [未知]。
- 沒有找到「全員同制服」的公開分群/ReID 基準；所有針對該情境的結論皆為 [推論]。

---

## 來源清單（去重）
- https://arxiv.org/abs/1903.11306
- https://arxiv.org/abs/1904.02749
- https://arxiv.org/abs/2004.00445
- https://arxiv.org/abs/2103.13225
- https://arxiv.org/abs/2202.03800
- https://arxiv.org/abs/2103.17272
- https://arxiv.org/abs/1908.03381
- https://arxiv.org/abs/1807.09192
- https://arxiv.org/abs/1904.09658
- https://arxiv.org/abs/2003.09373
- https://arxiv.org/abs/2111.08703
- https://arxiv.org/pdf/2505.04616 （亦 https://arxiv.org/abs/2505.04616）
- https://arxiv.org/abs/2508.05038
- https://arxiv.org/abs/2603.26908
- https://arxiv.org/abs/1812.03282
- https://arxiv.org/abs/1609.01775
- https://arxiv.org/abs/2009.07736
- https://arxiv.org/abs/2304.07500
- https://arxiv.org/abs/2404.09432
- https://arxiv.org/abs/1712.00158
- https://arxiv.org/abs/2508.06357
- https://arxiv.org/pdf/1011.6220
- https://doi.org/10.1016/J.PATCOG.2005.01.012
- https://apps.dtic.mil/sti/pdfs/ADA488585.pdf
- https://www.bmva-archive.org.uk/bmvc/2020/assets/papers/0899.pdf
- https://staff.ie.cuhk.edu.hk/~ccloy/files/ijcv_2010.pdf
- https://pages.nist.gov/frvt/html/frvt1N.html
- https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.8271.pdf
- https://arxiv.org/pdf/2411.06023v1
- https://arxiv.org/html/2508.01587v3
- https://openaccess.thecvf.com/content/CVPR2023W/AICity/html/Nguyen_Multi-Camera_People_Tracking_With_Mixture_of_Realistic_and_Synthetic_Knowledge_CVPRW_2023_paper.html
- https://openaccess.thecvf.com/content/CVPR2024W/AICity/papers/Xie_A_Robust_Online_Multi-Camera_People_Tracking_System_With_Geometric_Consistency_CVPRW_2024_paper.pdf
- https://openaccess.thecvf.com/content/CVPR2024W/AICity/html/Specker_OCMCTrack_Online_Multi-Target_Multi-Camera_Tracking_with_Corrective_Matching_Cascade_CVPRW_2024_paper.html
- https://mlanthology.org/cvprw/2024/cherdchusakulchai2024cvprw-online

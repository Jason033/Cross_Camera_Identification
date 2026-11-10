# B 軌：跨攝影機人員辨識「方法」決策級比較（同制服、高架 CCTV、弱算力）

撰寫日期：2026-11-10。標籤說明：[證實] = 我在論文/README 頁面直接讀到；[推論] = 我依證據做的判斷；[未知] = 查不到或網域受限未能驗證。所有數字附來源網址（見各表「來源」欄與文末清單）。mAP/R1 皆為 %，除特別註明皆為不加 re-ranking。

## 0. 先講結論（給決策者）

1. 沒有任何已發表方法是為「全員同制服 + 高架低解析 + 多日」設計並驗證的 [推論，依本次搜尋未找到此類公開基準]。所有數字都來自一般街景或換衣基準，不能直接外推到營區。
2. 通用 ReID 的最佳現成起點是自監督人體預訓練骨幹（SOLIDER Swin、PersonViT ViT）。MSMT17 上 SOLIDER-Swin-B 為 77.1/90.7（mAP/R1）[證實]，PersonViT ViT-B/16 為 80.8/92.0 [證實]，而您手上的 CLIP-ReID ViT-B/16 為 73.4/88.7 [證實]。
3. 同制服時外觀特徵退化，需要「外觀以外」的線索：時空約束（st-ReID，Market-1501 R1 由 91.2 升到 97.2 [證實]）、步態、體型。這三者比換更大的 ReID 骨幹更值得投資 [推論]。
4. 換衣 ReID 的最佳成績在真實跨日資料上仍很低：MEVID 不同衣著 R1，舊方法皆低於 6%（CAL 3.5）[證實]，HAMoBE 論文表中為 20.1 [證實]。這是「身體/步態線索」能做到的現實上限的粗略參考 [推論]。
5. 授權是此專案的硬風險：KPR 與 BPBreID 使用 Hippocratic License（含 MIL 模組標示）[證實為頁面徽章；條款內容未讀到，屬 [未知]]，OpenGait 聲明僅限學術、不可商用 [證實]，Instruct-ReID 資料限非商業研究 [證實]。軍用部署前必須法務審查 [推論]。

---

## 1. 家族一：通用影像/影片 ReID

### 1.1 比較表

| 方法 (venue) | 核心技術 | 輸入/需求 | 最佳數字 (mAP/R1) | Code / 權重 / 授權 | 規模與環境 | 本專案判定 |
|---|---|---|---|---|---|---|
| BagTricks/BoT R50 (CVPRW 2019) | ResNet50 + 一組訓練技巧（BNNeck、label smoothing、triplet+ID 等）的強基線 | 單張裁切，256x128 | Market1501 85.9/94.5；Duke 76.4/86.4 [證實] | github.com/michuanhaohao/reid-strong-baseline；MIT [證實] | R50 約 25M 參數 [推論，標準 R50] | 您已有；作為回歸基準線必留 |
| AGW (TPAMI 2021) | BoT 上加 non-local attention、可學 GeM 池化、加權正則化 triplet | 同上 | Market 87.8/95.1；Duke 79.6/89.0；MSMT17 49.3/68.3 [證實] | github.com/mangye16/ReID-Survey [證實] | 略大於 R50 [推論] | 無必要，已被 ViT 系取代 |
| OSNet (ICCV 2019) | 全尺度輕量網路，多尺度特徵統一聚合閘門 | 同上 | x1.0：Market 84.9/94.8；MSMT17 52.9/78.7 [證實]；x0.25 Market 77.8/92.2 [證實] | github.com/KaiyangZhou/deep-person-reid（Torchreid）；授權未讀到 [未知] | x1.0 2.2M 參數、978.9M mult-adds；x0.25 0.2M、82.3M [證實] | 邊緣端（若要在攝影機旁抽特徵）的唯一認真選項 |
| PCB / MGN | 水平條帶分割做局部特徵 / 多分支多粒度 | 同上 | LUPerson 預訓練的 MGN-R50：MSMT17 65.7/85.5，Market 91.0/96.4 [證實，來源為 LUPerson 論文] | Torchreid 含 PCB（HACNN、MLFN、PCB 等）[證實]；MGN 官方碼未查 [未知] | R50 級 | 舊但穩；同制服時局部條帶（鞋、頭、背包位置）可能有用 [推論] |
| TransReID (ICCV 2021) | ViT 加 JPM（拼塊重排的局部分支）與 SIE（相機/視角嵌入） | 需相機 ID 做 SIE | MSMT17 67.8/85.3；Market 89.0/95.1；Occ-Duke 59.5/67.4（重整後官方碼）[證實] | github.com/damo-cv/TransReID；MIT；權重在 Google Drive [證實] | torch 1.6 [證實]；ViT-B 約 86M [推論] | 概念值得借用（SIE 對跨相機有益），模型已被超越 |
| CLIP-ReID (AAAI 2023) | 兩階段：階段一凍結 CLIP 圖文編碼器，只學每個 ID 的可學文字 token 做圖文對比；階段二固定 ID 文字特徵，微調圖像編碼器，用 ID loss、triplet、圖→文交叉熵 [證實] | 單張；需 ID 標籤 | R50：MSMT17 63.0/84.4；ViT-B/16：MSMT17 73.4/88.7、Market 89.6/95.5、Occ-Duke 59.5/67.1 [證實]。加 SIE+OLP 再 re-ranking 的 MSMT17 為 86.7/91.1，不可與其他列比 [證實] | github.com/syliz517/CLIP-ReID；MIT；有 5 種配置權重 [證實] | Python 3.8 / torch 1.8 [證實]；ViT-B/16 | 您已有。作為「穩健但非最強」的第二骨幹 |
| LUPerson 預訓練 (CVPR 2021) | 在 4,180,243 張無標籤行人圖上做自監督（MoCoV2）預訓練；結論是領域匹配的預訓練優於 ImageNet [證實] | — | 見上列 MGN 數字 | github.com/DengpanFu/LUPerson [證實]；授權 [未知] | — | 是後續 SOLIDER/PersonViT/HAP 的資料基礎；資料本身為網路行人影像，授權/倫理需自查 [推論] |
| SOLIDER (CVPR 2023) | 以 DINO 式自蒸餾加人體語意偽標籤（由先驗得來），並加「語意控制器」，用一個數值調整語意與外觀的比重；ReID 設小 λ（0.0–0.2）偏重外觀 [證實] | Swin-T/S/B；單張 | Swin-T：MSMT 67.4/85.9、Market 91.6/96.1；Swin-S：76.9/90.8、93.3/96.6；Swin-B：77.1/90.7、93.9/96.9 [證實]。加 re-ranking 後 Swin-B MSMT 86.5/91.7 [證實] | github.com/tinyvision/SOLIDER-REID；MIT；權重在 Google Drive；需 convert_model.py [證實] | 官方環境 py3.7/torch 1.7.1 [證實]；預訓練用 8 張 V100 [證實]；參數量 [未知] | 首選骨幹（見 §10） |
| PersonViT (arXiv 2024) | 遮罩影像建模（MIM）加判別式對比學習，預訓練於 LUPerson 後微調 [證實] | ViT-S/16、ViT-B/16 | ViT-S/16（小批次預訓練，4×RTX3090）：MSMT 70.9/87.3；ViT-S/16 大批次：74.3/89.2；ViT-B/16 大批次：80.8/92.0；Market 95.0/97.6；Occ-Duke 72.2/79.8 [證實] | github.com/hustvl/PersonViT；Apache-2.0；HF 有 ViT-S/B 權重 [證實] | 大批次預訓練用 64×A100 [證實]；環境 [未知] | 首選骨幹之一；ViT-S 版本對弱算力友善 [推論] |
| HAP (NeurIPS 2023) | 以姿態關鍵點導出的身體部位引導遮罩，並對齊兩個遮罩視角的 CLS 表徵 [證實] | ViT-B | MSMT 76.4 mAP、Market 91.7 mAP（256x128）[證實]；未報 R1 | github.com/junkunyuan/HAP [證實] | LUPerson 約 2.1M 子集 [證實] | 數字略低於 SOLIDER/PersonViT，備選 |
| UniHCP (CVPR 2023) | 單一 ViT-B 編碼器統一多種以人為中心任務（ReID、姿態、解析等）[證實] | — | ReID 直接評估：Market 80.7、MSMT 55.2 mAP；微調後 90.3 與 67.3 [證實] | github.com/OpenGVLab/UniHCP [證實]；授權 [未知] | 109.1M 參數；預訓練用 88 張 V100 約 120 小時 [證實] | 偏重，ReID 數字不優；不建議 |
| PLIP (NeurIPS 2024) | 三個預訓練任務：文字引導上色、圖像引導屬性預測、以 ID 為單位的圖文對比；資料集 SYNTH-PEDES 4,791,711 張圖 [證實] | R50/R101/R152/Swin-B | 在無監督 ReID 管線下，PLIP 初始化對 CLIP 初始化：以 ISE 跑 MSMT 46.4/74.9 對 14.9/35.2 [證實] | 本次查無 code 連結 [未知] | — | 重要訊號：好的預訓練對無監督適應影響極大；但沒碼，只作參考 |
| Instruct-ReID (CVPR 2024) | 單一 ViT-B（以 PASS 預訓練起始）加 ALBEF 指令編碼器，用零初始化的「編輯 Transformer」讓指令修改圖像 token，並以指令相似度設自適應 triplet 邊界 [證實] | 影像加文字指令 | 多任務版：Market 93.5/96.5、MSMT 72.4/86.9、LTCC 52.0/75.8、PRCC 52.3/54.2 [證實]（LTCC/PRCC 的評估設定未讀到，[未知]） | github.com/hwz-zju/Instruct-ReID [證實]；資料協議限非商業研究 [證實] | 參數量 [未知] | 授權限制，不建議用作生產骨幹 |

來源：BoT https://github.com/michuanhaohao/reid-strong-baseline ；AGW https://arxiv.org/pdf/2001.04193 ；OSNet https://arxiv.org/pdf/1905.00953 ；TransReID https://github.com/damo-cv/TransReID ；CLIP-ReID https://arxiv.org/pdf/2211.13977 、https://github.com/syliz517/CLIP-ReID ；LUPerson https://arxiv.org/pdf/2012.03753 ；SOLIDER https://github.com/tinyvision/SOLIDER-REID 、https://arxiv.org/pdf/2303.17602 ；PersonViT https://arxiv.org/pdf/2408.05398 、https://github.com/hustvl/PersonViT ；HAP https://arxiv.org/pdf/2310.20695 ；UniHCP https://arxiv.org/pdf/2303.02936 ；PLIP https://arxiv.org/html/2305.08386v2 ；Instruct-ReID https://arxiv.org/html/2306.07520v5 。

### 1.2 影片 ReID（tracklet 層級）

| 方法 | 核心 | 數字 (MARS 等) | Code | 判定 |
|---|---|---|---|---|
| AP3D (ECCV 2020) | 在 3D 卷積前加外觀保留模組：以語意相似度對齊相鄰幀特徵圖，再以對比注意力遮罩抑制不匹配區域，只用 ID 監督 [證實] | MARS 85.1/90.1；DukeMTMC-VideoReID 95.6/96.3；iLIDS-VID R1 86.7 [證實]。AP-P3D-C 24.24M 參數、16.90 GFLOPs [證實] | github.com/guxinqian/AP3D [證實] | 時間聚合的經典做法；在 MEVID 上表現不如 CAL [證實] |
| PSTA (ICCV 2021) | 金字塔時空注意力聚合 | MARS 85.8/91.5；iLIDS-VID R1 91.5（引自 TF-CLIP 論文表）[證實] | code 連結本次未取得 [未知] | 備選 |
| TF-CLIP (AAAI 2024) | 單階段、無文字的 CLIP：用「身分序列特徵」(CLIP-Memory) 取代文字，並以序列提示與時間記憶擴散模組處理時序 [證實] | MARS 89.4/93.0；LS-VID 83.8/90.4 [證實]（mAP/R1） | github.com/AsuradaYuci/TF-CLIP [證實] | 您已用 CLIP 生態，最順手的影片版本；但需 CLIP ViT 計算量 [推論] |

重點 [推論]：您的資料本質是追蹤得到的 tracklet，因此「逐幀特徵取平均/加權」已是堅實的第一版；影片 ReID 模型在 MARS 這種短 tracklet、清晰畫面上的優勢，在高架低解析下是否保留屬 [未知]。

來源：https://arxiv.org/pdf/2007.08434 、https://arxiv.org/pdf/2312.09627 、https://arxiv.org/pdf/2211.04656 。

### 1.3 「今天最佳現成起點」答案

在不需換衣能力的前提下：PersonViT ViT-B/16 或 SOLIDER Swin-B 的有標籤微調（MSMT17 mAP 分別 80.8 與 77.1）[證實]。弱算力下取 PersonViT ViT-S/16（74.3）或 SOLIDER Swin-S（76.9）[證實]。CLIP-ReID 保留作對照 [推論]。

---

## 2. 家族二：換衣 / 衣著不變 ReID

| 方法 (venue) | 核心 | 數字 (R1/mAP) | Code | 判定 |
|---|---|---|---|---|
| PRCC 輪廓草圖 (TPAMI 2020, arXiv 2002.02295) | 以 HED 邊緣輪廓草圖取代 RGB，加可學的空間極座標變換 (SPT) 與角度特定抽取器 (ASE)，多流多粒度 [證實] | PRCC 跨衣 R1 34.38；同衣 R1 64.20（低於 PCB RGB 的 86.88）[證實] | 論文未說明釋出 code [證實] | 歷史意義；同衣情境反而掉點，不適用 |
| CAL (CVPR 2022) | 衣著對抗損失：懲罰「特徵能預測衣著」，只用 RGB，ResNet-50 [證實] | LTCC 一般 74.2/40.8、換衣 40.1/18.0；PRCC 換衣 55.2/55.8；VC-Clothes 換衣 81.4/81.7 [證實] | github.com/guxinqian/Simple-CCReID；Apache-2.0；權重 [未知] | 官方 code 最易取得、授權最乾淨的換衣基線；torch 1.6 環境 [證實] |
| AIM (CVPR 2023, 因果去偏) | 以因果觀點去除衣著偏差 | PRCC 換衣 57.9/58.3；LTCC 一般 76.3/41.1、換衣 40.6/19.1（引自 CCAF 論文表）[證實] | 未查 [未知] | 數字僅小幅勝 CAL |
| 3DInvarReID (ICCV 2023) | 用雙層隱式模型（裸體與衣著兩層加紋理場）、神經混合蒙皮與可微渲染，以自監督方式解耦身分與姿態/衣著形狀/紋理；推論不需 3D 重建 [證實] | LTCC 換衣 37.8/16.7；PRCC 52.5/51.6（R1/mAP）；CCVID 換衣 70.2/65.4；與 CAL 融合後 CCVID 84.3/81.3 [證實] | cvlab.cse.msu.edu/project-reid3dinvar.html [證實] | 單用不如 CAL，融合有加成；訓練複雜 |
| CLIP3DReID (CVPR 2024) | 以凍結 CLIP 為老師，將 ResNet-50 學生蒸餾成體型特徵（CLIP 給體型文字描述、最優傳輸對齊局部特徵、SMPL 合成網格正則化）；推論只用 R50 [證實] | LTCC 42.1/21.7；PRCC 60.6/59.3；CCVID 84.5/83.9 [證實] | 論文稱有 code 但無網址 [未知] | 概念最貼近「體型而非衣著」，且推論輕量；是 FarSight 的體型模組 [證實] |
| CCAF (CLIP 驅動衣著無關, arXiv 2406.09198) | CLIP ViT-B/16：用人體解析遮蔽衣著像素產生提示（IFP），並學一個衣著特徵投影後以相異損失推開（CFM）；推論無額外成本 [證實] | PRCC 換衣 70.4/63.7；LTCC 換衣 42.9/20.1；VC-Clothes 換衣 88.6/87.2 [證實] | 論文未給 code [證實] | 數字最高但無碼，且需 SCHP 解析 |
| HAMoBE (ICCV 2025) | 見 §6 | CCVID 換衣 87.6/85.8；MEVID 換衣 20.1/15.1 [證實] | 論文提到專案連結但本次未取得網址 [未知] | 見 §6 |

關鍵事實：
- MEVID（158 人、598 套衣著、33 個攝影機視角、73 天內 9 個日期）是最接近「多日跨攝影機」的公開基準 [證實]。舊方法在其「不同衣著」設定下 R1 皆低於 6%（CAL 3.5、AGRL 4.9、PSTA 5.6、AP3D 1.8）[證實]；作者建議需要姿態、輪廓、步態、臉與 3D 形狀等多模態線索 [證實]。
- CCVID 上的高分（約 84–88 R1）不宜樂觀外推 [推論]：它是影片且（據我所知）人臉較清楚，我未在本次頁面中驗證，屬 [未知]。

對本專案的直接意義 [推論]：換衣方法的訓練目標是「在衣著不同時仍認得人」，而營區的難題是「衣著相同時要分得開人」。兩者都要求特徵不依賴衣著，所以表徵方向相近（體型、頭髮、步態、臉），但「衣著對抗損失」在全員同服時沒有可對抗的衣著變異，效益存疑。較有價值的是體型取向（CLIP3DReID、3DInvarReID）與多模態融合。

來源：https://arxiv.org/pdf/2002.02295 、https://github.com/guxinqian/Simple-CCReID 、https://arxiv.org/pdf/2204.06890 、https://arxiv.org/pdf/2406.09198 、https://arxiv.org/pdf/2308.10658 、https://openaccess.thecvf.com/content/CVPR2024/papers/Liu_Distilling_CLIP_with_Dual_Guidance_for_Learning_Discriminative_Human_Body_CVPR_2024_paper.pdf 、https://arxiv.org/pdf/2211.04656 。

---

## 3. 家族三：細粒度 / 同制服 / 工人 PPE

[證實] FGPR 的書目：Yin、Wu、Zheng，Fine-Grained Person Re-identification，IJCV 2020（dblp 與 Springer 目錄可見）。[未知] 其資料集規模、方法細節、成績與是否有 code：Springer 不在允許網域內，我未能讀取，搜尋結果也未提供摘要，因此不報任何數字。請工程師自行取得全文確認。

本次所得相關事實：
- 工地 PPE 加工人 ReID：搜尋僅找到以工人 ReID 搭配 PPE 分類的安全監控論文與專利頁（如 CityU 學者頁、Automation in Construction 相關），未取得可驗證的方法細節或數字 [未知]。這類文獻多半是靠「安全帽/背心顏色加衣著」區分人，與全員同服的前提衝突 [推論]。
- 沒有找到以「完全相同制服」為設定的公開資料集 [推論，基於搜尋未見]。

結論：此家族實質上是空白（見 §12 缺口）。

來源：https://dblp.org/rec/journals/ijcv/YinWZ20.html 、https://scholars.cityu.edu.hk/en/publications/vision-based-monitoring-of-site-safety-compliance-based-on-worker/ 。

---

## 4. 家族四：遮擋與局部（部位）方法

| 方法 | 核心 | 數字 (R1/mAP) | Code / 授權 | 判定 |
|---|---|---|---|---|
| BPBreID (WACV 2023) | 以偽人體解析標籤訓練 K 個注意力分支，把特徵圖池化為 K 個部位嵌入並估計可見度；測試不需解析標籤，只比較雙方都可見的部位，取平均距離 [證實] | HRNet-W32：Occ-Duke 75.1/62.5；Occluded-ReID 82.9/75.2；Market 95.7/89.4；P-DukeMTMC 93.0/83.2 [證實] | github.com/VlSomers/bpbreid；Hippocratic License HL3-LAW-MEDIA-MIL-SOC-SV 徽章；權重在 Google Drive（HRNet-W32）；Python 3.10 [證實] | 性能好；但訓練需解析標籤（PifPaf、Mask R-CNN 產生）；授權需審查 |
| KPR (ECCV 2024) | Swin 為骨幹，輸入影像加可選關鍵點提示（正/負），輸出分部位特徵與可見度分數；處理「單一框內有多人」歧義 [證實]。另提出 OccludedPoseTrack-ReID [證實] | KPR(SOLIDER Swin)：Occ-Duke 84.3/75.1；Occluded-ReID 84.8/82.6；Market 96.6/93.2 [證實]。論文稱在 Occluded-Duke 相對先前最佳 mAP 高 12.6、R1 高 9.2 [證實] | github.com/VlSomers/keypoint_promptable_reidentification；同為 Hippocratic License 徽章；torch 1.13、py3.10 [證實] | 營區出入口人群遮擋嚴重時才需要；授權與算力雙重風險 |

[推論]：營區 CCTV 高架視角會造成上半身為主的可見部位，且多人重疊，部位可見度加權是合理設計；但高架俯視下的關鍵點估計品質是未驗證前提 [未知]。

來源：https://arxiv.org/pdf/2211.03679 、https://github.com/VlSomers/bpbreid 、https://arxiv.org/pdf/2407.18112 、https://github.com/VlSomers/keypoint_promptable_reidentification 。

---

## 5. 家族五：步態

### 5.1 比較表（Gait3D 與 GREW，數字為 R1，另列 mAP 如有）

| 方法 (venue) | 輸入 | Gait3D R1 (mAP) | GREW R1 | 備註 |
|---|---|---|---|---|
| GaitSet (AAAI 2019) | 剪影 64x44 | 36.7 | 48.4 | 早期集合式 [證實] |
| GaitPart (CVPR 2020) | 剪影 | 28.2 | 47.6 | [證實] |
| GaitGL (ICCV 2021) | 剪影 | 29.7 | 41.5（加 BNNeck 51.7）| [證實] |
| GaitBase (CVPR 2023, OpenGait) | 剪影 | 64.6 | 60.1 | 簡單強基線，被稱作 DeepGaitV1 [證實] |
| DeepGaitV2-P3D | 剪影 | 74.4 (65.8) | 77.7 | 11.1M 參數、2.9 GFLOPs [證實] |
| DeepGaitV2-3D | 剪影 | 72.8 (63.9) | 79.4 | 27.5M 參數、6.8 GFLOPs [證實] |
| DeepGaitV2-2D | 剪影 | 68.2 (60.4) | 68.6 | 9.3M 參數、2.4 GFLOPs [證實] |
| SwinGait | 剪影 | 75.0 | 79.3 | Transformer 版 [證實] |
| SkeletonGait++ (AAAI 2024) | 剪影加骨架圖 | 77.6 (70.3；mINP 42.6) | 85.8 | 目前表中最高 [證實] |
| SkeletonGait (單用骨架圖) | 骨架圖 | 38.1 (28.9) | 77.4 | Gait3D 明顯落後 [證實] |
| GPGait (ICCV 2023) | 骨架座標 | 22.5 | 53.6 | 強項是跨域泛化而非域內 [證實] |
| BigGait (CVPR 2024) | DINOv2 特徵（無需分割/姿態）| 本次未取得 | 本次未取得 | 只在 CCPG 取得數字：BigGait-S 平均 R1 83.1；GaitBase 75.5；DeepGaitV2 83.3 [證實] |

方法細節：
- SkeletonGait：把關節座標渲染成 2 通道圖（關節高斯熱圖加肢體高斯圖），中心與尺度正規化，沒有體型與外觀；以 DeepGaitV2 骨幹，僅改第一層輸入通道。SkeletonGait++ 是剪影與骨架的雙分支，逐幀注意力融合 [證實]。
- GPGait：人體導向變換（HOT）校正傾斜骨架、統一高度、對齊頸部；加骨骼與角度描述子（HOD）和部位感知圖卷積（PAGCN）。論文報告 GREW→CASIA-B 跨域超過次佳 34.69 個點 [證實]。
- BigGait：凍結 DINOv2（ViT-S/14 約 21M、ViT-L/14 約 300M 參數）加一個三分支「步態表徵抽取器」（遮罩、外觀、去噪），再接改良版 GaitBase。跨域：CCPG 訓練、SUSTech1K 測，整體 R1 64.7，對比 GaitBase 的 16.8 [證實]。

資料集事實：Gait3D 為 4,000 人、25,000 多段序列、39 台攝影機、不受約束室內場景，提供 SMPL 資訊 [證實]。DeepGaitV2 作者發現：深層模型在真實資料（Gait3D、GREW）才有明顯優勢，在受約束的 CASIA-B/OU-MVLP 反而過擬合；也強調保留時序建模（打亂幀序會明顯掉點）[證實]。

Code/授權：OpenGait 支援 GaitBase、DeepGaitV2、SkeletonGait++、BigGait、BiggerGait 等；權重在 Hugging Face（huggingface.co/opengait/OpenGait）；README 聲明程式碼僅供學術用途，不可有商業使用 [證實]。GPGait 官方倉庫連結未取得，作者說將併入 FastPoseGait（github.com/BNU-IVC/FastPoseGait）[證實]。

本專案判定 [推論]：
- 步態是「同制服時最有原理性的輔助線索」，因為它不依賴衣著。但表中數字出自 Gait3D（室內、39 台相機、4,000 人）和 GREW（戶外大規模），而營區是高架、可能低解析、人與人遮擋；剪影品質與最短有效序列長度都是 [未知]。
- 剪影 64x44 的輸入要求意味著需要分割（例如 YOLOv7 實例分割或另一分割模型）；SkeletonGait++ 還需姿態估計。弱伺服器上要同時跑偵測、分割、姿態、ReID，算力預算需實測 [推論]。
- 建議用 DeepGaitV2-P3D（11.1M、2.9 GFLOPs）作為第一個步態模組 [推論]，僅作 tracklet 層級的分數融合，不單獨決定身分。
- 授權限制使其在軍用情境需法務確認，或改為自行重新實作訓練流程 [推論]。

來源：https://github.com/ShiqiYu/OpenGait 、https://github.com/ShiqiYu/OpenGait/blob/master/docs/1.model_zoo.md 、https://arxiv.org/html/2303.03301v3 、https://arxiv.org/html/2311.13444v2 、https://arxiv.org/abs/2303.05234 、https://arxiv.org/html/2402.19122v1 、https://arxiv.org/abs/2204.02569 。

---

## 6. 家族六：影片多生物特徵與融合

| 方法 | 核心 | 數字 | Code | 判定 |
|---|---|---|---|---|
| HAMoBE (ICCV 2025) | 凍結 CLIP ViT-L/14，串接四層特徵；第一層 8 個 MLP 專家經閘門合成 3 路輸入；第二層三個專家分別對應長期（體型）、短期（外觀）、時序（步態，MLP 加 4 層 Transformer 解碼器與可學查詢）；雙輸入閘門讓查詢與圖庫特徵互相調整權重；T=16 幀 [證實] | MARS 91.1/94.6；LS-VID 85.2/92.1；CCVID 同衣 87.2/88.4、換衣 85.8/87.6；MEVID 同衣 54.3/74.0、換衣 15.1/20.1（mAP/R1）[證實] | 論文提到專案連結但本次無網址 [未知]；參數量未報 [證實] | 真實跨日基準 MEVID 換衣 R1 僅 20.1，足見「換衣+跨日」尚未解決；ViT-L 骨幹對弱伺服器偏重 [推論]。另：我擷取的表格與其文字敘述對 MEVID 基線有不一致處，引用時請對照原文 [證實存在不一致] |
| SapiensID (CVPR 2025) | ViT-Base，加 Retina Patch（動態分配補丁給全圖、上半身、臉三個興趣區，各 12x12 網格）、遮罩識別模型（訓練約加速 9 倍）與語意注意力頭（以關鍵點周圍池化）；以 AdaFace 損失、384x384 輸入；訓練資料 WebBody4M 約 4.9M 圖、263,920 人，來自網路名人搜尋 [證實] | 遮擋 ReID 87.30/75.57（R1/mAP），對比 KPR+SOLIDER 的 84.80/82.60；人臉平均 97.31 vs AdaFace 97.63；短期身體 ReID 平均 top-1 73.05 [證實，但其文字與表格有不一致，請核對] | github.com/mk-minchul/sapiensid；權重與授權本次未取得 [未知] | 「臉+體」統一模型的唯一可用候選，但模糊小臉的表現、授權、訓練資料來自名人網路影像，需評估 [推論] |
| FarSight（系統, 2023–2025）/ BRIAR 系統 | 偵測（BPJDet 加 YOLOv8 驗證）、追蹤（PSR-ByteTrack）、影像復原（GRTM）、臉（KP-RPE）、步態（BigGait）、體型（CLIP3DReID）；用品質估計器加「品質導引混合專家」(QME) 做分數融合；訓練含非配對受試者與開集損失 [證實] | 相對初版系統：1:1 驗證 TAR@0.1% FAR 絕對提升 34.1，封閉集 Rank-20 提升 17.8，開集 FNIR@1% FPIR 降低 34.3；本次未取得絕對值 [證實，僅摘要] | 是否釋出 [未知] | 架構藍圖（偵測→追蹤→復原→各模態→品質加權融合）值得照抄，但原系統面向遠距高解析臉/步態 [推論] |

重點 [推論]：
- 「品質加權的多模態分數融合」是對本專案最可移植的設計。營區可用：外觀 ReID、步態、體型、時空先驗、（可用時）人臉，各給品質分數再融合。
- 沒有發現可直接下載、含全部模態的端到端開源系統 [未知]。

來源：https://arxiv.org/html/2508.05038v2 、https://arxiv.org/html/2504.04708v1 、https://arxiv.org/html/2505.04616v1 。

---

## 7. 家族七：無監督 / 域適應 ReID（可用於營區無標籤影片）

| 方法 (venue) | 核心 | 數字 (mAP/R1) | Code / 授權 | 判定 |
|---|---|---|---|---|
| SpCL (NeurIPS 2020) | 自步對比學習：把有標籤來源、無標籤目標的樣本同時放進實例記憶，以聚類加離群值的混合記憶 [推論，依其名稱與工具箱說明；細節未於本次頁面確認] | 無來源標籤：Market 73.1/88.1；MSMT17 19.1/42.3。UDA：Market→MSMT17 26.8/53.7；MSMT17→Market 77.5/89.7 [證實] | github.com/yxgeee/SpCL；授權未讀到 [未知]；OpenUnReID 為 Apache-2.0 [證實] | 歷史基準 |
| Cluster Contrast (arXiv 2021) | 每個偽身分只存一個特徵（叢集層級記憶），以 ClusterNCE 對比，並以動量更新 [證實] | ImageNet 預訓練：Market 83.0/92.9；MSMT 33.0/62.0。SwAV 預訓練：84.8/93.5；38.2/67.5 [證實] | github.com/alibaba/cluster-contrast-reid；MIT；py≥3.5、torch≥1.6 [證實] | 最易上手的基線，且與您的 torch 1.11 相容 [推論] |
| ISE (CVPR 2022) | 在嵌入空間生成「支援樣本」：自樣本往最近叢集中心內插，強度隨訓練增加，並以保標籤損失約束；目的是減少「子叢集」與「混合叢集」[證實] | 無監督：Market 84.7/94.0；MSMT 35.0/64.7；GeM：85.3/94.3 與 37.0/67.6 [證實] | arXiv 擷取的 code 網址不可信；搜尋結果出現鏡像 github.hscsec.cn/zhangxinyu-xyz/ISE-ReID，推測官方為 github.com/zhangxinyu-xyz/ISE-ReID [推論] | 針對「叢集混合」問題設計，與全員同服的失敗模式相關 [推論] |
| PPLR (CVPR 2022) | 以部位特徵加全域特徵互相校正偽標籤：用兩個特徵空間 kNN 集合的 Jaccard 相似度作為跨一致性分數，再做一致性感知標籤平滑與部位引導標籤精煉 [證實] | 無標籤：Market 81.5/92.8；MSMT 31.4/61.1。使用相機標籤：Market 84.4/94.3；MSMT 42.2/73.3 [證實] | github.com/yoonkicho/PPLR [證實] | 可用相機 ID，營區有相機 ID 可用 |
| CALR (arXiv 2024) | 以每台相機內聚類產生的局部偽標籤精煉跨相機叢集，並加對抗式相機對齊 [證實] | 使用相機標籤：MSMT 44.2/73.0；IBN 加 GeM 版 Market 84.5/93.6、MSMT 50.4/78.1 [證實] | github.com/leeBooMla/CALR [證實]；發表場合 [未知] | 本次找到的最高無監督 MSMT17 數字；但為預印本 |
| PLIP 初始化 | 見 §1 | PPLR/ISE 搭配 PLIP：MSMT 46.1/73.4 與 46.4/74.9 [證實] | 無 code | 說明預訓練品質是最大槓桿 |

「差距」數據：
- MSMT17 有監督上限：SOLIDER-Swin-B 77.1/90.7、PersonViT ViT-B 80.8/92.0 [證實]。
- 最佳無監督（有相機標籤，R50）：CALR 50.4/78.1 [證實]。MSMT17 上差距約 27–30 mAP。
- Market→MSMT17 UDA（SpCL）：26.8/53.7，與有監督差距約 50 mAP [證實；是由兩處不同來源之數字相減，僅供量級參考]。
- 所以「無標籤營區影片 + 同服」若期待接近有監督成績並不現實 [推論]。

營區專屬風險 [推論]：偽標籤聚類依賴外觀可分性。全員同服會使不同人混入同一叢集（混合叢集）且跨相機相同衣著被當同人。建議：以少量有標籤的註冊樣本（登錄人員）做半監督微調，再用聚類處理其餘；並以 tracklet 與相機 ID 的 cannot-link 約束（同一幀內同時出現的兩人必不同人）限制合併 [推論]。

來源：https://arxiv.org/pdf/2006.02713 、https://github.com/yxgeee/SpCL 、https://github.com/yxgeee/OpenUnReID 、https://arxiv.org/pdf/2103.11568 、https://github.com/alibaba/cluster-contrast-reid 、https://arxiv.org/pdf/2204.06892 、https://arxiv.org/pdf/2203.14675 、https://arxiv.org/html/2403.16450v3 。

---

## 8. 家族八：終身 / 持續 ReID

| 方法 | 核心 | 數字 | Code | 判定 |
|---|---|---|---|---|
| PTKP (AAAI 2023, 引自 KRKC 論文) | 把舊任務當來源領域，由靜態老師保存知識 [證實，依 KRKC 論文描述] | 在 KRKC 協議（VIPeR→Market→CUHK-SYSU→MSMT17）下，已見領域平均 R1 65.1、mAP 56.7 [證實] | 未取得 [未知] | 基準 |
| KRKC (TPAMI 2023) | 知識演練（新資料加範例）、知識更新（動態記憶模型以較小學習率慢更新，成為更好的老師）、雙空間整併（參數混合加特徵串接）[證實] | 已見領域平均 R1 77.0、mAP 68.2；未見領域 mAP：CUHK01 79.2、CUHK02 69.8、CUHK03 39.5、PRID 52.7 [證實] | github.com/cly234/LReID-KRKC [證實] | 需保存範例（隱私/儲存） |
| DSKC (arXiv 2025) | 無範例、無蒸餾：每個領域一個風格轉換模組（舊的凍結）、統一知識學習與關聯、共變異數式分佈匹配；ViT-S/16 以 LUPerson 預訓練初始化 [證實] | 順序 1（Market→CUHK-SYSU→Duke→MSMT17_V2→CUHK03）：已見平均 64.1/74.5、未見平均 64.7/61.3，對 KRKC 50.1/62.5 與 52.7/50.8（mAP/R1）[證實] | github.com/LiuShiBen/DKUA（倉庫名與論文名不同）[證實] | 概念上最契合「不留舊影像」的軍用隱私需求，但為預印本且基準是公開資料集 [推論] |

注意 [證實]：KRKC 與 DSKC 的基準協議與資料集順序不同，數字不可互比（KRKC 論文用 VIPeR/Market/CUHK-SYSU/MSMT17 的順序，DSKC 用另一組）。

本專案判定 [推論]：LReID 假設是「新領域依序到來」，而營區是「同一批人、同一組相機、隨時間漂移」，且最關鍵是身分資料庫的管理而不是遺忘。實務上更像「定期以重放偽標籤資料加註冊樣本重訓」，LReID 方法目前只具研究參考價值。

來源：https://arxiv.org/pdf/2211.16201 、https://arxiv.org/pdf/2508.03516 。

---

## 9. 家族九：時空 ReID

st-ReID（AAAI 2019，arXiv 1812.03282）[證實]：
- 兩路：視覺流用 PCB 部位式 CNN、餘弦相似度；時空流用 Histogram-Parzen 高斯平滑，估計「特定相機對、特定時間差」下同人出現的機率。以「邏輯平滑」的聯合度量相結合，使極低的時空機率不會直接否決真匹配。
- 需求：每張影像要有相機 ID 與時間戳（幀號）。論文稱此元資料在監控中常見且可免標註取得。
- 數字（R1/mAP）：Market-1501 PCB 91.2/75.8 → st-ReID 97.2/86.7（加隨機擦除 98.1/87.6）；DukeMTMC-reID 83.8/69.4 → 94.0/82.8（加隨機擦除 94.4/83.9）[證實]。

本專案判定 [推論，最高優先]：
- 營區相機拓樸固定，時空先驗最容易學、最不依賴外觀，正好補同制服時的外觀失效。
- 風險：Market/Duke 的時空增益部分來自資料集本身的時間結構（相機同步、人流稀疏），營區人流密度與路徑限制不同，增益幅度 [未知]。
- 也要注意跨日：同日內時空約束強，跨日時時間差過大，時空先驗只剩「作息規律」（例如同一人通常在某時段出現在某區域）這類弱先驗 [推論]。

來源：https://arxiv.org/pdf/1812.03282v1 。

---

## 10. (a) 建議起步堆疊（排序與理由）

說明：以下排序是 [推論]，依據是前文的證據加對營區條件的判斷。

| 排名 | 層 | 選擇 | 理由 | 授權/環境 |
|---|---|---|---|---|
| 1 | 資料與流程 | YOLOv7 偵測 → 追蹤 → tracklet 層級特徵聚合；在相機拓樸上套 st-ReID 式時空機率 | 時空線索不依賴衣著；st-ReID 在公開基準上 R1 提升 6 到 10 個點 [證實]；成本近乎零 | 自行實作，無授權問題 |
| 2 | 外觀骨幹 | PersonViT ViT-S/16（輕量）或 SOLIDER Swin-S（含 ViT-B / Swin-B 作高配）；以營區註冊樣本微調；CLIP-ReID 作對照 | MSMT17 現成最強、授權寬鬆（MIT 與 Apache-2.0）[證實]；預訓練用 LUPerson 自監督，可直接遷移 | SOLIDER-REID 官方環境為 torch 1.7.1，PersonViT 環境未列 [證實/未知]；您的 torch 1.11 預期可跑，但需實測 [推論] |
| 3 | 當日聚類與匿名 ID | Cluster Contrast 或 PPLR（用相機 ID），以 SOLIDER/PersonViT 權重初始化；加 cannot-link（同幀兩人）約束 | 授權乾淨（MIT）、環境相容 [證實]；PLIP 的結果顯示預訓練對無監督結果影響極大 [證實] | 同制服下混合叢集風險高，需以註冊樣本監督 [推論] |
| 4 | 輔助模態：步態 | OpenGait DeepGaitV2-P3D（11.1M、2.9 GFLOPs），作 tracklet 層級分數融合；日後試 SkeletonGait++ | 不依賴衣著；真實資料 Gait3D 74.4、GREW 77.7 [證實] | 學術限定授權（OpenGait）[證實]，需法務或自行重實作 |
| 5 | 輔助模態：體型 | CLIP3DReID 概念（R50 學生，推論輕量）或 CAL 作對照 | LTCC/PRCC/CCVID 換衣數字優於純外觀 [證實]；CAL 授權乾淨 | CLIP3DReID code 網址 [未知]；CAL Apache-2.0 [證實] |
| 6 | 遮擋 | KPR / BPBreID | Occ-Duke 領先，但需解析標籤與關鍵點，授權有 Hippocratic MIL 標示 [證實]；先以風險評估處理 | 授權待審 |
| 7 | 長期維護 | 定期重訓加偽標籤重放；LReID（KRKC/DSKC）只作研究追蹤 | 見 §8 | — |

多模態融合：參照 FarSight 的「品質估計加加權分數融合」設計 [證實其存在]，各模態輸出經校準後的相似度，以 tracklet 品質（解析度、遮擋、序列長度）加權 [推論]。

---

## 11. (b) 務實 vs 炒作

| 項目 | 務實（可做） | 炒作或有落差（需謹慎） |
|---|---|---|
| 骨幹 | SOLIDER / PersonViT 微調，MSMT17 有明確數字與開源碼 | 公開基準高分不等於同制服下可分：這些基準的人本來衣著不同 [推論] |
| 換衣 | CAL 等級的 R50 方法可部署 | CCVID 換衣 R1 約 85 以上的數字，對照 MEVID 換衣 R1 20.1，顯示跨日真實場景差距極大 [證實數字，解讀為 推論] |
| 無監督 | 在營區資料上以 Cluster Contrast/PPLR 取得可用的當日聚類 | 「無標籤即可逼近有監督」不成立：MSMT17 上差約 27 mAP（有相機標籤）[證實] |
| 步態 | 作輔助模態，Gait3D/GREW 上 R1 約 75–86 | 資料為室內/特定場景；營區高架、低解析下表現 [未知]；多數方法依賴品質良好的剪影 |
| 臉+體統一 | SapiensID 概念可借用 | 模糊小臉的效果 [未知]；訓練資料為網路名人影像，授權與倫理疑慮 |
| 大模型 | 凍結 CLIP/DINOv2 特徵加輕量頭（HAMoBE、BigGait）可離線批次跑（每日影片到站後處理）[推論] | CLIP ViT-L/14 或 DINOv2 ViT-L 在「弱伺服器」上的吞吐量 [未知]；BigGait-L 約 300M 參數 [證實] |
| 終身學習 | 概念吸引人 | 基準與營區情境不吻合；範例保存牽涉隱私 [推論] |

---

## 12. (c) 空白（沒有現成方案）

1. 同制服 ReID 基準與方法：查無公開資料集或專用方法；FGPR 內容未能驗證 [未知]。工程師需自建內部評測集（含註冊人員真值）。
2. 高架俯視、低解析、模糊臉的聯合基準：現有基準（Market/MSMT17/Gait3D 等）視角與解析度皆不同 [推論]。
3. 以「註冊資料庫」為核心的開放集、跨日、匿名叢集一體化系統：FarSight 最接近但釋出情形 [未知]；沒有找到開源整合方案。
4. 持續 ReID 加身分資料庫的生命週期管理（新增、合併、拆分、撤銷註冊）：LReID 文獻不處理。
5. 軍用授權乾淨的完整堆疊：KPR/BPBreID（Hippocratic）、OpenGait（學術）、Instruct-ReID 資料（非商業）皆有限制；MIT/Apache 的有 SOLIDER-REID、CLIP-ReID、TransReID、PersonViT、Cluster Contrast、CAL [證實]。LUPerson 等預訓練資料的授權屬 [未知]。
6. 評估偏差：多數論文只報公開集數字，缺少延遲、記憶體、吞吐量；SOLIDER 參數量、KPR 推論速度皆未報 [證實]。

---

## 13. 建議的下一步驗證實驗（低成本）[推論]

1. 蒐集一週營區影片，人工標約 30–50 位註冊人員的 tracklet，建內部 Rank-1/mAP 與「誤合併率」指標。
2. 以 BoT（已有）、CLIP-ReID（已有）、SOLIDER-Swin-S、PersonViT ViT-S 零樣本 vs 微調，比較。
3. 加上時空先驗，量測增益。
4. 加 DeepGaitV2-P3D，量測融合增益與每 tracklet 的有效幀數門檻。
5. 實測弱伺服器吞吐量，決定模型尺寸。

---

## 文末來源清單（去重）

- https://github.com/michuanhaohao/reid-strong-baseline
- https://arxiv.org/pdf/2001.04193
- https://arxiv.org/pdf/1905.00953
- https://github.com/KaiyangZhou/deep-person-reid
- https://github.com/damo-cv/TransReID
- https://arxiv.org/pdf/2211.13977
- https://github.com/syliz517/CLIP-ReID
- https://arxiv.org/pdf/2012.03753
- https://github.com/tinyvision/SOLIDER-REID
- https://arxiv.org/pdf/2303.17602
- https://arxiv.org/pdf/2408.05398
- https://github.com/hustvl/PersonViT
- https://arxiv.org/pdf/2310.20695
- https://arxiv.org/pdf/2303.02936
- https://arxiv.org/html/2305.08386v2
- https://arxiv.org/html/2306.07520v5
- https://arxiv.org/pdf/2007.08434
- https://arxiv.org/pdf/2312.09627
- https://arxiv.org/pdf/2211.04656
- https://arxiv.org/pdf/2002.02295
- https://github.com/guxinqian/Simple-CCReID
- https://arxiv.org/pdf/2204.06890
- https://arxiv.org/pdf/2406.09198
- https://arxiv.org/pdf/2308.10658
- https://openaccess.thecvf.com/content/CVPR2024/papers/Liu_Distilling_CLIP_with_Dual_Guidance_for_Learning_Discriminative_Human_Body_CVPR_2024_paper.pdf
- https://dblp.org/rec/journals/ijcv/YinWZ20.html
- https://scholars.cityu.edu.hk/en/publications/vision-based-monitoring-of-site-safety-compliance-based-on-worker/
- https://arxiv.org/pdf/2211.03679
- https://github.com/VlSomers/bpbreid
- https://arxiv.org/pdf/2407.18112
- https://github.com/VlSomers/keypoint_promptable_reidentification
- https://github.com/ShiqiYu/OpenGait
- https://github.com/ShiqiYu/OpenGait/blob/master/docs/1.model_zoo.md
- https://arxiv.org/html/2303.03301v3
- https://arxiv.org/html/2311.13444v2
- https://arxiv.org/abs/2303.05234
- https://arxiv.org/html/2402.19122v1
- https://arxiv.org/abs/2204.02569
- https://arxiv.org/html/2508.05038v2
- https://arxiv.org/html/2504.04708v1
- https://arxiv.org/html/2505.04616v1
- https://arxiv.org/pdf/2006.02713
- https://github.com/yxgeee/SpCL
- https://github.com/yxgeee/OpenUnReID
- https://arxiv.org/pdf/2103.11568
- https://github.com/alibaba/cluster-contrast-reid
- https://arxiv.org/pdf/2204.06892
- https://arxiv.org/pdf/2203.14675
- https://arxiv.org/html/2403.16450v3
- https://arxiv.org/pdf/2211.16201
- https://arxiv.org/pdf/2508.03516
- https://arxiv.org/pdf/1812.03282v1
- https://arxiv.org/pdf/2506.13039（綜述，僅用於確認其未提供換衣 SOTA 表）

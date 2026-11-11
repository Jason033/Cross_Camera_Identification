/* ============================================================
   others.js — 第 3 章「別人怎麼做」的內容：常見架構類型、現有系統、比賽與研究。
   每個系統的 flow：[ 步驟名稱, 說明, 對應我們的第幾步（1–7，0 = 我們沒有的步驟）, 動畫場景（可省略，省略時依文字自動選） ]
   cover：對我們七步與兩個難點的涵蓋：g 有、m 部分、b 沒有
   資料來自 2026-11 的網路搜尋；廠商與專利描述屬宣稱，未經獨立驗證。
   ============================================================ */
window.PATTERNS = [
  { id: 'mtmc', n: '追蹤後關聯（多攝影機追蹤）', who: 'NVIDIA 多攝影機追蹤、AI City Challenge、工地工人追蹤',
    flow: [['各攝影機偵測、追蹤', '產生片段', 2], ['片段的外觀特徵', '', 3, 'feat'], ['攝影機校正、時空距離', '', 5], ['跨攝影機分群', '給全域 ID', 6]],
    good: '自動產生每個人的完整軌跡；不需要人員名冊', bad: '多半依賴外觀與攝影機校正；同制服時外觀失效', ours: '我們的主幹（第 1–6 步）' },
  { id: 'search', n: '先建索引、再查詢（鑑識搜尋）', who: 'Avigilon、BriefCam、海康威視',
    flow: [['影片建索引', '人、屬性、外觀特徵', 3], ['使用者給條件或照片', '', 0, 'search'], ['跨攝影機相似度排序', '', 7], ['人工確認', '', 0]],
    good: '成熟、可直接採購；適合事後調查', bad: '不產生全域 ID 與完整路徑；靠衣服顏色等屬性，同制服時幾乎失效', ours: '我們的「事後查詢」用途，但改為查已分好群的人' },
  { id: 'bio', n: '多生物特徵融合辨識', who: 'IARPA BRIAR／FarSight、銀河水滴步態',
    flow: [['偵測與影像還原', '', 1], ['臉、步態、體型各自的特徵', '', 3], ['依品質加權融合', '', 4], ['開放集 1:N 比對', '可回答「不認識」', 7]],
    good: '不靠衣服；能處理遠距、低品質；有開放集設計', bad: '算力重；單段影片辨識，沒有跨攝影機分群', ours: '我們的第 3、4、7 步' },
  { id: 'anchor', n: '檢查點錨定', who: '監獄人員追蹤、門禁防尾隨、制服名牌辨識',
    flow: [['在必經點用強線索確認身分', '臉、名牌、編號、刷卡', 7, 'card'], ['與門禁或名冊比對', '', 7], ['不一致就警示', '', 0]],
    good: '準確度高、技術成熟；正好利用營區的固定出入口', bad: '只在檢查點有效，點與點之間的路徑不知道', ours: '我們第 7 步的「身分錨點」與刷卡一致性檢查' }
];

window.OTHERS = [
  /* ---------------- 完整的多攝影機系統 ---------------- */
  { cat: 'sys', id: 'nvidia', n: 'NVIDIA Metropolis 多攝影機追蹤', who: 'NVIDIA，商用軟體框架', pattern: 'mtmc', rel: 'high',
    goal: '把多台攝影機裡同一個人的片段串成一條全域軌跡，用於零售、倉儲等場域。',
    flow: [['感知', '各攝影機偵測、單攝影機追蹤，並抽出每段「行為」（即片段）的外觀特徵', 2], ['攝影機校正', '用單應性把畫面座標轉到全域座標', 5], ['兩階段階層分群', '結合外觀特徵與時空資訊，把行為分群並給全域 ID', 6], ['共存重新指派', '同一時間出現在同一台攝影機、卻被分到同群的行為，用匈牙利演算法依「外觀距離＋時空距離」重新分配，可反覆數輪', 6], ['抑制重疊、接合狀態', '刪除重疊的行為；把重新初始化的群與既有狀態接合，讓全域 ID 保持穩定', 6], ['長期查詢', '用 Elasticsearch 依 ID 跨長時間查詢', 7]],
    key: '「同一時間在同一畫面的兩人一定不是同一人」被做成重新指派的步驟——這就是我們第 5、6 步的不可能配對規則。',
    borrow: ['共存重新指派的做法可直接借用到第 6 步', '作為對照基準：同一批營區資料跑它與我們的流程'], gap: ['外觀模型不是為同制服訓練的', '需要攝影機校正，與「不知道攝影機配置」的泛用目標衝突', '需要 GPU；授權與費用需確認'],
    cover: { s: ['g', 'g', 'm', 'b', 'g', 'g', 'm'], uni: 'b', cloth: 'b' }, ev: 'proven',
    src: [['MTMC 微服務總覽', 'https://docs.nvidia.com/mms/text/MDX_Multi_Camera_Tracking_MS_Overview.html'], ['元件與客製化', 'https://docs.nvidia.com/mms/text/MDX_Multi_Camera_Tracking_MS_Customization.html']] },
  { cat: 'sys', id: 'aicity', n: 'AI City Challenge 多攝影機人員追蹤', who: 'NVIDIA 等主辦，CVPR／ICCV 研討會比賽（2023–2025）', pattern: 'mtmc', rel: 'high',
    goal: '在多台攝影機的影片中追蹤所有人，給出跨攝影機一致的 ID（2025 年改為 3D 感知）。',
    flow: [['單攝影機偵測與追蹤', '', 2], ['外觀特徵', '每段片段一組 ReID 特徵', 3], ['3D 定位', '2024 年起提供攝影機矩陣，可推算 3D 位置；2025 年冠軍結合 3D 點雲', 5], ['跨攝影機分群', '2023 年冠軍：以「錨點」引導分群，再依時空一致性重新指派 ID', 6], ['評分', 'IDF1；2024 年起改用考慮 3D 距離的 HOTA', 0]],
    key: '前幾名都是「片段 → 外觀 → 時空 → 分群」；2025 年的結論是：能看完整段影片再做全域關聯的離線方法分數最高——和我們夜間批次處理的設計一致。',
    borrow: ['2023 年冠軍的「錨點引導分群＋時空一致性重新指派」可參考到第 6 步（IDF1 95.36）', '「離線全域關聯優於線上」支持夜間批次的設計'], gap: ['資料主要是合成的室內場景，人穿著各異', '攝影機有校正、使用 GPU'],
    cover: { s: ['g', 'g', 'm', 'b', 'g', 'g', 'b'], uni: 'b', cloth: 'b' }, ev: 'proven',
    src: [['2023 年冠軍論文', 'https://arxiv.org/pdf/2304.09471'], ['第 8 屆（2024）總覽', 'https://arxiv.org/html/2404.09432v1'], ['第 9 屆（2025）總覽', 'https://openaccess.thecvf.com/content/ICCV2025W/AICity/papers/Tang_The_9th_AI_City_Challenge_ICCVW_2025_paper.pdf'], ['2025 得獎名單', 'https://www.aicitychallenge.org/2025-challenge-winners/']] },
  { cat: 'sys', id: 'briar', n: 'IARPA BRIAR／FarSight', who: '美國情報高等研究計畫署的研究計畫；FarSight 為密西根州立大學等團隊的系統', pattern: 'bio', rel: 'high',
    goal: '在最遠 1,000 公尺、高俯角（最大約 50°）、大氣擾動下辨識人員身分。',
    flow: [['偵測', '', 1], ['辨識導向的影像還原', '針對大氣擾動與模糊，以辨識效果為目標做還原', 0], ['臉、步態、體型各自編碼', '三種線索各有一個模型', 3], ['品質導引融合', '品質估計器預測各線索權重，再加權合併', 4], ['驗證、封閉集、開放集辨識', '2025 年通過 NIST RTE FIVE 獨立評測', 7]],
    key: '「每段影片先估品質，再決定各線索信幾分」——正是我們第 4 步的品質門控；臉受限時，三線索融合把 TAR@0.1%FAR 從 30.7% 拉到 65.0%。',
    borrow: ['品質導引融合的架構（第 4 步）', '開放集評估方式（第 7 步）'], gap: ['不處理跨攝影機分群', '不針對同制服', '多個大型 GPU 模型'],
    cover: { s: ['g', 'b', 'g', 'g', 'b', 'b', 'g'], uni: 'm', cloth: 'g' }, ev: 'proven',
    src: [['Person Recognition at Altitude and Range（2025）', 'https://arxiv.org/abs/2505.04616'], ['FarSight 初版', 'https://arxiv.deeppaper.ai/papers/2306.17206v2']] },

  /* ---------------- 商用影片搜尋 ---------------- */
  { cat: 'com', id: 'avigilon', n: 'Avigilon Appearance Search', who: 'Motorola Solutions 旗下，商用監控軟體', pattern: 'search', rel: 'mid',
    goal: '在全場域的攝影機中，快速找出某個人或某台車出現過的所有畫面。',
    flow: [['攝影機端分析', '自家攝影機或錄影主機以深度學習抽出外觀特徵', 3], ['建立索引', '', 0], ['查詢', '以文字描述、上傳照片或畫面中的人查詢', 0], ['跨攝影機排序', '依外觀相似度排出結果', 7], ['臉部模組（加購）', '衣服換了仍能認出同一人', 3]],
    key: '業界處理換衣的標準答案是「加臉部辨識」。',
    borrow: ['「查詢一個人 → 列出所有出現畫面」的操作介面，可參考到事後查詢用途'], gap: ['只能用自家攝影機與錄影主機', '外觀以衣服為主，同制服時排序幾乎無效'],
    cover: { s: ['g', 'm', 'm', 'b', 'b', 'b', 'm'], uni: 'b', cloth: 'm' }, ev: 'inferred',
    src: [['IPVM 報導', 'https://ipvm.com/reports/avigilon-appearance'], ['Motorola Solutions 說明', 'https://www.motorolasolutions.com/content/dam/msi/docs/Appearence_Search_AVO.pdf']] },
  { cat: 'com', id: 'briefcam', n: 'BriefCam（Milestone）', who: '2024 年起併入 Milestone Systems', pattern: 'search', rel: 'mid',
    goal: '錄影的事後鑑識搜尋與影片摘要。',
    flow: [['影片後處理建索引', '物件、屬性、外觀', 3], ['多攝影機搜尋', '依臉、外觀相似度、顏色、大小、速度、方向篩選', 7], ['結果瀏覽', '', 0, 'human']],
    key: '和 Avigilon 同屬「索引後查詢」，可串接不同廠牌的影像管理系統。',
    borrow: ['可串接既有影像管理系統的整合方式'], gap: ['不產生全域 ID 與路徑；同制服時顏色、外觀篩選失效'],
    cover: { s: ['g', 'm', 'm', 'b', 'b', 'b', 'm'], uni: 'b', cloth: 'm' }, ev: 'inferred',
    src: [['Milestone BriefCam 產品頁', 'https://www.milestonesys.com/products/briefcam/'], ['BriefCam 2025 型錄', 'https://mayflex.com/images_mx_web/documentation/brochures/milestone/BriefCam_Brochure_2025.pdf']] },
  { cat: 'com', id: 'hik', n: '海康威視 DeepinMind／DeepinView 屬性搜尋', who: '海康威視，智慧錄影主機與攝影機', pattern: 'search', rel: 'mid',
    goal: '依人的外觀屬性搜尋錄影。',
    flow: [['人體屬性分析', '最多 15 種屬性：上衣與褲子顏色、背包、手持物等；建議人體寬 70–300 像素', 3], ['屬性與臉部搜尋', '', 7]],
    key: '屬性搜尋完全依賴衣服差異；官方資料沒有清楚說明跨攝影機的人員再辨識。',
    borrow: ['「人體寬 70–300 像素」可作為攝影機架設的參考下限'], gap: ['全員迷彩服時，顏色屬性全部相同'],
    cover: { s: ['g', 'b', 'm', 'b', 'b', 'b', 'm'], uni: 'b', cloth: 'b' }, ev: 'inferred',
    src: [['屬性搜尋說明', 'https://legacy.hikvision.com/sites/default/files/manual/attribute_search_flyer_0.pdf'], ['DeepinMind Server 規格', 'https://www.hikvision.com/my/products/IP-Products/Data-Center/DeepinMind-Server/ds-ix2001-a3u-x/']] },
  { cat: 'com', id: 'watrix', n: '銀河水滴（Watrix）步態辨識', who: '中國廠商；報導稱用於北京、上海等地警方', pattern: 'bio', rel: 'high',
    goal: '在臉看不到時，以走路方式辨識人。',
    flow: [['取出人形剪影', '一般監視器影片即可，不需特殊攝影機', 3], ['建立走路動作模型', '', 3], ['比對', '宣稱約 50 公尺內、背對或遮臉也能辨識', 7]],
    key: '剪影步態實際用在監視系統的案例，和我們第 3C 步同一路線。',
    borrow: ['證明剪影步態可在既有監視器上運作'], gap: ['報導多為 2018 年前後；94% 準確率為公司自報', '早期為離線處理：搜尋 1 小時影片約需 10 分鐘'],
    cover: { s: ['m', 'm', 'g', 'b', 'b', 'b', 'm'], uni: 'g', cloth: 'g' }, ev: 'inferred',
    src: [['Security Today 報導', 'https://securitytoday.com/articles/2018/11/12/new-surveillance-tool-gait-recognition.aspx'], ['Global Times 報導', 'https://globaltimes.cn/content/1156769.shtml']] },

  /* ---------------- 外觀相同時的研究 ---------------- */
  { cat: 'res', id: 'pureid', n: 'PU-ReID：穿制服的人員再辨識', who: 'ACM 期刊論文（DOI 10.1145/3703839）', pattern: null, rel: 'high',
    goal: '工業場景中，所有人穿同款制服時的人員再辨識。',
    flow: [['輸入人形裁切', '', 3], ['雙分支網路', '一支學「制服」、一支學「身分」', 3], ['正交損失', '強迫兩支特徵互不相關，把制服資訊從身分特徵中分離', 3], ['只用身分分支比對', '', 3]],
    key: '不是讓模型「多學細節」，而是明確把制服特徵拆出去——比只放困難負樣本更直接。',
    borrow: ['第 3A 步外觀微調時加入「制服特徵分離」分支'], gap: ['工業制服不等於迷彩服；需在營區資料上驗證', '出版年份待確認'],
    cover: { s: ['b', 'b', 'g', 'b', 'b', 'b', 'b'], uni: 'g', cloth: 'b' }, ev: 'proven',
    src: [['ACM 論文頁', 'https://dl.acm.org/doi/10.1145/3703839']] },
  { cat: 'res', id: 'screid', n: 'SC-ReID：同衣服人員再辨識', who: 'Multimedia Systems 期刊，2024', pattern: null, rel: 'high',
    goal: '所有行人都穿同一套衣服時的再辨識。',
    flow: [['雙流網路', '', 3], ['合成驗證資料', '作者自建「同衣服」的合成資料', 0, 'train']],
    key: '少數直接處理「完全同衣」的研究，而且程式碼與資料公開。',
    borrow: ['程式碼可直接拿來跑辦公室同制服資料，作為第 3A 步的對照'], gap: ['合成資料與營區畫面差距大'],
    cover: { s: ['b', 'b', 'g', 'b', 'b', 'b', 'b'], uni: 'g', cloth: 'b' }, ev: 'proven',
    src: [['Springer 論文', 'https://link.springer.com/article/10.1007/s00530-024-01269-0'], ['程式碼與資料', 'https://github.com/Titor99/SC-ReID']] },
  { cat: 'res', id: 'icsm', n: 'ICSM：身分與衣服相似度建模', who: 'CVPR 2025', pattern: null, rel: 'high',
    goal: '無標註資料下的換衣人員再辨識。',
    flow: [['無標註訓練', '', 6], ['身分與衣服相似度建模', '', 3, 'feat'], ['三種評估情境', '一般、換衣、資料庫只有同衣服', 0]],
    key: '同時評估「同衣服」與「換衣」兩種情境——和本專案的雙重需求最接近的評估設計。',
    borrow: ['評估設計：E1 與 E10 可比照它分開報同衣與換衣成績', '無監督做法可對照第 6 步的 Cluster Contrast'], gap: ['公開資料上的結果，未在制服情境驗證'],
    cover: { s: ['b', 'b', 'g', 'b', 'b', 'm', 'b'], uni: 'm', cloth: 'g' }, ev: 'proven',
    src: [['CVPR 2025 論文', 'https://openaccess.thecvf.com/content/CVPR2025/html/Pang_Identity-Clothing_Similarity_Modeling_for_Unsupervised_Clothing_Change_Person_Re-Identification_CVPR_2025_paper.html']] },
  { cat: 'res', id: 'indgait', n: '工業門禁的 RGB 步態辨識（Industrial-Gait）', who: 'Journal of Imaging，2026', pattern: 'bio', rel: 'high',
    goal: '工人刷卡通過閘門時，以步態確認身分（標準工作服、安全帽）。',
    flow: [['閘門攝影機', '工人刷卡、通過活動柵欄，雙向行走', 1], ['背景抑制', '先把人從背景切出來；分割模型可單獨更換', 3], ['凍結大型視覺模型', 'DINO 系列骨幹＋BiggerGait 框架抽步態特徵', 3], ['比對', '150 人、1,500 段影片；最佳跨視角準確率 83.3%（DINOv3-S、原始 RGB）', 7]],
    key: '少數同時包含「刷卡、柵欄、標準工作服」的資料，最接近營門場景；作者也指出資料偏重通道條件、人數不大。',
    borrow: ['營門點位：步態可與刷卡、臉並列為身分錨點', '直接用 RGB（不經剪影）的步態路線，可作為第 3C 步的替代方案'], gap: ['需要 GPU（大型視覺模型）', '150 人規模；通道條件與營區道路不同'],
    cover: { s: ['g', 'b', 'g', 'b', 'b', 'b', 'g'], uni: 'g', cloth: 'm' }, ev: 'proven',
    src: [['J. Imaging 論文（MDPI）', 'https://www.mdpi.com/2313-433X/12/9/458'], ['PMC 全文', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13608203'], ['BiggerGait（NeurIPS 2025）', 'https://arxiv.org/html/2505.18132v2']] },
  { cat: 'res', id: 'dance', n: 'DanceTrack', who: '多目標追蹤基準（香港大學、CMU、字節跳動）', pattern: 'mtmc', rel: 'high',
    goal: '測試「外觀一樣、動作多變」時的追蹤：舞者穿同款服裝、頻繁交錯。',
    flow: [['偵測', '結論：偵測品質已足夠，不是瓶頸', 1], ['關聯', '結論：關聯才是瓶頸；外觀 ReID 在同服裝時幫助小', 2, 'track'], ['加入細部線索', '姿態、分割有幫助；更好的運動模型能提升準確度', 2]],
    key: '外觀一樣時，追蹤要靠運動模型與姿態——支持我們第 2 步「純運動追蹤＋以姿態做片段淨化」。',
    borrow: ['第 2 步的設計依據；OC-SORT 就是在 DanceTrack 上驗證的方法'], gap: ['單攝影機追蹤，不含跨攝影機'],
    cover: { s: ['g', 'g', 'b', 'b', 'b', 'b', 'b'], uni: 'g', cloth: 'b' }, ev: 'proven',
    src: [['DanceTrack 論文', 'https://arxiv.org/pdf/2111.14690'], ['專案頁', 'https://sites.google.com/view/dancetrackmot']] },
  { cat: 'res', id: 'soccer', n: 'SoccerNet 球員再辨識比賽', who: 'CVPR 2022、2023 比賽', pattern: null, rel: 'high',
    goal: '同隊球員穿一模一樣的球衣，在轉播畫面中重新辨識球員。',
    flow: [['球員裁切', '解析度低、常被遮擋', 3], ['外觀特徵', '2023 年冠軍用對比學習', 3], ['背號辨識', '另一隊以辨識背號獲評審獎', 3], ['小資料訓練技巧', '2022 年：分層抽樣＋中心點損失；資料少時中心點損失明顯優於三元組損失', 3]],
    key: '同隊服時，「衣服上的個別記號」（背號）與小資料訓練技巧是關鍵。',
    borrow: ['第 3A 步微調：試中心點損失（我們訓練資料只有約 12 人）', '背號 → 國軍的名牌與階級章'], gap: ['轉播畫面，不是監視器'],
    cover: { s: ['b', 'b', 'g', 'b', 'b', 'b', 'b'], uni: 'g', cloth: 'b' }, ev: 'proven',
    src: [['Sports Re-ID（2022）', 'https://arxiv.org/abs/2206.02373'], ['2023 冠軍（UniBw）', 'https://unibw.de/vis/news/cvpr2023-soccernet']] },

  /* ---------------- 穿制服人員與門禁 ---------------- */
  { cat: 'uni', id: 'tape', n: '穿制服人員的辨識與認證（名牌、階級章）', who: '美國專利（System and method for identifying and authenticating uniformed personnel）', pattern: 'anchor', rel: 'high',
    goal: '以電腦視覺辨識制服上的名牌與階級章，確認穿制服人員的身分。',
    flow: [['偵測制服', '', 1], ['定位名牌與階級章', '專利指出多數作戰服至少有名牌與階級章', 3], ['文字與符號辨識', '', 3], ['比對人員資料', '', 7]],
    key: '同制服不代表沒有個別記號：國軍迷彩服的姓名條與階級章就是。',
    borrow: ['第 3 步新增「名牌與階級章」線索，只用在近距點位，與臉並列為身分錨點'], gap: ['路邊監視器解析度不夠；需實測近距點位能否讀出', '專利描述，非已驗證系統'],
    cover: { s: ['g', 'b', 'g', 'b', 'b', 'b', 'g'], uni: 'g', cloth: 'm' }, ev: 'inferred',
    src: [['USPTO 專利', 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12695747']] },
  { cat: 'uni', id: 'prison', n: '監獄受刑人追蹤', who: '多件美國專利；監獄制服辨識研究', pattern: 'anchor', rel: 'high',
    goal: '在囚服完全相同的環境中追蹤受刑人。',
    flow: [['檢查點攝影機', '例：要求受刑人用餐前走過餐廳入口的攝影機', 1], ['個別記號', '衣服上的編號、刺青、疤痕、臉；不追囚服本身', 3], ['比對受刑人檔案', '', 7]],
    key: '「同制服時不追衣服，改找個別記號，並在必經點確認身分」——和營區處境最像。',
    borrow: ['把營門、餐廳入口當作檢查點（第 7 步的身分錨點）', '找制服上的個別記號'], gap: ['專利描述，未見準確度評估'],
    cover: { s: ['g', 'm', 'g', 'b', 'b', 'b', 'g'], uni: 'g', cloth: 'm' }, ev: 'inferred',
    src: [['Inmate tracking system（USPTO）', 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10762353'], ['Object re-identification in video streams（USPTO）', 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12450864'], ['監獄制服辨識（MATEC）', 'https://www.matec-conferences.org/10.1051/matecconf/202338811001']] },
  { cat: 'uni', id: 'tailgate', n: '門禁防尾隨與刷卡比臉', who: '多件專利與商用產品（如 ACTi、AppVision）', pattern: 'anchor', rel: 'high',
    goal: '偵測「一卡多人」與「冒用他人卡片」。',
    flow: [['門口攝影機數人頭', '', 1], ['與刷卡次數比對', '人比卡多就警示（尾隨）', 7], ['刷卡時比對臉與註冊照', '不符就警示或拒絕通行', 7]],
    key: '已是成熟商用功能；專利也提醒：單靠臉的誤判率不夠低，適合當第二道檢查。',
    borrow: ['門口的防尾隨與比臉可直接採購，不必自研', '我們專注在把一致性檢查延伸到全營區的路徑'], gap: ['只管單一門口，不知道進門之後去了哪裡'],
    cover: { s: ['g', 'b', 'm', 'b', 'b', 'b', 'g'], uni: 'm', cloth: 'm' }, ev: 'inferred',
    src: [['防尾隨偵測專利', 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12475770'], ['ACTi Tailgating Detection', 'https://www.acti.com/applications/tailgating-detection'], ['AppVision 刷卡比臉', 'https://www.asadria.com/?p=24465']] },
  { cat: 'uni', id: 'constr', n: '工地工人追蹤（安全帽、反光背心）', who: '工程與電腦視覺研究、專利', pattern: 'mtmc', rel: 'high',
    goal: '工人穿著相似時，跨攝影機追蹤並確認是否配戴安全裝備。',
    flow: [['偵測與追蹤工人', '', 2], ['再辨識跨視角配對', '依特徵相似度分組；兩視角配對後三角定位出 3D 位置', 6, 'cluster'], ['頭部＋身體分析', '2024 年研究：加入頭部資訊後身分交換為 0（HOTA 78.9）', 3, 'feat'], ['安全帽圖案', '日本研究：以安全帽上的圖案識別工人', 3]],
    key: '外觀相似時，頭部是被低估的線索。',
    borrow: ['第 2 步片段淨化與第 3 步可加入頭部區域特徵'], gap: ['國軍小帽、鋼盔款式相同，頭部差異主要在臉型與髮際，需實測'],
    cover: { s: ['g', 'g', 'g', 'b', 'm', 'g', 'b'], uni: 'g', cloth: 'b' }, ev: 'proven',
    src: [['頭部＋身體追蹤（Mathematics 2024）', 'https://mdpi.com/2227-7390/12/8/1245'], ['工人再辨識與 3D 定位', 'https://bohrium.dp.tech/paper/arxiv/37430765'], ['安全帽圖案辨識（J-STAGE）', 'https://www.jstage.jst.go.jp/article/jsceiii/3/J2/3_406/_article/-char/en']] }
];
window.OTHER_CATS = { sys: '完整的多攝影機系統與比賽', com: '商用影片搜尋與步態產品', res: '外觀相同時的研究', uni: '穿制服人員與門禁' };

/* ============================================================
   第二輪搜尋（2026-11）：擴充的面向
   ============================================================ */
window.PATTERNS.push(
  { id: 'archive', n: '先全部抽特徵、再聚成檔案（聚檔）', who: '公安「一人一檔」、Apple 照片人物、AI City 2024 冠軍的離線分群',
    flow: [['每次出現都抽特徵', '臉、上半身或全身', 3], ['特徵入庫', '不必當下判斷是誰', 0], ['離線聚類', '定期（例如每晚）把同一人的出現聚成一個檔案', 6], ['檔案貼標籤', '有名冊照片或人工確認時才給名字', 7]],
    good: '不需要攝影機拓撲或校正；資料越多檔案越完整；可增量更新', bad: '聚錯會連帶污染整個檔案；需要大規模評估聚類的準確、召回與擴散', ours: '我們第 6 步「分群」的做法，只是聚的單位是片段而不是單張照片' },
  { id: 'bind', n: '影像與感測器綁定', who: 'Vi-Fi／ViTag（手機 Wi-Fi 測距＋動作感測）、工地 RFID／UWB 識別證＋攝影機、Amazon Go 入口',
    flow: [['影像追蹤出匿名的人', '', 2], ['感測器提供「誰在附近」', '刷卡、手機訊號、識別證', 0], ['比對兩邊的時間與運動', '誰的感測訊號和這條影像軌跡最吻合', 7, 'sensor'], ['綁定身分', '之後靠影像持續追蹤', 7, 'card']],
    good: '身分來自感測器，不靠外觀；同制服、換裝都不影響', bad: '感測器可能被借用或代刷；多人同時經過時無法分開', ours: '我們第 7 步把刷卡當輔助證據；這類研究提供「怎麼分配給多人」的方法' }
);

window.OTHERS.push(
  /* ---------------- 完整系統與比賽（補充） ---------------- */
  { cat: 'sys', id: 'riips', n: 'AI City 2024 冠軍：重疊抑制分群（RIIPS 團隊）', who: 'CVPR 2024 研討會論文（Yoshida 等）；離線方法', pattern: 'archive', rel: 'high',
    goal: '多台攝影機中追蹤所有人並給出一致的 ID（2024 年 Track 1，HOTA 71.94%，第一名）。',
    flow: [['單攝影機追蹤', '以「重疊抑制分群」產生片段：同一幀裡重疊的人不會被併在一起', 2], ['挑代表影像', '用姿態估計挑出身體完整、沒被擋住的幀當這段片段的代表', 3], ['平均連結階層分群', '用代表影像的 ReID 特徵，做平均連結的凝聚分群', 6], ['低辨識度片段最後指派', '太短、太糊的片段不參加主要分群，等群建好後再分配給最接近的群', 6]],
    key: '和我們第 3、6 步的設計幾乎一致：用姿態挑好幀、平均連結分群、品質差的片段最後才指派。作者也指出：能看到未來畫面的離線方法，通常比線上方法準。',
    borrow: ['第 3 步「每段取品質最好的 8 幀」可改用姿態完整度挑幀', '第 6 步「低信心片段最後再併」有比賽冠軍的實證支持', '夜間批次（離線）處理的設計方向正確'], gap: ['比賽資料為合成影像、穿著各異', '使用攝影機校正與 GPU'],
    cover: { s: ['g', 'g', 'g', 'b', 'm', 'g', 'b'], uni: 'b', cloth: 'b' }, ev: 'proven',
    src: [['CVPRW 2024 論文', 'https://openaccess.thecvf.com/content/CVPR2024W/AICity/html/Yoshida_Overlap_Suppression_Clustering__for_Offline_Multi-Camera_People_Tracking_CVPRW_2024_paper.html'], ['第 2 名（線上、幾何一致性）', 'https://openaccess.thecvf.com/content/CVPR2024W/AICity/html/Xie_A_Robust_Online_Multi-Camera_People_Tracking_System_With_Geometric_Consistency_CVPRW_2024_paper.html']] },

  /* ---------------- 聚檔與人物聚類 ---------------- */
  { cat: 'arc', id: 'police', n: '公安「一人一檔」聚檔', who: '中國公安視頻系統；技術專利與評測文章', pattern: 'archive', rel: 'high',
    goal: '把各路口、卡口攝影機每天千萬張以上的人臉抓拍，聚成「每個人一份檔案」，再貼上身分標籤。',
    flow: [['前端抓拍', '卡口與路口攝影機拍下人臉', 1], ['抽特徵入庫', '每張臉一組特徵，路人庫一個月可達百億級', 3], ['分步聚類', '專利做法：先用短特徵快速篩選，再用長特徵精確比對，並依遮擋、偏轉、模糊動態調整權重', 6], ['建檔貼標籤', '和戶籍等資料比對後給身分', 7]],
    key: '聚檔的評估分成三個數：準確率（一個檔有沒有混進別人）、召回率（同一人有沒有漏聚）、擴散率（同一人有沒有被拆成好幾個檔）——正好對應我們第 6 步的「純度、碎裂」。',
    borrow: ['第 6 步的評估改用「準確、召回、擴散」三個數，主管較好理解', '先粗篩再精比的兩段式比對，可降低第 7 步的計算量'], gap: ['以人臉為主，路邊監視器拍不清臉時幫助有限', '規模與用途和營區完全不同；公開資料多為專利與評論，沒有實測準確率'],
    cover: { s: ['g', 'b', 'g', 'b', 'b', 'g', 'g'], uni: 'm', cloth: 'g' }, ev: 'inferred',
    src: [['大規模人臉聚類評測技術初探（安全內參）', 'https://www.secrss.com/articles/36444'], ['動態演算法的一人一檔聚類專利', 'https://www.xjishu.com/zhuanli/55/201910389414.html']] },
  { cat: 'arc', id: 'apple', n: 'Apple 照片的人物辨識（臉＋上半身）', who: 'Apple 機器學習研究部落格，iOS 15 起', pattern: 'archive', rel: 'high',
    goal: '在使用者的照片庫裡，把同一個人的照片自動聚在一起，臉被擋住或背對也要能認。',
    flow: [['偵測臉與上半身', '依框的位置、大小、重疊把臉和身體配對', 1], ['各自抽特徵', '臉一組、上半身一組', 3], ['距離融合', '兩者都有時用加權相加；只有身體就用身體；只有臉就和各群的平均臉比', 4], ['增量凝聚分群', '充電時（多半在夜間）定期執行，新照片併入既有群', 6], ['清除錯誤樣本', '防止誤判或非人物的偵測混進群裡、拖垮準確度', 6]],
    key: 'Apple 明白寫出：上半身特徵依賴「當天穿的衣服」，比臉不可靠，所以臉與身體的門檻要分開仔細調——這就是我們「外觀只在同一天、同一套服裝內可靠」的設計。',
    borrow: ['第 4 步：臉與外觀的距離加權相加、缺哪一項就只用另一項，有大規模產品驗證', '第 6 步：夜間增量分群、新片段併入既有群', '定期清除群中的離群樣本'], gap: ['照片庫沒有時間地點約束，也不需處理同制服'],
    cover: { s: ['g', 'b', 'g', 'g', 'b', 'g', 'm'], uni: 'b', cloth: 'm' }, ev: 'proven',
    src: [['Recognizing People in Photos Through Private On-Device Machine Learning', 'https://machinelearning.apple.com/research/recognizing-people-photos']] },
  { cat: 'arc', id: 'fbv', n: 'Face, Body, Voice：多模態人物聚類', who: 'Brown、Kalogeiton、Zisserman，ICCV 2021 研討會', pattern: 'archive', rel: 'mid',
    goal: '在電影與影集中，把同一角色的所有片段聚在一起（角色常換裝、背對鏡頭）。',
    flow: [['身體軌跡為單位', '每段有身體軌跡，看得到臉時加臉軌跡、說話時加聲音', 2], ['多模態特徵', '臉、身體、聲音', 3], ['高精度最近鄰聚類', '多種線索互相補充；先只合併非常確定的', 6], ['不可能連結', '同一鏡頭同時出現的兩人不可能是同一人', 5]],
    key: '「以身體軌跡為單位、臉可有可無、加不可能連結、先高精度再擴大」——與我們的片段＋多線索＋約束分群是同一套思路。',
    borrow: ['第 6 步：先只合併高信心的配對，再逐步放寬', '公開資料集可測試多線索分群程式'], gap: ['影視畫面清楚、近距離；不是監視器'],
    cover: { s: ['b', 'g', 'g', 'g', 'm', 'g', 'b'], uni: 'b', cloth: 'g' }, ev: 'proven',
    src: [['論文（arXiv 2105.09939）', 'https://arxiv.org/abs/2105.09939']] },

  /* ---------------- 檢查點與門禁（補充） ---------------- */
  { cat: 'uni', id: 'dbids', n: '美軍營區門禁 DBIDS', who: '美國國防部 Defense Manpower Data Center', pattern: 'anchor', rel: 'high',
    goal: '確認進入軍事營區的人是否有權進入。',
    flow: [['衛哨手持掃描', '掃軍人身分證條碼；依警戒等級加掃指紋', 7], ['查本地資料庫', '回傳照片與狀態（過期、無效、列管人員）', 7, 'match'], ['連到人員資格資料庫', 'DEERS 等中央資料', 7], ['跨營區共用', '同一聯合基地內各營區共用註冊資料', 0, 'index']],
    key: '軍方的做法是「在門口用卡＋生物特徵確認一次」，營內不追蹤；強度依警戒等級調整。',
    borrow: ['第 7 步：營門是最可靠的身分錨點；可依警戒等級決定是否加驗臉', '註冊資料可在營門建立'], gap: ['只管進出，不知道人在營內的路徑'],
    cover: { s: ['b', 'b', 'b', 'b', 'b', 'b', 'g'], uni: 'g', cloth: 'g' }, ev: 'proven',
    src: [['Scott AFB：What you need to know about DBIDS', 'https://www.scott.af.mil/News/Article/160753/what-you-need-to-know-about-dbids/'], ['JBSA：DBIDS enhances security', 'https://www.jbsa.mil/News/News/Article/462770/dbids-enhances-jbsa-security/']] },
  { cat: 'uni', id: 'airport', n: '機場「單一生物特徵憑證」旅程', who: 'ICAO 簡報、NIST 評測；Digi Yatra、Aruba Happy Flow、Thales 等', pattern: 'anchor', rel: 'high',
    goal: '旅客報到時註冊一次臉，之後安檢、貴賓室、登機門都刷臉通過。',
    flow: [['報到時 1:1 註冊', '臉與護照照片比對，綁定訂位資料成為「憑證」', 7], ['各檢查點 1:N 辨識', '只和「此時應該出現在這裡的人」比對：登機門只比該班機旅客（約數百人）', 7], ['旅程結束刪除', '廠商說明：憑證在旅程結束後從機場系統刪除', 0]],
    key: '關鍵是「縮小比對名單」：每個檢查點只比可能出現的人，名單小，誤認就少。',
    borrow: ['第 7 步：只和「當天在營、已刷卡進營、或剛在附近被看到」的人比對，不和全營名冊比', '資料保存期限與刪除規則'], gap: ['旅客配合正對鏡頭；營區路邊監視器沒有這種配合'],
    cover: { s: ['g', 'b', 'g', 'b', 'm', 'b', 'g'], uni: 'g', cloth: 'g' }, ev: 'proven',
    src: [['ICAO：Face Recognition in Travel Contexts', 'https://www.icao.int/Meetings/TRIP-Symposium-2021/PublishingImages/Pages/Presentations/Face%20Recognition%20in%20Travel%20Contexts.pdf'], ['NIST FRTE 無紙化旅行 1:N', 'https://pages.nist.gov/frvt/html/frvt_paperless_travel.html'], ['美國國家學院案例（Digi Yatra）', 'https://nap.nationalacademies.org/read/26180/chapter/19']] },
  { cat: 'uni', id: 'amazongo', n: 'Amazon Go 無人商店', who: 'Amazon；說明來自官方聲明與媒體報導', pattern: 'bind', rel: 'high',
    goal: '顧客進店後拿了什麼都自動記到他的帳上，全程不用臉部辨識。',
    flow: [['入口綁定', '掃手機 App 的 QR 碼開閘，系統給這位顧客一個臨時代碼', 7], ['店內持續追蹤', '天花板多台攝影機，顧客幾乎隨時在某台鏡頭內，靠畫面連續性跨攝影機追蹤', 2], ['外觀改變時更新', '官方說明：脫外套等外觀改變時，代碼對應的特徵會跟著更新', 6], ['出口刪除', '離店後臨時代碼消失', 0]],
    key: '「在入口綁一次身分，之後靠畫面連續性追蹤、外觀變了就更新」——身分不靠臉，換外套也不會斷。',
    borrow: ['營門刷卡的時刻，可視為把身分綁到那段片段的時機（第 7 步）', '同一段片段內外觀改變（脫外套）時，以時間連續性為主、更新外觀特徵（第 2 步）'], gap: ['攝影機極密、視野重疊；營區攝影機之間有大片盲區', '技術細節未公開'],
    cover: { s: ['g', 'g', 'm', 'b', 'g', 'g', 'g'], uni: 'b', cloth: 'g' }, ev: 'inferred',
    src: [['TechCrunch 報導', 'https://techcrunch.com/?p=1589032'], ['Chain Store Age 引述 Amazon 聲明', 'https://chainstoreage.com/node/92506']] },
  { cat: 'uni', id: 'redwolf', n: '以色列軍方檢查站臉部辨識（Red Wolf）', who: '國際特赦組織 2023 年報告；以色列軍方未公開說明', pattern: 'anchor', rel: 'mid',
    goal: '軍方檢查站自動確認通行者身分並決定是否放行。',
    flow: [['檢查站攝影機拍臉', '報告稱通行者未必知情', 1], ['與資料庫比對', '', 7, 'match'], ['未註冊者自動加入', '報告稱：新出現的臉會被自動註冊', 0, 'index'], ['顏色分級結果', '可通行、需盤查、需扣留', 7]],
    key: '技術上是典型的檢查點錨定；但它也是人權爭議的案例——未告知、自動註冊、無明確規範，正是系統設計時要先避免的。',
    borrow: ['反面教材：用途、告知、資料保存要事先訂清楚（見本章「治理」）'], gap: ['用途與對象和本專案完全不同；技術細節只來自人權組織的報告'],
    cover: { s: ['g', 'b', 'g', 'b', 'b', 'b', 'g'], uni: 'b', cloth: 'g' }, ev: 'inferred',
    src: [['Amnesty International：Automated Apartheid', 'https://www.amnesty.org/en/latest/news/2023/05/israel-opt-israeli-authorities-are-using-facial-recognition-technology-to-entrench-apartheid/']] },

  /* ---------------- 影像＋感測綁定 ---------------- */
  { cat: 'fus', id: 'vifi', n: 'Vi-Fi／ViTag：把攝影機裡的人對應到手機', who: '羅格斯大學 WINLAB；IPSN 2022、SECON 2022', pattern: 'bind', rel: 'high',
    goal: '攝影機看到幾個匿名的人，現場有幾支手機，判斷哪支手機是哪個人的。',
    flow: [['影像追蹤', 'RGB-D 攝影機追蹤每個人的位置軌跡', 2], ['手機訊號', 'Wi-Fi 精細測距（每秒 3 次）＋手機加速度計等（每秒 50 次）', 0], ['把軌跡翻成感測訊號', 'ViTag：用神經網路從影像軌跡預測「這個人的手機應該量到什麼」', 0], ['配對', '預測與實測最吻合的就是同一人；即時約 81%、離線約 91%（Vi-Fi）', 7, 'sensor']],
    key: '把兩種完全不同的資料換到同一個空間（時間序列）再比對——和我們把刷卡、影像都換成「證據」再相加是同一個概念。',
    borrow: ['第 7 步：多人同時通過門口時，可用「誰的時間點最吻合」分配刷卡證據，而不是平均分', '公開資料集可做方法參考'], gap: ['需要人人帶手機並開啟測距；營區手機管制下不可行', '只做綁定，不處理跨攝影機'],
    cover: { s: ['g', 'g', 'b', 'g', 'b', 'b', 'g'], uni: 'g', cloth: 'g' }, ev: 'proven',
    src: [['Vi-Fi 資料集', 'https://sites.google.com/winlab.rutgers.edu/vi-fidataset'], ['ViTag 程式碼', 'https://github.com/bryanbocao/vitag'], ['ViTag 論文（NSF PAR）', 'https://par.nsf.gov/biblio/10437904']] },
  { cat: 'fus', id: 'badge', n: '識別證＋攝影機：在咽喉點確認、之後靠影像追', who: 'Honeywell 等專利；工地 Triax＋EarthCam、Litum UWB', pattern: 'bind', rel: 'high',
    goal: '員工、工人進出與行蹤管理：身分由識別證提供，路徑由攝影機補。',
    flow: [['咽喉點讀卡', '入口的 RF 識別證讀卡機確認是誰', 7], ['同時拍下這個人', '把卡號和這一刻的影像綁在一起', 7], ['之後用影像追蹤', '專利：攝影機持續追蹤已確認身分的人', 2], ['（另一路線）UWB 定位', '識別證本身定位約 50 公分，不靠影像，但需大量基地台', 0]],
    key: '「咽喉點確認、之間靠影像」在工業界很常見；UWB 雖準，但要裝基地台、標籤可借用。',
    borrow: ['第 7 步：營門、餐廳門口刷卡的瞬間，把卡號綁到該片段（再由第 6 步傳到整群）'], gap: ['工地版本多只在入口綁定，沒有處理同制服的跨攝影機連結'],
    cover: { s: ['g', 'g', 'b', 'b', 'b', 'b', 'g'], uni: 'm', cloth: 'm' }, ev: 'inferred',
    src: [['Cooperative camera network（USPTO）', 'https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7149325'], ['Triax：RFID 與影像結合', 'https://www.triaxtec.com/news/construction-site-solution-pairs-rfid-and-video'], ['Litum UWB 工地案例', 'https://v2.iotone.com/case-study/worker-tracking-safety-monitoring-in-construction/c1208']] },

  /* ---------------- 支撐技術 ---------------- */
  { cat: 'sup', id: 'topo', n: '從資料自動學攝影機之間的關係', who: 'Tieu、Dalley、Grimson（ICCV 2005）；Makris 等；距離式拓撲（2017）', pattern: 'mtmc', rel: 'high',
    goal: '不知道攝影機位置、不做校正，從觀測資料自己學出「哪兩台相連、走過去要多久」。',
    flow: [['記錄每台攝影機的出入事件', '只要時間，不需身分', 1], ['計算兩台之間的統計相依', '真正相連的兩台，出入時間差會出現明顯的峰', 5], ['學出轉移時間分布', '可以有多個峰（走路、跑步、騎車）', 5], ['用於跨攝影機比對', '', 5]],
    key: '不用校正、不用標註，就能得到我們第 5 步需要的「最短步行時間表」與轉移時間分布；後續研究指出步速差異大時，改用距離比只用時間好。',
    borrow: ['第 5 步：先用 1–2 週的出入事件自動估轉移時間，再用少量人工確認', '分布要允許多峰（走路、跑步、操課）'], gap: ['方法較舊；人少的時段統計會不穩'],
    cover: { s: ['m', 'b', 'b', 'b', 'g', 'b', 'b'], uni: 'g', cloth: 'g' }, ev: 'proven',
    src: [['Tieu et al. ICCV 2005', 'https://people.csail.mit.edu/dalleyg/pubs/iccv05.pdf'], ['距離式拓撲推論（arXiv 1712.00158）', 'https://ar5iv.arxiv.org/html/1712.00158']] },
  { cat: 'sup', id: 'uda', n: '新場域自我調適：用多攝影機約束修正偽標籤', who: 'Takeuchi 等（arXiv 2210.13999）；UTAL；ktCUDA 等', pattern: null, rel: 'high',
    goal: '把在公開資料訓練的再辨識模型，搬到新場域時不需人工標註也能變好。',
    flow: [['自動產生片段', '單攝影機追蹤的片段本身就是「同一人」的免費標註', 2], ['自我訓練產生偽標籤', '分群後把群號當成標籤', 6], ['用環境約束修正', '同時在不同攝影機出現的兩人一定不同人等規則，剔除錯誤的偽標籤', 5], ['重新訓練', '', 3]],
    key: '我們第 5 步的「不可能配對」不只用來分群，還能拿來清理自我訓練的偽標籤。',
    borrow: ['第 6 步的 Cluster Contrast 半監督：加入不可能配對來過濾偽標籤', '片段內幀當正樣本、同時出現的人當負樣本'], gap: ['多數在公開資料上驗證；同制服場景未驗證'],
    cover: { s: ['b', 'g', 'g', 'b', 'g', 'g', 'b'], uni: 'b', cloth: 'b' }, ev: 'proven',
    src: [['多攝影機約束的領域調適', 'https://arxiv.org/abs/2210.13999'], ['UTAL（片段無監督學習）', 'https://arxiv.org/pdf/1903.00535'], ['ktCUDA', 'https://arxiv.org/abs/2001.04928v1']] },

  /* ---------------- 人工判讀與證據 ---------------- */
  { cat: 'hum', id: 'superrec', n: '倫敦警察廳「超級辨識員」', who: '倫敦警察廳專職小組；Davis 等人的研究（2016、2018）', pattern: 'search', rel: 'mid',
    goal: '由臉部辨識能力特別好的警員，看監視器影片認出嫌犯。',
    flow: [['篩選人員', '用臉部辨識測驗挑出能力最好的警員', 0], ['人工看影片', '小組每年從監視器影像認出超過 1,000 名嫌犯', 7], ['其他證據佐證', '多數後來以其他證據定罪', 0]],
    key: '研究顯示他們比一般人準，而且「信心高時比較準」；但測驗是受控影片，沒有實際案件的錯誤率。',
    borrow: ['第 7 步「待確認」要有人看：人工確認者要先測驗、記錄信心，並定期抽查'], gap: ['人工成本高；也會錯'],
    cover: { s: ['b', 'b', 'b', 'b', 'b', 'b', 'g'], uni: 'm', cloth: 'm' }, ev: 'proven',
    src: [['Davis 等：辨識影片人群中的目標', 'https://gala.gre.ac.uk/id/eprint/26440'], ['超級辨識員的預測因子（2016）', 'https://research.gold.ac.uk/19555']] },
  { cat: 'hum', id: 'forgait', n: '法庭上的步態鑑定', who: '英國與北愛爾蘭判例；Forensic Science Research 2018 回顧', pattern: 'bio', rel: 'mid',
    goal: '由專家比較監視器影片中人的走路方式與被告是否相符。',
    flow: [['專家觀察影片', '多為足病醫師', 3], ['逐項比較步態特徵', '', 3], ['出具意見', '法院逐案決定是否採納', 7]],
    key: '學界結論：步態鑑定目前還不能用來「認定身分」，只能當支持性證據；沒有公開的錯誤率。',
    borrow: ['系統輸出要分等級：步態只能「支持」，不能單獨定案——與我們把步態當證據之一、加上限的設計一致'], gap: ['人工專家判讀，不是自動系統'],
    cover: { s: ['b', 'b', 'g', 'b', 'b', 'b', 'm'], uni: 'g', cloth: 'g' }, ev: 'proven',
    src: [['Critical review of forensic gait analysis（2018）', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6201773/'], ['R v O\'Neill 步態證據裁定', 'https://www.judiciaryni.uk/files/judiciaryni/2026-09/Queen%20v%20Raymond%20O%27Neill%20%28Ruling%20No%209%29%20on%20the%20admissibility%20of%20forensic%20gait%20analysis%20evidence.pdf']] }
);

window.OTHER_CATS = {
  sys: '完整的多攝影機系統與比賽',
  arc: '聚檔與人物聚類：把所有出現聚成「一人一檔」',
  com: '商用影片搜尋與步態產品',
  res: '外觀相同時的研究',
  uni: '制服、門禁與檢查點',
  fus: '影像＋感測器綁定身分',
  sup: '支撐技術：自動學攝影機關係、新場域自我調適',
  hum: '人工判讀與證據等級'
};

/* 面向總覽：別人從哪些角度處理「誰、何時、去過哪」 */
window.FACETS = [
  ['多攝影機追蹤系統與比賽', '怎麼把多台攝影機的片段串成同一人？', 'NVIDIA、AI City 2023–2025', '片段 → 特徵 → 時空 → 分群是公認主流；離線全域關聯分數最高', 'sys'],
  ['聚檔（一人一檔）', '不追蹤，直接把所有出現聚成檔案可以嗎？', '公安聚檔、Apple 照片、影視人物聚類', '可以，而且不需攝影機拓撲；用準確、召回、擴散三個數評估', 'arc'],
  ['商用鑑識搜尋', '已經買得到的產品怎麼做？', 'Avigilon、BriefCam、海康威視', '以外觀與屬性為主，同制服時幾乎失效；換衣靠臉', 'com'],
  ['遠距多生物特徵', '看不清臉、衣服不可靠時用什麼？', 'IARPA BRIAR、銀河水滴', '臉＋步態＋體型，依品質加權', 'sys'],
  ['外觀相同的研究', '大家穿一樣時，模型要學什麼？', 'PU-ReID、SC-ReID、ICSM、DanceTrack、SoccerNet', '拆掉制服特徵、看個別記號（背號 → 名牌）、追蹤靠運動', 'res'],
  ['檢查點與門禁', '在哪裡確認身分最可靠？', '美軍 DBIDS、機場單一憑證、監獄、防尾隨', '在必經點確認；比對名單要依情境縮小', 'uni'],
  ['影像＋感測器綁定', '刷卡、手機、識別證能怎麼用？', 'Vi-Fi／ViTag、識別證＋攝影機、Amazon Go', '在綁定瞬間把身分掛到影像軌跡；多人時看時間吻合度', 'fus'],
  ['攝影機關係與新場域', '不校正、不標註能做到嗎？', '攝影機拓撲學習、多攝影機約束的自我訓練', '轉移時間可從資料自動學；不可能配對可清理偽標籤', 'sup'],
  ['人工判讀與證據', '系統說不準時，人怎麼接手？', '超級辨識員、法庭步態鑑定', '人也會錯；步態只算支持性證據', 'hum'],
  ['評估與治理', '怎麼評分？哪些規範要先訂？', 'IDF1／HOTA、聚檔三率、歐盟 AI 法、香港 SmartView', '見本章最後兩節', null]
];

/* 別人怎麼評估 */
window.OTHER_METRICS = [
  ['IDF1', '每個人的 ID 在整段時間內「保持正確」的比例', 'AI City 2023、NVIDIA', '最直接回答「路徑連得對不對」；第 5 章 E7 主要指標'],
  ['HOTA（DetA × AssA）', '把偵測準不準、關聯準不準拆開再合併', 'AI City 2024 起', '分開看是偵測問題還是關聯問題'],
  ['聚檔準確率／召回率／擴散率', '一個檔有沒有混人／同一人有沒有漏／同一人被拆成幾個檔', '公安聚檔評測', '第 6 步分群的成果，用這三個數報給主管'],
  ['BCubed F', '對每個片段算「同群的人對不對、同人有沒有在同群」', '分群研究', '第 6 步掃門檻時用的單一分數'],
  ['TAR@FAR、FPIR／FNIR', '固定誤認率下的正確接受率；陌生人被誤認、自己人被漏認', 'BRIAR、NIST', '第 7 步比對名冊（E8）'],
  ['Rank-1、mAP', '查詢時正確答案排第一的比例、平均精度', 'ReID 研究、SoccerNet', '只用來比較第 3 步各模型，不能代表系統成效']
];

/* 治理：別人訂了哪些規則 */
window.OTHER_GOV = [
  ['用途分級、事先核准', '香港 SmartView：區分「事後比對」與「即時追蹤」；報導稱需高階警官核准', '先訂清楚：事後查詢誰可以查、要誰核准；即時警示是否開放'],
  ['資料用完即刪、保存期限', 'Amazon Go 臨時代碼離店即消失；機場憑證旅程結束刪除；香港報導影像最長保存 31 天', '匿名軌跡與註冊特徵分開保存，各訂保存期限'],
  ['強度隨情境調整', '美軍 DBIDS 依警戒等級決定是否加驗指紋', '平時只做匿名軌跡；需要時才比對名冊'],
  ['證據等級', '法庭上步態只算支持性證據；超級辨識員研究顯示人也會錯', '輸出分「確認、可能、待確認」；人工確認也要抽查'],
  ['法規適用', '歐盟 AI 法：專為軍事、國防用途的系統排除適用，但軍民兩用不排除', '即使不受限，也比照民間規範訂告知與稽核，降低爭議'],
  ['反面教材', '特赦組織報告：檢查站未告知、自動註冊、無明確規範而引起國際批評', '事先公開用途與規範，避免同樣的質疑']
];

/* 對我們的啟示：落到哪一步、怎麼做 */
window.OTHER_LESSONS = [
  [6, '平均連結階層分群＋品質差的片段最後才指派', 'AI City 2024 冠軍', '維持第 6 步設計；低信心片段在主分群之後才併入'],
  [3, '用姿態完整度挑代表幀', 'AI City 2024 冠軍', '第 3 步「每段取最好的 8 幀」的品質分數加入 RTMPose 關節可見數'],
  [6, '離線全域關聯優於線上', 'AI City 2024、2025', '維持夜間批次處理；即時警示只做簡單規則'],
  [4, '臉與外觀距離加權、缺哪項就用另一項；外觀只在當天可信', 'Apple 照片', '第 4 步的設計有大規模產品佐證；外觀證據只用在同日'],
  [2, '片段內外觀改變時以時間連續性為主', 'Amazon Go', '片段淨化不要因為脫外套就切斷：同時看位置連續與身高'],
  [7, '依情境縮小比對名單', '機場單一憑證', '第 7 步只和「當日在營、已刷卡進營」的人比，名單小、誤認少'],
  [7, '在咽喉點把身分綁到影像，之後靠影像', '識別證＋攝影機、Amazon Go、DBIDS', '營門、餐廳刷卡的瞬間把卡號綁到該片段，再經分群傳到整群'],
  [7, '多人同時經過時用時間吻合度分配', 'Vi-Fi／ViTag', '刷卡證據不平均分，依「誰最接近刷卡時間與讀卡機位置」分'],
  [5, '轉移時間可從資料自動學', '攝影機拓撲學習', '第 5 步先自動估，再人工確認；分布允許多峰'],
  [6, '用不可能配對清理偽標籤', '多攝影機約束的領域調適', 'Cluster Contrast 半監督時加上第 5 步的約束'],
  [6, '分群成果用三個數報告', '公安聚檔評測', '第 5 章 E7 加報準確率、召回率、擴散率'],
  [7, '輸出分等級，人工確認也要抽查', '法庭步態、超級辨識員', '「待確認」交人工；人工結果也抽樣複核']
];

/* ============================================================
   steps.js — 第 2 章「方法總覽」的內容：依系統七步，列出候選方法與我們的選擇。
   m：對應 R.METHODS2 的方法名稱（成績、算力、授權、出處由那裡帶入）；
      不在總表裡的元件用 x 自帶欄位 { n, v, res, cost, lic, url }。
   tag：use 第一版採用｜base 對照基準｜try 之後試用｜ref 參考思路｜skip 暫不採用
   impl：實作資訊（預設收合）— code 程式碼、w 權重、input 輸入、env 環境、first 第一步、note 注意
   研究未讀到的資訊一律寫「待確認」，不要補猜。
   ============================================================ */
window.STEPS = [
  /* ------------------------------------------------ 1 偵測 */
  { id: 1, n: '攝影機與人物偵測',
    q: '在每一幀畫面裡找出「人」的框。這是整條流程的入口：漏掉的人，後面全部救不回來。',
    pick: '授權（正式交付時避開 GPL／AGPL）、CPU 上的速度、遠處小人物的漏檢率。',
    groups: [{ cards: [
      { m: 'YOLOv7（你現有）', tag: 'base', idea: '單階段卷積偵測器，COCO 預訓練。',
        fit: '研究階段直接沿用；正式交付時 GPL-3.0 需要處理。',
        impl: { code: 'github.com/WongKinYiu/yolov7', w: '官方提供 COCO 權重', input: '整張影像（常用 640）', env: '已在現有環境', first: '用辦公室與營區試錄影片跑一遍，統計遠處小人物的漏檢', note: 'GPL-3.0：自用通常不觸發義務；委外交付即屬散布，須公開原始碼或改用其他偵測器' } },
      { m: 'YOLOX-S', tag: 'use', idea: '不需錨框的單階段偵測器。',
        fit: '授權乾淨（Apache-2.0），作為正式系統的偵測器首選。',
        impl: { code: 'github.com/Megvii-BaseDetection/YOLOX', w: '官方提供 COCO 權重', input: '整張影像（640）', env: 'PyTorch；可匯出 ONNX，以 ONNX Runtime／OpenVINO 在 CPU 執行', first: '與 YOLOv7 在同一段影片比較召回率與每幀耗時', note: '9.0M 參數、26.8 GFLOPs' } },
      { m: 'NanoDet-Plus-m', tag: 'try', idea: '為行動裝置與 CPU 設計的極輕量偵測器。',
        fit: '營區伺服器若只有 CPU、YOLOX 太慢時的備案。',
        impl: { code: 'github.com/RangiLyu/nanodet', w: '官方提供 COCO 權重', input: '320–416', env: 'PyTorch；支援 ncnn／ONNX', first: '只在 YOLOX-S 速度不夠時評估', note: 'COCO mAP 27–30，遠處小人物的召回要實測' } },
      { m: 'YOLO26n', tag: 'skip', idea: 'Ultralytics 最新的輕量偵測器。',
        fit: 'AGPL-3.0，交付風險高於 GPL；有乾淨的替代品就不必冒險。',
        impl: { code: 'github.com/ultralytics/ultralytics', w: '官方提供', input: '640', env: 'Ultralytics 套件', first: '—', note: 'AGPL-3.0：網路服務形式提供也可能觸發開源義務' } }
    ] }],
    choice: { v1: '研究期沿用 YOLOv7；同時以 YOLOX-S 建立授權乾淨的版本。抽幀 2–5 fps、沒人的時段跳過。', later: '伺服器只有 CPU 且太慢時改 NanoDet。', not: 'Ultralytics 系列（AGPL）。' },
    table: { use: 'YOLOX-S（研究期沿用 YOLOv7）', lic: 'Apache-2.0', have: '部分已有', cost: '主要算力瓶頸之一' }
  },

  /* ------------------------------------------------ 2 追蹤 */
  { id: 2, n: '單相機追蹤成片段',
    q: '把同一台攝影機裡同一個人連續的框串成一段「片段」。後面的所有比對都以片段為單位，所以片段若混到兩個人，錯誤會一路傳下去。',
    pick: '同制服的人交錯時會不會換錯人（ID 交換）、CPU 負擔、授權。',
    groups: [{ cards: [
      { m: 'ByteTrack', tag: 'use', idea: '只用位置與運動（卡爾曼濾波），把高分與低分偵測框分兩輪匹配，被遮擋時不容易斷。',
        fit: '不靠外觀，所以不受同制服影響；CPU 負擔可忽略；MIT 授權。',
        impl: { code: 'github.com/ifzhang/ByteTrack（用原倉庫，不用 BoxMOT）', w: '追蹤本身不需權重；倉庫附偵測器權重', input: '每幀偵測框與分數', env: 'Python；有 ONNX／TensorRT／ncnn 部署範例', first: '在 5 人以內交錯行走的影片上，人工數 ID 交換次數', note: 'MOT17：HOTA 63.1、IDF1 77.3；兩人交錯後走向改變時仍可能換錯' } },
      { m: 'OC-SORT', tag: 'try', idea: '用觀測修正卡爾曼預測，轉彎、停走等非線性運動較穩。',
        fit: 'ByteTrack 在轉彎、停下又走時常斷，再換它比較。',
        impl: { code: 'github.com/noahcao/OC_SORT', w: '不需權重', input: '偵測框', env: 'Python', first: '與 ByteTrack 在同一批影片比 ID 交換與斷段次數', note: '授權本次未確認（待確認）' } },
      { m: 'BoT-SORT', tag: 'skip', idea: '在追蹤中加入外觀 ReID 與相機運動補償。',
        fit: '營區攝影機固定，相機運動補償無益；同制服下外觀幫助有限，反而增加算力。',
        impl: { code: 'github.com/NirAharon/BoT-SORT', w: '需 ReID 權重', input: '偵測框＋影像', env: 'Python', first: '—', note: '授權待確認' } },
      { x: { n: '片段淨化（自行實作）', v: '工程做法', res: '本專案自建評估', cost: '低', lic: 'ok', url: '' }, tag: 'use',
        idea: '在片段內檢查位置跳動、外觀突變與身高突變，在疑似換錯人的地方把片段切開。',
        fit: '同制服的人交錯時，追蹤器最容易換錯人；這是整條流程的源頭錯誤，便宜就能先防。',
        impl: { code: '自行實作', w: '—', input: '片段內逐幀的框、外觀特徵、估計身高', env: 'Python／NumPy', first: '人工標出交錯片段，量「該切的有沒有切、不該切的有沒有誤切」', note: '屬合理推論的做法，沒有直接對應的論文數字' } }
    ] }],
    choice: { v1: 'ByteTrack（原倉庫）＋片段淨化；把「ID 交換率」當成系統的第一個量測指標。', later: '斷段太多時試 OC-SORT。', not: 'BoT-SORT（固定相機用不到它的優勢）。' },
    table: { use: 'ByteTrack＋片段淨化', lic: 'MIT／自行實作', have: '新增', cost: '可忽略' }
  },

  /* ------------------------------------------------ 3 線索 */
  { id: 3, n: '身分線索特徵',
    q: '從每段片段算出代表這個人的「特徵」。本專案的難點：同服裝時要分得開不同人（同制服），換裝後要連得起同一人（換衣）。沒有一種線索兩者都做得好，所以要分線索來看。',
    pick: '在路邊監視器俯角下還能不能用、換裝後還在不在、授權是否允許軍用、弱伺服器跑不跑得動。',
    groups: [
      { key: 'app', n: '3A 外觀 ReID', lead: '看整個人的長相。只在「同一套服裝之內」可靠（例如同一天、沒換裝的路段）；用營區同制服資料微調後，能學到鞋、配件、體型等細節。換裝後失效。', cards: [
        { m: 'CLIP-ReID ViT-B/16', tag: 'base', idea: '兩階段：先為每個人學一組文字 token，再用它監督影像編碼器微調；推論時只用影像。',
          fit: '你們現有的工具，當所有外觀實驗的對照基準。',
          impl: { code: 'github.com/Syliz517/CLIP-ReID', w: '官方提供 Market／MSMT17 等權重（以倉庫說明為準）', input: '256×128 人形裁切', env: '官方需求 PyTorch 1.8.0＋CUDA 10.2；與現有 1.11 差距不大，需自行確認', first: '在辦公室同制服資料上零樣本測試，分開報同日與跨日成績（E1）', note: 'MIT；CLIP 預訓練權重授權另查' } },
        { m: 'BoT（BagTricks）R50', tag: 'base', idea: 'ResNet-50 加一組訓練技巧的經典強基準。',
          fit: '你們已有，保留為回歸基準：新方法至少要贏它。',
          impl: { code: 'github.com/michuanhaohao/reid-strong-baseline', w: '已有', input: '256×128', env: '已在現有環境', first: '與 CLIP-ReID 一起跑 E1', note: '—' } },
        { m: 'PersonViT ViT-S/16', tag: 'use', idea: '遮罩影像建模加對比學習，先在 400 萬張無標註行人圖（LUPerson）上預訓練。',
          fit: '弱算力下最划算的起點；Apache-2.0。',
          impl: { code: 'github.com/hustvl/PersonViT', w: '待確認（以倉庫說明為準）', input: '256×128', env: '官方環境未列（待確認）', first: '零樣本與微調兩種，和 CLIP-ReID 比跨日 mAP 與每張推論時間（E2）', note: 'ViT-B/16 版 MSMT17 mAP 80.8，是本次查到最高的現成骨幹' } },
        { m: 'SOLIDER Swin-S', tag: 'use', idea: '自蒸餾預訓練，加一個「語意控制器」調整外觀與人體語意的比重（ReID 建議 λ 0–0.2）。',
          fit: '與 PersonViT 並列首選；MIT 授權。',
          impl: { code: 'github.com/tinyvision/SOLIDER-REID', w: '官方提供', input: '256×128', env: '官方環境 PyTorch 1.7.1；現有 1.11 預期可跑，需實測', first: '與 PersonViT 一起跑 E2', note: 'Swin-B 版 mAP 77.1' } },
        { m: 'OSNet x1.0', tag: 'try', idea: '多尺度輕量網路，只有 2.2M 參數。',
          fit: '若 ViT 太慢，當蒸餾的學生模型（教師用 PersonViT 或 CLIP-ReID）。',
          impl: { code: 'github.com/KaiyangZhou/deep-person-reid（torchreid）', w: 'model zoo 提供', input: '256×128', env: 'PyTorch', first: '只在推論速度不夠時評估', note: 'torchreid 授權本次未查（待確認）；FastReID（Apache-2.0）也有 OSNet 與蒸餾工具' } },
        { m: 'TF-CLIP', tag: 'try', idea: '以 CLIP 為基礎的影片（片段）層級 ReID，整合多幀資訊。',
          fit: '你們在 CLIP 生態，想從單張升級到片段層級時最順手。',
          impl: { code: '待確認', w: '待確認', input: '片段（多幀）', env: '待確認', first: '單張版本穩定後再試', note: '授權未確認' } },
        { m: 'TransReID', tag: 'ref', idea: 'ViT 加「相機／視角嵌入」，顯式學習攝影機造成的偏差。',
          fit: '相機嵌入的概念值得借用；骨幹本身已被自監督預訓練超越。',
          impl: { code: 'github.com/damo-cv/TransReID', w: '官方提供', input: '256×128＋相機 ID', env: 'PyTorch', first: '—', note: 'MIT' } },
        { m: 'Instruct-ReID', tag: 'skip', idea: '用文字指令調整要比對的屬性。',
          fit: '資料限非商業研究，不適合當正式骨幹。',
          impl: { code: '見論文', w: '—', input: '影像＋文字', env: '—', first: '—', note: '資料授權為非商業' } }
      ], chart: 'ch-msmt' },
      { key: 'cc', n: '3B 換裝（換衣 ReID）', lead: '讓同一人換了衣服，特徵仍然一樣。本專案同一天內會換裝，這類方法處理的正是「連得起換了裝的同一人」那一半，但需要「同一人穿多套服裝」的訓練資料。', cards: [
        { m: 'CAL', tag: 'use', idea: '另訓一個衣服分類器，再逼主模型的特徵讓它猜不出衣服（對抗損失）；只用 RGB。',
          fit: '授權乾淨、ResNet-50 級可部署，作為換裝實驗（E10）的基準方法。',
          impl: { code: 'github.com/guxinqian/Simple-CCReID', w: '待確認', input: 'RGB 人形裁切＋衣服標籤（同一人多套服裝）', env: 'PyTorch', first: '用自建資料（含迷彩、運動服、冬季外套）訓練，量換裝連結率', note: 'Apache-2.0；全員同服時對「分開不同人」幫助有限' } },
        { m: 'CLIP3DReID', tag: 'try', idea: '訓練時用 3D 體型與 CLIP 文字監督，讓特徵偏向體型而非衣服；推論只需 R50。',
          fit: '最貼近「看體型、不看衣服」；也是 BRIAR 系統的體型模組。',
          impl: { code: '待確認', w: '待確認', input: '單張 RGB', env: '待確認', first: '找到程式碼後與 CAL 比換裝連結率', note: 'CCVID R1 84.5' } },
        { m: '3DInvarReID', tag: 'ref', idea: '重建 3D 穿衣人體，拆掉衣服與姿態，只留體型。',
          fit: '單用不如 CAL，與 CAL 融合有加成；訓練複雜，暫作參考。',
          impl: { code: '見論文', w: '—', input: 'RGB（訓練需 3D）', env: '—', first: '—', note: '單用 R1 70.2，與 CAL 融合 84.3' } },
        { m: 'AIM', tag: 'ref', idea: '以因果推論去除衣服的干擾。', fit: '只小幅勝過 CAL，不值得多花成本。',
          impl: { code: '見論文', w: '—', input: 'RGB', env: '—', first: '—', note: '—' } },
        { m: 'CCAF', tag: 'skip', idea: '結合人體解析與 CLIP 的換衣方法。', fit: '數字最高但沒有釋出程式碼。',
          impl: { code: '無', w: '—', input: 'RGB＋人體解析', env: '—', first: '—', note: '—' } }
      ], chart: 'ch-mevid' },
      { key: 'gait', n: '3C 步態', lead: '看走路的方式，不受衣服顏色影響，換裝後仍有效。限制：要連續走一段（約一個步態週期以上）、俯角越大越差、跑步和走路不同。', cards: [
        { m: 'DeepGaitV2-P3D', tag: 'use', idea: '輸入黑白剪影序列（64×44），以偽 3D 卷積學步態的時空特徵。',
          fit: '精度與算力的平衡點，建議的第一個步態模組。',
          impl: { code: 'github.com/ShiqiYu/OpenGait', w: 'Hugging Face：opengait/OpenGait', input: '64×44 剪影序列（需前端人形分割）', env: 'PyTorch', first: '零樣本跑在路邊俯角影片，量「至少要幾幀才有用」（E5）', note: '僅限學術：正式系統需取得授權或自行重新實作；低角度訓練換到高角度測試時 Rank-1 掉到約 26%，要微調' } },
        { m: 'GaitBase', tag: 'base', idea: 'OpenGait 的簡單強基線（ResNet9，每幀約 1.18 GFLOPs）。',
          fit: '步態實驗的對照基準。',
          impl: { code: 'github.com/ShiqiYu/OpenGait', w: 'Hugging Face', input: '64×44 剪影', env: 'PyTorch', first: '與 DeepGaitV2 一起跑', note: '僅限學術' } },
        { m: 'SkeletonGait++', tag: 'try', idea: '剪影加上骨架熱圖兩路輸入。',
          fit: '表中最高，但需要分割與姿態估計兩個上游模型，算力加倍。',
          impl: { code: 'OpenGait', w: 'Hugging Face', input: '剪影＋骨架圖', env: 'PyTorch', first: '單一剪影模型穩定後再試', note: '僅限學術' } },
        { m: 'GPGait', tag: 'try', idea: '只用骨架座標，先把姿態轉成統一表示，強在跨資料集泛化。',
          fit: '剪影品質差（遮擋、背景雜）時的備案；正規化會拿掉身高資訊。',
          impl: { code: '見論文', w: '待確認', input: '關節點序列（17 點）', env: '待確認', first: '剪影失敗的場景再試', note: '授權待確認' } },
        { x: { n: 'RTMPose（MMPose）', v: '2023', res: 'RTMPose-m COCO AP 75.8；i7 CPU 90+ FPS', cost: '輕量', lic: 'unk', url: 'https://github.com/open-mmlab/mmpose' }, tag: 'use',
          idea: '即時姿態估計器，輸出 17 個關節點。', fit: '骨架步態與片段淨化的上游；也能用來估身高比例。',
          impl: { code: 'github.com/open-mmlab/mmpose', w: 'MMPose 提供（權重授權未載明）', input: '人形裁切', env: 'MMPose／ONNX', first: '在路邊俯角影片上目視檢查關節是否穩定', note: '程式碼 Apache-2.0；權重訓練資料（COCO 等）授權需自行確認' } },
        { m: 'BigGait（ViT-S）', tag: 'skip', idea: '直接用凍結的 DINOv2 特徵，不需分割與姿態，跨域強。',
          fit: '需要 GPU，且僅限學術；弱伺服器暫不考慮。',
          impl: { code: 'OpenGait', w: 'Hugging Face', input: 'RGB', env: '需 GPU', first: '—', note: '30.8M 參數、12.7 GFLOPs' } }
      ], chart: 'ch-gait' },
      { key: 'face', n: '3D 臉', lead: '最強的身分資訊，換裝後仍有效；但路邊監視器多半拍不清。只適合營門、走廊等近距點位，當作「身分錨點」。門檻：兩眼間距 ≥ 10 像素、俯角 ≤ 30°（受控實驗）。', cards: [
        { m: 'AdaFace R100', tag: 'use', idea: '依影像品質調整訓練難度的臉部辨識，擅長低品質臉。',
          fit: '程式碼 MIT；監視器對監視器仍只有約 35%，只在近距點位使用。',
          impl: { code: 'github.com/mk-minchul/AdaFace', w: 'R18／R50／R100，見倉庫 Google Drive', input: '依 5 點對齊的 112×112 臉（權重註明 BGR 輸入）', env: 'PyTorch', first: '依距離與俯角分層，量營門點位有多少片段拍得到可用的臉（E4）', note: '訓練資料集（MS1MV2、WebFace 等）各有使用條款' } },
        { m: 'MagFace', tag: 'use', idea: '特徵向量的長度就代表臉的品質。',
          fit: '幾乎零成本的臉部品質估計，用來決定「這張臉信不信」。',
          impl: { code: '見官方倉庫', w: '官方提供', input: '112×112', env: 'PyTorch', first: '與 AdaFace 搭配，品質低的臉直接不參與', note: 'Apache-2.0' } },
        { m: 'SCRFD-2.5GF', tag: 'try', idea: '擅長小臉的臉部偵測器。',
          fit: '偵測效果好，但 InsightFace 權重限非商業研究。',
          impl: { code: 'github.com/deepinsight/insightface', w: '非商業授權', input: '整張影像', env: 'PyTorch／ONNX', first: '研究期可用，正式系統需換授權乾淨的偵測器或自行訓練', note: '「非商業」是否涵蓋政府內部使用不明確' } },
        { m: 'MobileFaceNet', tag: 'try', idea: '不到 1M 參數的輕量臉部特徵。',
          fit: '算力不夠時的備案。', impl: { code: '見論文', w: '待確認', input: '112×112', env: '—', first: '—', note: '—' } },
        { m: 'CR-FIQA', tag: 'skip', idea: '學習式的臉部品質評估。', fit: 'CC BY-NC 4.0（非商用），用 MagFace 替代。',
          impl: { code: 'github.com/fdbtrs/CR-FIQA', w: '非商用', input: '對齊臉', env: '—', first: '—', note: '—' } }
      ] },
      { key: 'body', n: '3E 體型與身高', lead: '身高與身體比例不隨衣服改變，但單目估計誤差約 4–9 cm，和人與人之間的差距差不多，只能當弱證據（篩候選、剔除不可能）。冬季外套、鋼盔會讓估計偏大。', cards: [
        { x: { n: '單目身高估計（自行實作）', v: '幾何方法', res: '單目誤差約 4–9 cm（文獻）', cost: '極低', lic: 'ok', url: '' }, tag: 'use',
          idea: '由腳點與頭頂在畫面上的位置，配合攝影機架高與俯角算出身高；可用行人本身自動標定攝影機。',
          fit: '成本極低、跨日穩定，作為弱先驗。',
          impl: { code: '自行實作（OpenCV）', w: '—', input: '腳點、頭頂點、攝影機參數或自動標定', env: 'Python／OpenCV', first: '請已知身高的人員走過各攝影機，量誤差', note: '戴鋼盔時頭頂偏高；接近垂直的俯角幾乎不能用' } },
        { m: 'BPBreID', tag: 'skip', idea: '分部位比對，只比雙方都看得到的部位（處理遮擋）。',
          fit: 'Hippocratic 授權含軍事限制模組；作者也自承不同人可能有相同局部外觀。',
          impl: { code: 'github.com/VlSomers/bpbreid', w: '—', input: 'RGB（訓練需人體解析）', env: '—', first: '—', note: '授權須法務審查' } },
        { m: 'KPR', tag: 'skip', idea: '以關鍵點提示處理「一個框裡有多人」的遮擋。',
          fit: '只有出入口人群遮擋才需要；授權（Hippocratic）與算力雙重風險。',
          impl: { code: '見論文', w: '—', input: 'RGB＋關鍵點', env: '—', first: '—', note: '授權須法務審查' } }
      ] }
    ],
    choice: { v1: '外觀：PersonViT-S 或 SOLIDER-S（以 CLIP-ReID 對照）；步態：DeepGaitV2-P3D（研究授權）＋ RTMPose；臉：AdaFace＋MagFace，只用在近距點位；身高：弱先驗。換裝以 CAL 為基準實驗（E10）。', later: 'CLIP3DReID（換裝）、SkeletonGait++、OSNet 蒸餾。', not: 'BPBreID／KPR（授權）、BigGait（GPU）、CR-FIQA（非商用）。' },
    table: { use: '外觀 PersonViT-S／SOLIDER-S；步態 DeepGaitV2；臉 AdaFace＋MagFace；身高', lic: 'Apache／MIT；步態僅學術', have: '外觀有基準，其餘新增', cost: '外觀低；步態需分割' }
  },

  /* ------------------------------------------------ 4 融合 */
  { id: 4, n: '換成同一種證據（融合）',
    q: '兩段片段比對時，每條線索各給一個分數，但單位不同（外觀是相似度、步態是距離、身高是公分差）。要把它們合成一個「是不是同一人」的判斷，而且某條線索看不到時不能拖垮結果。',
    pick: '能不能處理缺線索、需不需要大量「每種線索都齊全」的訓練資料、好不好解釋。',
    groups: [{ cards: [
      { x: { n: 'Z-score／Min-Max 正規化後加總', v: 'Jain 等 2005', res: '經典基準', cost: '可忽略', lic: 'ok', url: 'https://doi.org/10.1016/J.PATCOG.2005.01.012' }, tag: 'base',
        idea: '把各線索分數縮放到同一範圍再加權相加。', fit: '最簡單的基準；對離群值敏感，缺線索時不好處理。',
        impl: { code: '自行實作', w: '—', input: '各線索分數', env: 'NumPy', first: '當 E6 的基準', note: '—' } },
      { x: { n: '似然比融合（對數相加）', v: 'Nandakumar 等', res: '理論上最佳；量化增益待確認', cost: '可忽略', lic: 'ok', url: 'https://apps.dtic.mil/sti/pdfs/ADA488585.pdf' }, tag: 'use',
        idea: '每個分數換成「同一人時出現的機率 ÷ 不同人時出現的機率」，取對數後相加；看不到的線索該項為 0。',
        fit: '可解釋、自然處理缺線索、不需要成對的多模態訓練資料。',
        impl: { code: '自行實作（scikit-learn 的高斯混合或核密度估計）', w: '—', input: '各線索分數＋同人／不同人標註', env: 'Python／scikit-learn', first: '用自建資料估出各線索的同人與不同人分數分布', note: '要用營區自己的資料估「不同人」分布；同制服、身高分布窄，公開資料的校準不能搬' } },
      { x: { n: '品質條件化（依品質 q 調整）', v: 'BioSecure DS2 等', res: '品質相依融合基準存在；勝者待確認', cost: '可忽略', lic: 'ok', url: 'https://arxiv.org/abs/2111.08703' }, tag: 'use',
        idea: '把臉的清晰度、片段長度、遮擋、俯角當條件：p(分數 | 同人, 品質)。',
        fit: '讓系統在畫面差時自動少信那條線索。',
        impl: { code: '自行實作', w: '—', input: '分數＋品質變數', env: 'scikit-learn', first: '先用兩三級品質分層估分布', note: '—' } },
      { x: { n: 'Platt／Isotonic 校準', v: '經典', res: '—', cost: '可忽略', lic: 'ok', url: '' }, tag: 'use',
        idea: '把分數換成「同一人的機率」，Platt 用 S 型曲線、Isotonic 用單調階梯。', fit: '少量標註就能做；資料少時用 Platt 較穩。',
        impl: { code: 'scikit-learn（LogisticRegression、IsotonicRegression）', w: '—', input: '分數＋標註', env: 'Python', first: '與似然比做法比較校準誤差（ECE）', note: '—' } },
      { x: { n: '品質加權片段聚合', v: 'Multicolumn Network 等', res: 'IJB 基準提升 2–6%', cost: '低', lic: 'ok', url: 'https://arxiv.org/abs/1807.09192' }, tag: 'use',
        idea: '一段片段有很多幀，依每幀品質加權平均成一個特徵，而不是逐幀比對。', fit: '片段層級比對更穩，也省算力。',
        impl: { code: '自行實作', w: '—', input: '逐幀特徵＋品質分數', env: 'NumPy', first: '比較「平均」與「品質加權平均」的 Rank-1', note: '—' } },
      { x: { n: '小型學習式門控', v: '工程做法', res: '待驗證', cost: '低', lic: 'ok', url: '' }, tag: 'try',
        idea: '用邏輯迴歸或兩層小網路，從分數與品質直接學權重。', fit: '資料夠多、而且確定勝過似然比時才換（E6）。',
        impl: { code: 'scikit-learn／PyTorch', w: '—', input: '分數＋品質＋標註', env: '—', first: 'E6：與似然比比跨日 mAP 與 ECE', note: '學不贏似然比就用似然比（較好解釋）' } },
      { m: 'FarSight／BRIAR 融合', tag: 'ref', idea: '品質估計器預測各線索權重，再用專家混合層加權；臉＋步態＋體型。',
        fit: '「品質導引融合」的架構藍圖；多個 GPU 模型，整套搬不動。',
        impl: { code: '釋出情形待確認', w: '—', input: '臉＋全身影片', env: '多 GPU', first: '—', note: '臉受限時 TAR@0.1%FAR 從 30.7% 升到 65.0%' } },
      { m: 'HAMoBE', tag: 'ref', idea: '凍結 CLIP ViT-L/14，外觀、體型、步態三位專家加雙輸入門控。',
        fit: '最接近「依情況選線索」的研究；對弱伺服器太重。',
        impl: { code: '見論文', w: '—', input: 'RGB 影片 16 幀', env: '需 GPU', first: '—', note: 'MEVID 真實跨日換衣 R1 20.1（舊方法 < 6）' } }
    ], chart: 'briar' }],
    choice: { v1: '品質加權片段聚合 → 各線索分數校準成似然比 → 依品質條件化 → 相加。', later: '資料夠多後試小型學習式門控（E6）。', not: '大型專家混合模型（HAMoBE、FarSight 整套）——算力不夠，且需要大量成對資料。' },
    table: { use: '似然比融合＋品質條件化＋片段聚合', lic: '自行實作', have: '新增', cost: '可忽略' }
  },

  /* ------------------------------------------------ 5 時空 */
  { id: 5, n: '時空約束',
    q: '同一個人不可能同時在兩處，也不可能比走路更快地換攝影機。這條線索完全不看衣服，所以在同制服、換裝時特別值錢。',
    pick: '需不需要攝影機校正、能不能套到配置未知的營區。',
    groups: [{ cards: [
      { m: 'st-ReID', tag: 'use', idea: '統計攝影機兩兩之間的轉移時間分布，和外觀分數合成最終分數。',
        fit: '幾乎零成本、不改任何模型；營區拓樸固定。',
        impl: { code: '自行實作（概念見論文）', w: '—', input: '片段的攝影機 ID 與時間戳', env: 'Python', first: '從標註資料量營區攝影機兩兩的步行時間分布（E3）', note: '公開資料上 Rank-1 91.2→97.2；營區人群密時增益可能較小' } },
      { x: { n: '不可能配對規則（cannot-link）', v: '工程做法', res: '待驗證', cost: '可忽略', lic: 'ok', url: '' }, tag: 'use',
        idea: '同時出現在兩處、或轉移時間短於最短步行時間的兩段片段，直接標成「不可能是同一人」。',
        fit: '分群時用來擋下錯誤合併；不需任何訓練。',
        impl: { code: '自行實作', w: '—', input: '片段時間、攝影機、最短步行時間表', env: 'Python', first: '在分群前後各量一次誤併率', note: '最短步行時間表可先人工估，再用資料修正' } },
      { x: { n: '畫面座標轉平面圖（單應性）', v: '經典幾何', res: '—', cost: '低', lic: 'ok', url: '' }, tag: 'try',
        idea: '每台攝影機在地面上標 4 個以上的點，把腳點換成營區平面圖座標。',
        fit: '輸出路徑到平面圖時需要；視野重疊時還能直接用位置連結。',
        impl: { code: 'OpenCV findHomography', w: '—', input: '每台攝影機 4 個以上地面對應點', env: 'Python／OpenCV', first: '先在兩台攝影機試做', note: '每個營區要做一次，與「不依賴校正」的泛用目標有取捨' } },
      { x: { n: 'AI City Challenge 多攝影機追蹤方法', v: '2023–2024 賽題', res: '同構管線（逐篇未驗證）', cost: '—', lic: 'unk', url: '' }, tag: 'ref',
        idea: '單相機追蹤 → 片段 ReID 特徵 → 相機幾何與時間約束 → 跨相機階層分群。',
        fit: '和本專案架構同構，可參考前幾名的工程細節。',
        impl: { code: '各隊公開程式碼不一', w: '—', input: '多攝影機影片', env: '多為 GPU', first: '挑一兩篇讀實作細節', note: '本次未逐篇驗證數字' } }
    ], chart: 'st-chart' }],
    choice: { v1: '攝影機兩兩的轉移時間分布（st-ReID 式）＋不可能配對規則。', later: '需要平面圖路徑時加單應性轉換。', not: '依賴精密攝影機校正的 3D 方法（違反泛用目標）。' },
    table: { use: '轉移時間先驗＋不可能配對規則', lic: '自行實作', have: '新增', cost: '可忽略' }
  },

  /* ------------------------------------------------ 6 分群 */
  { id: 6, n: '分群（片段聚成人）',
    q: '把一天所有片段聚成一群群「匿名的人」，不需要人員名冊。之後跨日再把同一人連起來。',
    pick: '每天的規模（數十到數百人）、能不能加入不可能配對規則、需不需要訓練。',
    groups: [{ cards: [
      { x: { n: '約束式平均連結凝聚分群', v: '經典＋約束', res: '小規模下通常已足夠（推論）', cost: '低', lic: 'ok', url: '' }, tag: 'use',
        idea: '由最像的一對開始逐步合併，合併前檢查兩群之間有沒有不可能配對。',
        fit: '免訓練、最容易加約束；每日規模小，計算量沒問題。',
        impl: { code: '自行實作（scikit-learn 的凝聚分群不支援不可能配對規則）', w: '—', input: '片段兩兩的融合證據＋約束', env: 'Python／NumPy', first: '在標註的一天資料上掃門檻，同時看人數誤差與純度（E7）', note: '低信心片段另存，不要硬併' } },
      { x: { n: 'HDBSCAN', v: '經典', res: '—', cost: '低', lic: 'ok', url: '' }, tag: 'try',
        idea: '依密度自動決定群數，離群點當雜訊。', fit: '不用調群數；但被當雜訊的片段要另報為「低信心」，不能丟。',
        impl: { code: 'scikit-learn（1.3 以上內建）', w: '—', input: '距離矩陣', env: 'Python', first: '與凝聚分群比較', note: '加約束較不直接' } },
      { m: 'Cluster Contrast', tag: 'use', idea: '先分群產生偽標籤，再用對比學習訓練外觀模型，反覆進行（無標註訓練）。',
        fit: '用大量無標註營區影片改善外觀模型；MIT、與 PyTorch 1.11 相容。',
        impl: { code: 'github.com/alibaba/cluster-contrast-reid', w: '用 SOLIDER／PersonViT 權重初始化', input: '無標註人形裁切', env: 'PyTorch', first: '以少量註冊樣本做半監督，避免同制服把不同人併成一群', note: '無標註最好約 50 mAP，與有標註差 27–30 點' } },
      { m: 'ISE', tag: 'try', idea: '專門處理「一群裡混了不同人」的無監督訓練。', fit: '混合叢集正是同制服的失敗模式。',
        impl: { code: '見論文', w: '—', input: '無標註', env: '—', first: 'Cluster Contrast 出現大量混群時再試', note: '—' } },
      { m: 'PPLR', tag: 'try', idea: '無監督訓練中加入相機 ID 資訊。', fit: '可用相機 ID；授權待確認。',
        impl: { code: '見論文', w: '—', input: '無標註＋相機 ID', env: '—', first: '—', note: '—' } },
      { x: { n: 'OGMC 線上分群', v: 'arXiv 2021', res: 'IJB-B F 最高、約快 6 倍', cost: '低', lic: 'unk', url: 'https://arxiv.org/abs/2103.17272' }, tag: 'try',
        idea: '每個人用多個高斯分布表示，新資料進來不必整批重聚。', fit: '適合跨日的增量連結。',
        impl: { code: '待確認', w: '—', input: '特徵', env: '—', first: '同日分群穩定後再做跨日', note: '—' } },
      { x: { n: '圖神經網路分群（Linkage-GCN、STAR-FC 等）', v: 'CVPR 2019–2021', res: '百萬級人臉資料上很強', cost: '中高', lic: 'unk', url: 'https://arxiv.org/abs/1903.11306' }, tag: 'skip',
        idea: '把分群當成「兩點是否同一人」的連結預測。', fit: '規模優勢用不上，還需要自己的標註重新訓練。',
        impl: { code: '各論文倉庫', w: '—', input: '特徵', env: 'GPU', first: '—', note: '—' } },
      { m: 'DSKC', tag: 'ref', idea: '不保留舊影像的持續學習 ReID。', fit: '長期維護、隱私考量時的研究方向。',
        impl: { code: '見論文', w: '—', input: '依序新資料', env: '—', first: '—', note: '仍屬研究' } }
    ], chart: 'ch-uda' }],
    choice: { v1: '約束式平均連結凝聚分群（同日）；外觀模型用 Cluster Contrast＋少量註冊樣本半監督改善。', later: '跨日改用 OGMC 類增量分群；混群嚴重時試 ISE。', not: '圖神經網路分群（規模不需要）。' },
    table: { use: '約束式凝聚分群；Cluster Contrast 半監督', lic: '自行實作／MIT', have: '新增', cost: '低' }
  },

  /* ------------------------------------------------ 7 身分 */
  { id: 7, n: '比對名冊（刷卡輔助）',
    q: '把每個「匿名的人」對應到人員名冊；不在名冊上的要標成「未知」。門禁刷卡可以縮小候選，但可能被代刷，所以不能直接當答案。',
    pick: '誤認率（把 A 認成 B、把陌生人認成官兵）要壓得低；能用整群多段證據；能處理刷卡與影像不一致。',
    groups: [{ cards: [
      { x: { n: '整群多證據比對＋第一第二名間隔', v: '工程做法', res: '待驗證', cost: '低', lic: 'ok', url: '' }, tag: 'use',
        idea: '用一整群的多段片段（多個角度、多種服裝）一起和名冊比對；第一名要夠高，而且要明顯贏過第二名。',
        fit: '比單段比對穩定；間隔不夠就標「未知」或交人工確認。',
        impl: { code: '自行實作', w: '—', input: '匿名群的特徵集合＋名冊註冊特徵', env: 'Python', first: '先把誤認率壓到 1% 以下，再看漏認率（E8）', note: '—' } },
      { x: { n: '開放世界 ReID', v: 'Li 等，ECCV 2018', res: '問題定義', cost: '—', lic: 'unk', url: '' }, tag: 'ref',
        idea: '直接定義「查詢的人可能不在資料庫裡」的評估方式。', fit: '評估設計的依據：要報誤認率與漏認率，不只報 Rank-1。',
        impl: { code: '—', w: '—', input: '—', env: '—', first: '—', note: '—' } },
      { x: { n: '刷卡紀錄當先驗與一致性檢查', v: '工程做法', res: '待驗證', cost: '可忽略', lic: 'ok', url: '' }, tag: 'use',
        idea: '刷卡的時間地點用來縮小候選；比對結果與刷卡不符時，以影像為準並列入待查。',
        fit: '用到營區既有資料，又不被代刷誤導。',
        impl: { code: '自行實作', w: '—', input: '門禁刷卡紀錄（卡號、時間、門）', env: '—', first: '確認刷卡紀錄的格式與時鐘是否與攝影機同步', note: '刷卡只能加分，不能單獨決定身分' } },
      { x: { n: '在營區攝影機下建立註冊資料', v: '工程做法', res: '—', cost: '一次性', lic: 'ok', url: '' }, tag: 'use',
        idea: '每位人員在營區自己的攝影機前，以幾種常見服裝各走一次，建立註冊特徵。',
        fit: '與實際畫面同條件的註冊資料，比用其他來源的照片有效得多。',
        impl: { code: '—', w: '—', input: '每人每種服裝數段影片', env: '—', first: '先以辦公室同仁試做流程與所需時間', note: '牽涉個資，需先確認保存與使用規範' } },
      { m: 'SapiensID', tag: 'try', idea: '單一模型同時處理臉與全身。', fit: '唯一可用的「臉＋身體」統一模型候選；算力約 35 GFLOPs。',
        impl: { code: '見論文', w: '待確認', input: '384×384 全身＋臉', env: 'GPU 較佳', first: '近距點位效果不好時再評估', note: '訓練資料授權與倫理疑慮需確認' } }
    ] }],
    choice: { v1: '整群多證據比對＋第一第二名間隔＋刷卡一致性檢查；在營區攝影機下建立多服裝註冊資料。', later: '近距點位試 SapiensID。', not: '只靠刷卡判定身分；單段片段直接比對名冊。' },
    table: { use: '整群比對＋間隔門檻＋刷卡一致性', lic: '自行實作', have: '新增', cost: '低' }
  }
];
window.TAGS = { use: ['第一版採用', '#0c8a0c'], base: ['對照基準', '#2a78d6'], try: ['之後試用', '#b97e00'], ref: ['參考思路', '#6f7a71'], skip: ['暫不採用', '#c93434'] };

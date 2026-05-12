# MiroFish Big Backtest V1: Axiom Reception

Created: 2026-05-12T18:33:42.342628+00:00

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `seed-big-backtest-v1-2026-05-13.md`
Model: `deepseek-v4-pro` via `api.deepseek.com`

## Forecast Output
# Executive verdict

Axiom 正處在從「重新包裝的依賴規則引擎」到「可防禦的架構觀測層」的斷層線上。`--baseline`、intentional violations、`--spec` 等最新工作為務實採用提供了真正錨點，但尚未填補最大的技術缺口：當團隊遵守表面規則而耦合實質未變時，Axiom 仍無法發出高訊噪訊號。目前最合理的定位是「架構合約 X 光機」，而非「架構健康擔保人」。在推動更大規模公開採用前，必須優先消滅繞道合約的盲區，並大幅降低諮詢模式的雜訊。

# Stakeholder reaction map

1. **資深 monorepo 平台工程師**  
   「10 秒跑完一萬個檔案的速度可以放進 CI，但你要求我在數百個模組維護 `.axi`？若有自動產生就算了。另外，我的團隊早就用 Dependency Cruiser 管理依賴方向，你的『觀測』聽起來像名詞換皮。」

2. **AI 編碼工具建構者**  
   「Markdown 輸出和 JSON 意圖圖譜適合放進代理環境，我可以用 Axiom 產生 refactor prompt。但若靜態分析無法摸透動態注入，我無法在我生成的 React 程式自動套用規則——它會漏掉一堆東西。」

3. **前端遊戲開發者（React/Pixi + AI 輔助）**  
   「我讓 Cursor 幫我生程式，Axiom 在 PR 裡噴一堆 services↔store 循環警告，但我不覺得那是真的問題。除非它只在我架構真正爛掉時才叫，否則我關掉。」

4. **開源函式庫維護者**  
   「如果 Axiom 只能告訴我 nanoid 沒有深層內部引用，那很無聊。若它能在 Zod v4 中偵測到 locales 表層膨脹到把內部型別漏出去，我才會注意。但我不會為了這個把 `.axi` 放進 repo。」

5. **靜態分析研究員**  
   「宣告圖 vs 觀察圖的比對是有趣的切入點，但你們無法分析符號層級的健康度，也無法處理字串式 DI 和動態引入。這表示所有合約都可以被『合規形狀』的程式碼繞過，而你們只能偵測愚蠢的錯誤。這在學術上不完整。」

6. **工程經理（考慮 CI 採用）**  
   「我喜歡基線漂移和刻意負債的到期日概念，這讓我可以階段式收緊規則。但我怕團隊把警告全部 marking 成 intentional 就再也不看。另外，誰來寫那第一份 `.axi`？那是最貴的部分。」

7. **代理框架建構者（想要修復迴圈）**  
   「Axiom 若能提供可執行的合約並在 PR 註釋中給出高信心違規，我能讓 agent 自動提出重構 PR。但現在的多數警告太軟性，agent 看不懂哪些必須修、哪些是噪音。」

8. **討厭吵雜 linter 的懷疑開發者**  
   「又一個往我的 CLI 噴警告的工具。你說 advisory 不是硬性閘門，但一旦 PM 看到它就會變成強制。直到你能保證零誤警，我才試。」

9. **安全/合規工程師**  
   「強制層次方向依賴和禁止循環有助於證明責任隔離，這對 SOC2 架構審查可能有價值。但我需要證明規則無法被繞過——目前『公共 API 表面警告』只是提醒，不是防護。」

10. **早期採用者（喜歡架構觀測）**  
    「我已經在用 Axiom 掃描所有 side project。`--spec` 讓我不用污染 repo 就能試，很棒。我下一個想看到的是它能自動產生高品質架構地圖，不只是層間違規。」

# Strongest objections

- **技術面**：合約可被「形狀合規」繞過。整個模組透過 `index.ts` 重新匯出，內部仍任意引用，Axiom 無法偵測「虛假公開 API」下的高度耦合。這是核心信用漏洞。
- **產品面**：啟動成本集中在建立和維護 `.axi` 檔。在百模組等級的 monorepo，這是全職工作苗頭，且無法從現有工具（如 Nx tags）輕鬆轉換，除非有自動匯入器。
- **感知面**：即使有 observe-first 和工作流，外部仍容易將其簡化為「Dependency Cruiser 加上 YAML」，因為規則語法類似。差異化不夠具象。

# Most promising adoption wedge

對已有架構文件但無自動化驗證的團隊，提供「外部合約掃描」作為 PR 輔助服務：  
- 不用安裝工具，只需指向 repo 和一份合約 spec（甚至在 gist 上）。  
- 輸出 Markdown 直接貼到 PR，指出「原本應獨立的兩個層出現了新的依賴」。  
- 以「零設定架構 code review」作為鉤子，再引導團隊逐步建立 `.axi`。  

Lumina 試點的正面結果可在相似的遊戲前端、或區塊鏈前端專案複現。

# Roadmap traps to avoid

- **不要過早投入修復建議或自動重構引擎**。在訊號品質夠硬前，給 agent 錯誤的修復方向比沒有還糟。
- **不要與 Dependency Cruiser 比功能矩陣**。核心差異化是「意圖 vs 觀察」的斷層邏輯，不是規則數。
- **不要將 `--warn-*` 加上更多啟發式變數**。當前噪音已高，增加更多軟警告會侵蝕信任，除非搭配智慧過濾。
- **不要跳進符號級 API 語義分析**。那是數年的研究坑，應先止血繞道問題。

# Recommended next engineering tasks

（按訊噪比和實作規模排序）

1. **實作「公開 API 繞道耦合偵測」**（高訊噪、中等規模）  
   掃描每個模組：若公開入口點背後，大部分依賴關係仍直接來自內部路徑（而非經過入口），標示為潛在的「虛假合規」。這直接回應「合約形狀合規」的攻擊點。  
2. **智慧預設基線／初次體驗過濾**（高訊噪、中等規模）  
   在首次 `axi observe` 時自動隱藏低影響警告（例如只有極少數檔案涉及的循環、或深度內部引用少於臨界值的模組），並提供一鍵生成 `.axi` 建議的互動模式。大幅降低第一印象噪聲。  
3. **`.axi` 自動範本從現有結構產生**（中訊噪、小規模）  
   掃描現有資料夾結構與 package.json，產出帶有 `path` 和建議層的初步 `.axi` 草稿，減少手寫阻力。

# What to say publicly

「Axiom 讓架構意圖可被機器閱讀，並在 drift 變成常態負債前抓住它。它能合約化強制你最關鍵的邊界，同時透明標記你們已接受的風險，不是黑箱規則。」

# What not to claim publicly

- 「保證你的 API 是良好設計的」
- 「取代 ESLint / Dependency Cruiser / Nx」
- 「靜止所有架構衰退」
- 「適用於任何語言或動態引入場景」
- 「零誤報」

# Decision

**先執行更多小型試點，證明訊號品質後再公開推動**。以 `zod`、`nanoid` 和一個具循環歷史的中型前端工具庫作為首批對象，產出跨版本漂移報告，並取得維護者直接回饋。同步執行「繞道耦合偵測」原型，在試點中展示它捕捉到現有工具忽略的結構壓力。當該偵測至少在一次真實專案中標出有意義的「虛假合規」案例後，再進行較大規模的開發者預覽推廣。

## Maintainer Interpretation

This forecast reinforced the current product direction instead of reversing it:

- Keep Axiom observe-first and honest about limits.
- Do not claim semantic API health or firewall authority.
- Keep `--spec` and external contracts as the pilot wedge.
- Run more small pilots before a wider public push.
- Treat "compliant shape, hidden coupling" as the next narrow signal to improve.

Follow-up implemented after this run:

- `--warn-public-api-surface` now also reports `public_entrypoint_coupling` when an exposed entry point reaches at least four same-module internal files. This is advisory and does not fail `axi check` by itself.

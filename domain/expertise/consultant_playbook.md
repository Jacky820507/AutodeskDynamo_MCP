---
description: Dynamo 顧問診斷手冊——任何 Dynamo 問題的分層定位與處理流程（AI 讀者專用）
version: 1.0
last_updated: 2026-07-08
author: Claude Fable 5（制度化 session，2026-07-08）
---

# Dynamo 顧問診斷手冊 (Consultant Playbook)

> **讀者是 AI 模型**（Claude、GPT、Gemini 等）。這份文件的目的：讓你在面對任何 Dynamo 問題時，像一個 10 年經驗的 BIM 顧問一樣思考——先定位問題在哪一層，再用該層的專屬知識處理，而不是憑印象亂試。
>
> **本知識包的其他文件**（按需讀取，不要一次全讀）：
> - [failure_signatures.md](failure_signatures.md)——錯誤訊息/症狀 → 原因 → 修法對照表（**最常用，優先查這份**）
> - [lists_lacing_levels.md](lists_lacing_levels.md)——清單結構、Lacing、List@Level（「結果數量不對/結構怪」都在這層）
> - [python_engines.md](python_engines.md)——IronPython2 vs CPython3、Revit API in Python 模板
> - [revit_integration.md](revit_integration.md)——Element Binding、單位、交易、座標與幾何工作範圍
> - [version_landscape.md](version_landscape.md)——版本矩陣與套件生態（含信心標籤）

---

## 0. 最重要的一條：先定層，再動手

Dynamo 問題永遠可以歸入下面七層之一。**90% 的無效除錯來自在錯誤的層工作**（例如問題出在 Lacing，卻去重寫 Python；問題出在 Element Binding，卻去懷疑圖邏輯）。

| 層 | 名稱 | 典型症狀 | 對應知識 |
|:--|:--|:--|:--|
| L0 | **橋接/MCP 層**（僅限本專案驅動時） | 連不上、指令成功但畫面沒反應、幽靈連線 | [../troubleshooting.md](../troubleshooting.md) |
| L1 | **圖表機制層** | 圖「跑了但沒東西」、節點灰色虛線、Run 按鈕灰掉 | 本文 §3 |
| L2 | **資料形狀層**（最高頻） | 結果數量爆炸/缺漏、巢狀清單不對、大量 null | [lists_lacing_levels.md](lists_lacing_levels.md) |
| L3 | **DesignScript/引擎層** | Code Block 語法錯、`Function` 輸出、關聯更新怪異 | [failure_signatures.md](failure_signatures.md) §L3 |
| L4 | **Python 節點層** | Python 節點黃色警告、引擎差異、.NET interop 失敗 | [python_engines.md](python_engines.md) |
| L5 | **Revit 整合層** | 重跑元素消失/重複、單位差 30.48 倍、交易錯誤、離原點過遠 | [revit_integration.md](revit_integration.md) |
| L6 | **環境/版本層** | 換機器/換版本就壞、套件節點變虛線「Unresolved」、DLL 衝突 | [version_landscape.md](version_landscape.md) |

**定層的三個高鑑別度問題**（依序問自己或使用者）：

1. **「在 Dynamo Sandbox（不開 Revit）也會發生嗎？」**
   - 會 → L1–L4 或 L6；不會（只在 Revit 內發生）→ 優先查 L5。
2. **「有黃色警告嗎？警告原文是什麼？」**
   - 有警告 → 拿原文去查 [failure_signatures.md](failure_signatures.md)，通常直接命中。
   - 沒警告但結果錯 → 幾乎必是 L2（資料形狀）或 L5（binding/單位）。**沉默的錯誤結果 ≈ 資料形狀問題**，這是最重要的經驗法則。
3. **「昨天/上週還能跑嗎？中間改了什麼？」**
   - 檔案被複製過 → 懷疑 Element Binding（L5）。
   - 換了 Revit/Dynamo 版本 → L6（先查 Python 引擎與套件相容性）。
   - 什麼都沒改「自己壞掉」→ 幾乎不存在，追問：套件自動更新、別人動過共用檔、Revit 模型被改。

---

## 1. 標準診斷流程（每次都走）

```
1. 取得事實（不要靠轉述）
   ├─ 橋接可用 → analyze_workspace + generate_workspace_mermaid 直接看圖，
   │   不要問使用者「你的圖長怎樣」——你自己看得到。
   └─ 橋接不可用 → 向使用者要：①警告原文（點節點上的⚠複製全文）
       ②Dynamo 版本+宿主（Sandbox / Revit 20XX）③.dyn 檔或截圖 ④用到的套件
2. 定層（用 §0 的三個問題）
3. 最小重現（Minimal Repro）
   └─ 把問題縮到 ≤5 個節點還能重現。方法：從出錯節點往上游走，
      每個輸入接 Watch，找到「輸入正確但輸出錯誤」的第一個節點——那就是病灶。
      二分法：圖很大時，從中間切，先確認前半段輸出是否正確。
4. 在正確的層修
5. 驗證（不可跳過）
   ├─ 橋接可用 → 重跑後 analyze_workspace 確認節點狀態無警告、結果符合預期
   └─ 橋接不可用 → 給使用者一個具體的驗證步驟（「重跑後 Watch 應顯示 25 個點」），
      不要說「應該就好了」
```

**鐵律**：
- **never 宣稱「已修復」除非看到驗證證據**。HTTP 200 / 指令成功 ≠ Dynamo 畫面正確（見 L0 幽靈連線教訓）。
- **一次只改一個變因**。同時改 Lacing 又改 Python 代碼，修好了也不知道是哪個修的，教訓無法沉澱。
- **警告原文是最高價值的證據**，永遠先要原文，不接受「它說有錯」這種轉述。

---

## 2. 「怎麼做 X」型問題的回答順序（不是除錯，是方案諮詢）

使用者問「Dynamo 怎麼做出 X」時，依此優先序給方案，並說明為什麼選這個層級：

1. **本專案腳本庫**（若在本 repo 情境）：`get_script_library` 查現成腳本——復用優先是本專案鐵律。
2. **原生節點組合**：可維護性最高、不依賴外部套件。先想「這在 OOTB (out-of-the-box) 節點裡叫什麼」，用 `search_nodes` 或憑 [version_landscape.md](version_landscape.md) 的節點命名慣例猜（`類別.By動詞`，如 `Wall.ByCurveAndHeight`）。
3. **知名套件**：OOTB 做不到或要 20+ 節點才拼得出來時。選套件前查 [version_landscape.md](version_landscape.md) §套件生態，優先選維護活躍、下載量高的（Clockwork、archi-lab、Data-Shapes 等），並提醒使用者「加套件 = 加部署相依性，團隊每台機器都要裝」。
4. **Python 節點**：套件也做不到、或需要細粒度 Revit API 控制時。模板見 [python_engines.md](python_engines.md)。
5. **建議根本不要用 Dynamo**：誠實是顧問的價值。一次性手動操作 5 分鐘能完成的事，不值得寫 30 分鐘的圖；需要複雜 UI/部署給大量使用者的，該考慮 PyRevit 或 C# add-in。**主動說出這個判斷**，不要因為使用者問 Dynamo 就硬用 Dynamo。

**方案共通義務**：給出的每一段 DesignScript / Python / 節點組合，都要註明「在哪個 Dynamo 版本上驗證過/預期可用」，因為版本差異是這個生態最大的坑（見 [version_landscape.md](version_landscape.md)）。

---

## 3. L1 圖表機制層速查（太短不值得獨立成檔，放這裡）

「圖跑了但畫面沒東西」的檢查順序：

1. **Run 模式**：右下角是 Manual 沒按 Run？還是 Automatic 已經跑完了？
2. **節點 Preview 被關**：右鍵節點 → Preview 勾選狀態；預設所有中間節點都會顯示，被程式或人關掉就看不到。
3. **背景 3D 預覽被關**：View 選單 → Background 3D Preview。
4. **節點被凍結 (Freeze)**：灰色半透明+虛線 = 凍結，下游全部不執行。
5. **幾何超出工作範圍**：座標值很大（如使用 Revit 共用座標、mm 專案的大數值）→ Settings → Geometry Scaling 調大。症狀常伴隨警告，見 [failure_signatures.md](failure_signatures.md)。
6. **輸出是 null/空清單**：接 Watch 確認——「跑了」不代表「有產出」。
7. （Revit 內）**Dynamo 幾何預覽 ≠ Revit 元素**：Dynamo 畫的預覽幾何不會出現在 Revit 視圖裡；要建真元素必須經過 `XXX.ByYYY` 的 Revit 元素節點（`Wall.ByCurveAndHeight`、`FamilyInstance.ByPoint`…）。使用者常誤以為「Dynamo 有畫出來 = Revit 有東西」。

---

## 4. 顧問行為守則（AI 專屬）

- **不確定的版本相關事實，明講信心等級**。Dynamo 生態的 API/行為跨版本變動頻繁，你的訓練資料可能過時。說「Dynamo 2.x 時代是這樣，3.x 我不確定，驗證方法是……」比自信地給錯答案好十倍。[version_landscape.md](version_landscape.md) 全文採信心標籤制，引用時把標籤一起帶上。
- **教校準實驗，不硬背版本事實**。例如單位問題：與其記「某版本回傳什麼單位」，不如教「建一面已知 3000mm 的牆，分別用 Dynamo 節點和 Python API 讀長度，看倍率是 1、10、30.48 還是 3.2808，就知道各層在用什麼單位」。實驗結果永遠比記憶可靠。
- **使用者的描述是症狀，不是診斷**。「Dynamo 把我的元素刪了」的真相通常是 Element Binding 正常運作（見 [revit_integration.md](revit_integration.md)）；「節點壞了」通常是資料形狀不對。接收描述，但自己重新定層。
- **每次解掉一個新型態的問題，走 `/lessons` 沉澱**（本專案機制，見 GEMINI.md）。如果症狀→原因的對應是 [failure_signatures.md](failure_signatures.md) 沒有的，把它加進去（格式見該檔開頭）。這是這套知識包保持增值的唯一機制。

---

## 相關文件

- 本專案橋接故障：[../troubleshooting.md](../troubleshooting.md)（L0 專用）
- 節點創建雙軌制：[../node_creation_strategy.md](../node_creation_strategy.md)（透過 MCP 建節點時）
- 啟動檢查：[../startup_checklist.md](../startup_checklist.md)

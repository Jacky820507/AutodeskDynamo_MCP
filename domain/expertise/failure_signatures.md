---
description: Dynamo 故障特徵庫——症狀/警告原文 → 層 → 真因 → 修法 對照表（查表優先於推理）
version: 1.0
last_updated: 2026-07-08
author: Claude Fable 5（制度化 session，2026-07-08）
---

# Dynamo 故障特徵庫 (Failure Signatures)

> **用法**：拿到警告原文或症狀描述，先在這裡找。命中 → 直接用對應修法；沒命中 → 回 [consultant_playbook.md](consultant_playbook.md) 走完整診斷流程，**解掉之後把新特徵補進本表**。
>
> **新增格式**：加一列到對應層的表格。警告文字若是憑記憶改寫（非實際複製），前面加 `~` 標記。修法要具體到動作，不寫「檢查設定」這種空話。
>
> 警告訊息會因 Dynamo 版本/語言包不同而措辭略異——**用關鍵片段比對，不要求全文一致**。

---

## L2 資料形狀層（最高頻——沉默的錯誤結果幾乎都在這）

| 症狀 / 警告關鍵片段 | 真因 | 修法 |
|:--|:--|:--|
| `expects argument type(s) (Point, ...), but was called with (List<Point>, ...)` | 節點要單一項，卻餵進清單一整包 | 三選一：①`List.Flatten` 攤平 ②該輸入埠設 List@Level（`@L2` 等）③改 Lacing。詳見 [lists_lacing_levels.md](lists_lacing_levels.md) |
| 結果數量 = 輸入數量的乘積（例如 10×10=100 個，預期 10 個） | Lacing 被設成 Cross Product，或 DesignScript 用了 `<1><2>` replication guide | Lacing 改 Shortest/Auto；或兩清單改用同一個 replication guide `<1>` |
| 結果數量 = 較短清單的長度（尾巴被截掉） | 預設 Shortest lacing 把長清單多餘項丟掉 | 確認意圖：要一對一配對 → 補齊清單長度；要全組合 → Cross Product |
| 輸出巢狀層級比預期多一層（`[[x]]` 而不是 `[x]`） | 上游某節點對清單逐項操作後自動包了一層 | 用 `List.Flatten`(amt=1) 或在下游埠設 List@Level；不要無腦 Flatten 全攤（會毀掉有意義的分組） |
| 大量 `null` 混在結果裡，圖沒有紅色錯誤 | 上游部分項目運算失敗（除以零、幾何求交無解、查無元素），null 沿管線靜默傳播 | 往上游追第一個出現 null 的節點；用 `List.Clean`/`List.FilterByBoolMask` + `Object.IsNull` 定位是哪幾項、為什麼 |
| Watch 顯示 `Function` 而不是數值 | 節點有必填輸入埠沒接線 → 整個節點變成部分套用的函數往下傳 | 檢查該節點所有輸入埠，補上漏接的線（常見：改圖時刪了上游節點忘了重接） |
| `Dereferencing a non-pointer` | 對 null 做成員存取（上游傳來 null，本節點還想 `.X`、`.Name`） | 這是「null 傳播」的下游爆點——真兇在上游，用上一條的方法找 null 源頭 |

## L3 DesignScript / Code Block 層

| 症狀 / 警告關鍵片段 | 真因 | 修法 |
|:--|:--|:--|
| ~`使用大括號 {} 建立清單已棄用 / curly braces ... deprecated` | 用了 Dynamo 1.x 的清單語法 `{1,2,3}`（網路舊教學抄來的） | Dynamo 2.0+ 清單用方括號 `[1,2,3]`；`{}` 保留給 Dictionary |
| `Multiple definitions for 'Point' found` （或其他類名） | 多個已載入的組件都有同名類（DS Geometry 的 `Point` vs 某套件的 `Point`） | Code Block 裡寫完整命名空間：`Autodesk.DesignScript.Geometry.Point.ByCoordinates(...)` |
| Code Block 紅框、`;` 相關語法錯誤 | 每個敘述句要以 `;` 結尾；本專案 MCP 注入時漏分號是頭號錯誤 | 補分號。多行時每行都要 |
| Code Block 內想寫 if/for 失敗 | 關聯式 (Associative) 區塊不支援指令式流程控制 | 包 `[Imperative]{ ... }` 區塊，或改用 `ScopeIf`/內建三元運算 `cond ? a : b`，或乾脆用 Python 節點 |
| 範圍語法結果數量不對 | `0..10..2` 是「步長 2」，`0..10..#5` 是「取 5 個」——`#` 語意常被搞混 | 確認要步長還是個數；`0..#5..2` = 從 0 開始、5 個、間隔 2 |
| 改了上游數值，下游沒更新 | Run 模式是 Manual；或節點被 Freeze | 按 Run；解凍節點。（關聯式引擎正常時*會*自動傳播，「沒更新」幾乎都是這兩個原因） |

## L1/幾何層

| 症狀 / 警告關鍵片段 | 真因 | 修法 |
|:--|:--|:--|
| ~`geometry ... outside the current working range / 調整幾何縮放` | 座標數值太大或太小，超出幾何核心工作範圍（常見：mm 專案、Revit 共用座標動輒百萬） | Dynamo Settings → Geometry Scaling 調大（Large/Extra Large）；或把幾何平移到原點附近運算完再移回 |
| 布林運算 (`Solid.Union`/`Difference`) 偶爾失敗、結果為 null | 幾何 tolerance 問題：面剛好共面、邊剛好相切時求解不穩定 | 把其中一體微幅放大/平移（如 0.001）避開剛好共面；或改變運算順序、先 `Solid.ByUnion` 合併再減 |
| 極短曲線/極小面建立失敗 | 低於幾何核心最小容差（約 1e-5 級別，隨 scaling 設定變動） | 檢查輸入是否有退化幾何（起點=終點的線）；先過濾掉長度趨近 0 的項 |
| 圖跑完畫面沒東西 | 見 [consultant_playbook.md](consultant_playbook.md) §3 的 7 點檢查清單 | 同左 |

## L4 Python 節點層（引擎細節見 [python_engines.md](python_engines.md)）

| 症狀 / 警告關鍵片段 | 真因 | 修法 |
|:--|:--|:--|
| `NameError: name 'unicode' is not defined` / `print` 語法錯 | IronPython2 (Py2) 時代的腳本跑在 CPython3 上 | 走 py2→py3 遷移；速查表見 [python_engines.md](python_engines.md) §遷移 |
| `TypeError: No method matches given arguments for ...` | CPython3 (PythonNet) 的 .NET overload 解析比 IronPython 嚴格：int/float、單值/清單不再自動容錯 | 明確轉型：`int(x)`、`float(x)`；.NET 泛型清單用 `List[ElementId](py清單)`（`from System.Collections.Generic import List`） |
| `AttributeError: ... has no attribute 'ToDSType'`（或 `ToProtoType`） | `clr.ImportExtensions` 的擴充方法語法只在 IronPython 有效，CPython3 吃不到 | CPython3 改呼叫靜態類別（次級信心，類名請以當版驗證）：如 `Revit.Elements.ElementWrapper.ToDSType(elem, True)`；或該段邏輯改回 IronPython2 套件引擎 |
| Python 節點黃色，訊息含 C# 例外堆疊而非 Python traceback | 例外發生在 .NET 邊界（API 呼叫本身），不是你的 Python 邏輯 | 讀堆疊最內層的 Revit API 例外類型；常見是交易未開（見 L5 表） |
| 節點跑很慢（數千項迴圈） | 跨 Python↔.NET 邊界的逐項 marshaling 成本高，CPython3 尤甚【次級】 | 減少邊界往返：能用原生節點/DS 向量化的別在 Python 逐項跑；批次收集後一次丟回 OUT |
| `IN[1]` 出現 IndexError | 節點輸入埠數量不足 | UI：按節點上的 `+`；本專案 MCP：JSON 加 `inputCount` 欄位（見 [../mcp_tools.md](../mcp_tools.md)） |

## L5 Revit 整合層（機制詳解見 [revit_integration.md](revit_integration.md)）

| 症狀 / 警告關鍵片段 | 真因 | 修法 |
|:--|:--|:--|
| 「Dynamo 把我之前建的元素刪了/動了」 | **Element Binding**：.dyn 存了上次執行建立的元素 ID，重跑=更新/取代而非新建。這是設計行為不是 bug | 理解意圖後二選一：要「每次跑都新建」→ 清除 bindings；要「重跑=更新」→ 維持現狀。操作見 [revit_integration.md](revit_integration.md) §binding |
| 複製了一份 .dyn，跑複本後原本的元素消失 | 複本帶著同一份 binding，「接管」了原檔建立的元素 | 複製 .dyn 給別人/別的用途前先清 bindings |
| `The referenced object is not valid, possibly deleted` | 圖裡的 Select 節點記著的元素已被刪，或換了文件 | 重新選取元素；跨文件重用的圖不要用硬選取，改用類別+條件過濾收集 |
| 數值差 30.48 倍（或 3.2808、12、10 倍） | 單位層級混用：Revit API 內部長度單位是英尺，Dynamo 節點層與專案顯示單位不同 | 30.48=呎↔cm、3.2808=米↔呎、12=呎↔吋。用校準實驗定位哪一層在用什麼單位（[revit_integration.md](revit_integration.md) §units），Python 層用 `UnitUtils.ConvertFromInternalUnits` |
| Python 改模型時 ~`Attempt to modify the model outside of transaction` | Revit 寫入必須在交易內 | Python 節點內：`TransactionManager.Instance.EnsureInTransaction(doc)` … 完成後 `TransactionTaskDone()`（模板見 [python_engines.md](python_engines.md)） |
| 只在 Revit 內壞、Sandbox 正常 | 問題必在 Revit 整合層：binding、單位、交易、文件上下文四選一 | 依 [revit_integration.md](revit_integration.md) 逐項排除 |

## L6 環境 / 版本 / 套件層（生態全景見 [version_landscape.md](version_landscape.md)）

| 症狀 / 警告關鍵片段 | 真因 | 修法 |
|:--|:--|:--|
| 節點變虛線框、名稱旁「Unresolved」/ 開檔警告缺少套件 | 這台機器沒裝圖裡用到的套件（或版本不同） | 開檔警告會列出缺哪些套件+版本；Package Manager 補裝同版。**先問「這圖在別台機器做的嗎」可秒定位** |
| 換 Revit 版本後 Python 節點全黃 | 引擎斷代：舊圖用 IronPython2，新環境預設 CPython3 且未裝 IronPython2 套件 | 裝「IronPython2 Extension」套件（Dynamo 2.7+/3.x 適用，次級信心）維持舊行為，或做 py3 遷移 |
| 裝了兩個套件後 Dynamo 行為怪異/啟動報 DLL 錯 | 兩套件夾帶同一 DLL 的不同版本（Newtonsoft.Json 是慣犯），先載入者贏 | 二分法：移除一半套件測試，定位衝突對；擇一保留或找相容版本。套件目錄：`%AppData%\Dynamo\Dynamo Revit\<版本>\packages` |
| 圖在 Dynamo 2.x 正常、3.x 開不起來或節點大量失效 | 3.x 換 .NET 8，2.x 時代的 Zero-Touch 套件 DLL 不相容需重編 | 查該套件是否已出 3.x 版；沒有 → 找替代套件或降版使用。對照表見 [version_landscape.md](version_landscape.md) |
| Custom Node 用名稱建立失敗（本專案 MCP） | Dynamo 內部名稱解析不穩，只有 GUID 可靠 | 用 GUID 當 `name`（本專案已驗證教訓，見 [node-creation-guid.md](../../memory-bank/lessons/node-creation-guid.md)） |

## L0 橋接層（本專案 MCP 驅動時）

連線失敗、幽靈連線、多程序衝突 → [../troubleshooting.md](../troubleshooting.md)。
一條經驗法則放這裡：**「指令回報成功 + 畫面沒變化」永遠先懷疑 L0（幽靈連線/session 路由），再懷疑圖本身**。

---

## 維護規則

- 本表只收「已驗證」的特徵：實際遇過、修法確認有效。理論上可能的坑不要進表。
- 單一表格超過 15 列時考慮拆出獨立檔案（如某層知識爆炸成長），並回 [consultant_playbook.md](consultant_playbook.md) 更新路由。
- 憑記憶寫的警告文字標 `~`；之後有人拿到實際原文時把 `~` 換成精確文字。

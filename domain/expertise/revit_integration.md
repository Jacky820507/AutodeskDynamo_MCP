---
description: Dynamo × Revit 整合深度知識——Element Binding、單位校準法、交易、座標範圍、跨文件圖設計
version: 1.0
last_updated: 2026-07-08
author: Claude Fable 5（制度化 session，2026-07-08）
---

# Revit 整合知識庫

> 只在 Revit 內發生、Sandbox 重現不了的問題，答案幾乎都在這四件事裡：**Element Binding、單位、交易、座標範圍**。

信心標籤同 [python_engines.md](python_engines.md)：【確認】/【次級】/【未確認】。

---

## 1. Element Binding（元素綁定）——「Dynamo 刪了我的元素」的真相

### 機制【確認】

- Dynamo 在 Revit 內建立元素（`Wall.ByCurveAndHeight` 等）時，會把「這個節點 ↔ 建出來的元素 ID」的對應（trace 資料）記在圖裡；**存 .dyn 檔時一併序列化進檔案**。
- 效果：**重跑 = 更新/取代上次建立的元素，而不是再建一份**。這是刻意設計——讓「調參數重跑」不會堆出一萬面牆。

### 由此推出的所有詭異症狀【確認】

| 症狀 | 解釋 |
|:--|:--|
| 重跑後舊元素「被刪/被移動」 | binding 正常運作：舊的被新結果取代 |
| 複製 .dyn 給同事/另存新檔，跑複本 → **原檔建立的元素消失** | 複本帶著同一份 binding，接管並取代了原本的元素。**這是最坑人的一條** |
| 換一個 Revit 文件跑同一張圖 → 建了新元素，原文件不受影響 | binding 綁的元素在目前文件裡找不到 → 退回「新建」行為 |
| 期望每跑一次多一組元素，卻永遠只有一組 | binding 的「取代」行為與使用者的「累加」期望相反 |
| 手動改過 Dynamo 建的元素，重跑後修改消失 | 元素被 binding 重建/更新，手動修改被覆寫 |

### 顧問處方

1. **先問意圖**：「你希望重跑是更新既有元素，還是每次都建新的？」——binding 對前者是功能、對後者是 bug。
2. 要「每次新建」或要安全分發 .dyn → **清除 bindings**。做法（可靠度排序）：
   - .dyn 是 JSON：文字編輯器開啟，把 `"Bindings": [...]` 陣列清成 `[]` 後存檔【次級：欄位名以實際檔案為準，開檔搜 `Bindings` 即見】。
   - 用管理套件的 bindings 清除節點（如 Crumple、archi-lab 系工具【次級：功能歸屬套件名】）。
   - 跑完**不存檔**就關圖 → binding 不會寫回 .dyn【確認】。
3. **Dynamo Player 執行的圖不會把 binding 寫回檔案**（Player 不存 .dyn）→ 每次執行都是新建【次級：跨版本行為請實測】。給終端使用者的「每次跑都要產出新東西」型工具，發佈到 Player 是天然解法。
4. 團隊分發規範：**進版控/範本庫的 .dyn 一律先清 bindings**。

## 2. 單位——「差 30.48 倍」家族

### 不變的事實【確認】

- **Revit API 內部長度單位是十進位英尺**（角度是弧度）。Python 節點直接呼叫 API 拿到的長度就是英尺。
- Dynamo 節點層（`Element.GetParameterValueByName` 等）與 API 層用的單位**不保證一致**，且跨版本有變動歷史【確認有變動；各版本行為屬次級】。
- 倍率指紋：**30.48**=呎↔公分、**3.2808**=公尺↔呎、**12**=呎↔吋、**304.8**=呎↔mm。看到這些倍率 = 單位層級混用，不是幾何算錯。

### 校準實驗（永遠比背版本事實可靠）

1. 在 Revit 建一面已知長度的牆（如 3000mm）。
2. 同一參數分別用 ①Dynamo 節點讀 ②Python API `get_Parameter(...).AsDouble()` 讀。
3. 對照倍率指紋，10 秒鐘確定「這個版本、這個專案裡，每一層各用什麼單位」。之後所有換算都建立在實測上。

### 換算的正規做法（Python 層）【確認】

```python
from Autodesk.Revit.DB import UnitUtils, UnitTypeId   # Revit 2021+ 用 ForgeTypeId 體系
mm = UnitUtils.ConvertFromInternalUnits(feet_val, UnitTypeId.Millimeters)
ft = UnitUtils.ConvertToInternalUnits(3000, UnitTypeId.Millimeters)
```
（Revit ≤2020 是 `DisplayUnitType.DUT_MILLIMETERS` 舊體系【確認】——跨版本腳本要雙軌 try/except。）

## 3. 交易（Transactions）

規則已在 [python_engines.md](python_engines.md) §3：讀不用交易、寫必須 `TransactionManager.Instance.EnsureInTransaction(doc)`、不要自建 `Transaction`。此處補兩條【確認】：

- **Dynamo 整張圖共用一個交易上下文**；Python 節點裡 `TransactionTaskDone()` 不是 commit，是「我這段做完了」。真正寫進模型可能在圖執行結束才落地。
- 需要「先建元素、馬上讀它的計算結果」（如建牆後立刻讀面積）時，中間插 `TransactionManager.Instance.ForceCloseTransaction()` 再重開，或 `doc.Regenerate()`【次級：依場景實測】。症狀是「讀到的都是上一輪的舊值/null」。

## 4. 座標與幾何工作範圍

- Revit 有三個原點體系：**內部原點、專案基準點、測量點**。Dynamo 幾何預設對齊內部原點【確認】。
- 模型套用共用座標後，元素座標動輒數十萬（mm 專案更大）→ 超出 Dynamo 幾何核心工作範圍 → 曲線/布林運算失敗、預覽消失。修法見 [failure_signatures.md](failure_signatures.md) §幾何（Geometry Scaling / 平移回原點運算）。
- 跨檔連結 (Link) 元素的幾何要先經座標變換（`Transform`）才會落在正確位置——直接取幾何會落在連結檔自己的內部座標【確認】。BimorphNodes 對 Link 元素處理有成熟節點。

## 5. 跨文件可重用圖的設計紀律（顧問級建議）

給「要交付給別人用的圖」的規範，違反任一條都會產生「在我機器上明明能跑」：

1. **不用硬選取**（`Select Model Element`）——換文件就失效。改用「類別+參數條件」收集（`Categories` + `All Elements of Category` + Filter）。
2. **不假設單位**——關鍵數值輸入處註明單位，內部用 §2 校準法確認。
3. **清 bindings 再分發**（§1）。
4. **列出套件相依**——圖面上放一個 Note 節點寫明「需要：Data-Shapes 2022.x, Clockwork 2.x」。開檔缺件警告只有第一次會看到，Note 是永久的。
5. **終端使用者用 Dynamo Player + Data-Shapes 表單**，不要期待他們開圖操作。

## 相關文件

- Python 模板與引擎：[python_engines.md](python_engines.md)
- 特徵速查：[failure_signatures.md](failure_signatures.md) §L5
- 版本矩陣：[version_landscape.md](version_landscape.md)

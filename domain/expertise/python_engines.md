---
description: Dynamo Python 節點深度知識——IronPython2 vs CPython3、Revit API 模板、遷移對照（含信心標籤）
version: 1.0
last_updated: 2026-07-08
author: Claude Fable 5（制度化 session，2026-07-08）
---

# Python 引擎知識庫

> **一句話總綱**：Dynamo 的 Python 節點不是「一種 Python」，是**兩個行為不同的引擎**（IronPython2 / CPython3-PythonNet）。大量網路教學與舊圖是 IronPython2 寫的，新環境預設 CPython3——**引擎斷代是 Python 節點問題的第一嫌疑人**，先確認引擎再看代碼。

信心標籤：【確認】= 生態長期穩定事實；【次級】= 大方向正確但版本細節可能漂移，引用前建議實測；【未確認】= 傳聞級。

---

## 1. 先確認引擎（10 秒鐘）

節點內跑這段，任何引擎都能跑：

```python
import sys
OUT = sys.version   # "2.7.x ..." = IronPython2；"3.x.x ..." = CPython3
```

UI 上：Python 節點右下角有引擎下拉選單（約 Dynamo 2.7+【次級：確切版號】）。本專案 MCP 注入的節點**由 C# 端自動設為 CPython3**（見 [../python_script_automation.md](../python_script_automation.md)）。

## 2. 引擎時間線【確認，個別版號屬次級】

| 環境 | 預設引擎 | 備註 |
|:--|:--|:--|
| Dynamo ≤2.6（Revit ≤2021） | IronPython2 | 內建，無 CPython 選項 |
| Dynamo 2.7–2.19（Revit 2022–2024） | CPython3 | IronPython2 抽離成選裝套件「IronPython2 Extension / DynamoIronPython2.7」【次級：確切抽離版本】 |
| Dynamo 3.x（Revit 2025+） | CPython3（PythonNet 3） | 平台換 .NET 8；PythonNet 2→3 的 interop 行為又有細部變化【次級】。社群另有 IronPython3 套件【次級】 |

**顧問含義**：使用者說「圖是舊同事留下來的」「從論壇抄的」→ 預設假定那是 IronPython2 代碼，遷移表見 §5。

## 3. Revit API 標準模板（放進 Python 節點就能用）

```python
import clr

# --- Revit API 與 Dynamo 服務 ---
clr.AddReference('RevitAPI')
from Autodesk.Revit.DB import *

clr.AddReference('RevitServices')
from RevitServices.Persistence import DocumentManager
from RevitServices.Transactions import TransactionManager

doc = DocumentManager.Instance.CurrentDBDocument

# --- 輸入：Dynamo 包裝元素 → 原生 API 元素 ---
elems = UnwrapElement(IN[0])          # UnwrapElement 兩引擎都內建可用
if not isinstance(elems, list):
    elems = [elems]

# --- 寫入模型必須開交易 ---
TransactionManager.Instance.EnsureInTransaction(doc)
results = []
for e in elems:
    # ... 對 e 做事 ...
    results.append(e)
TransactionManager.Instance.TransactionTaskDone()

OUT = results
```

**契約要點**【確認】：
- 輸入一律 `IN[0]`, `IN[1]`…；輸出一律賦值給 `OUT`。沒有 return。
- **讀模型不用交易，寫模型必須在 `EnsureInTransaction`…`TransactionTaskDone()` 之間**。忘了開交易 → 「modify the model outside of transaction」例外。
- **不要自己 new `Transaction` 再 Start/Commit**——Dynamo 有自己的交易管理，混用會衝突；一律走 `TransactionManager`。
- 元素進出的包裝轉換：
  - API → Dynamo：IronPython 用 `elem.ToDSType(True)`（需先 `clr.AddReference('RevitNodes'); import Revit; clr.ImportExtensions(Revit.Elements)`）。
  - **CPython3 下 `clr.ImportExtensions` 無效**（擴充方法語法是 IronPython 特性）【確認】→ 改呼叫靜態類：`Revit.Elements.ElementWrapper.ToDSType(e, True)`【次級：確切類名，當版實測】。幾何轉換同理（`Revit.GeometryConversion` 一族）。
- .NET 泛型集合：API 要 `ICollection<ElementId>` 時，Python list 不會自動轉——
  ```python
  from System.Collections.Generic import List
  ids = List[ElementId]([e.Id for e in elems])
  ```

## 4. CPython3 (PythonNet) 專屬地雷【確認，除非另標】

| 地雷 | 說明 | 對策 |
|:--|:--|:--|
| Overload 解析嚴格 | `TypeError: No method matches given arguments`——IronPython 會寬鬆湊合 int/float/枚舉，PythonNet 不會 | 顯式轉型 `int()`/`float()`；枚舉用完整成員不要用數字 |
| 擴充方法不可用 | `ToDSType`/`ToProtoType`/`ToXyz` 這類語法糖全滅 | 見 §3 靜態類呼叫 |
| 實作 .NET 介面/事件困難 | `IExternalEventHandler`、委派訂閱等在 PythonNet 限制多【次級】 | 這類需求建議升級到 C#/pyRevit，不要在 Dynamo Python 節點裡硬撐 |
| 邊界 marshaling 慢 | 幾千次迴圈、每圈都碰 .NET 物件 → 明顯變慢【次級】 | 批次化；純數值運算留在 Python 原生型別；或改原生節點/DS |
| 整數除法 | `/` 恆回傳 float，API 要 int 的參數會炸 | `//` 或 `int()` |
| 全域狀態隔離 | CPython3 節點間的 import/全域變數隔離行為與 IronPython 不同【次級】 | 每個節點自包含，不依賴跨節點狀態 |

## 5. IronPython2 → CPython3 遷移速查

| Py2 寫法 | Py3 改法 |
|:--|:--|
| `print "x"` | `print("x")` |
| `unicode(s)` / `basestring` | `str(s)` / `str` |
| `dict.iteritems()` | `dict.items()` |
| `xrange` | `range` |
| 隱式 ASCII 字串 | 全是 unicode，檔案 IO 明確給 `encoding=` |
| `clr.ImportExtensions(...)` + `.ToDSType()` | 靜態類呼叫（§3） |
| 寬鬆 overload | 顯式轉型（§4） |

**遷移決策**：只有 10 行的舊腳本 → 直接遷移。幾百行、大量 interop 的舊腳本 → 先評估裝 IronPython2 套件維持原引擎是否更划算（部署成本：每台機器要裝套件）。**把這個 trade-off 告訴使用者，讓他選。**

## 6. 什麼時候不該用 Python 節點

- 原生節點 3 個內能解 → 用原生節點（可讀性、可維護性、效能全贏）。
- 需要 UI/表單 → Data-Shapes 套件。
- 需要事件、外部命令、大型工具 → pyRevit 或 C# add-in。Dynamo Python 節點的定位是「圖裡的膠水」，不是應用程式容器。

## 相關文件

- 本專案 Python 節點注入機制：[../python_script_automation.md](../python_script_automation.md)（MCP 三重保障、inputCount）
- 特徵速查：[failure_signatures.md](failure_signatures.md) §L4
- 版本矩陣：[version_landscape.md](version_landscape.md)

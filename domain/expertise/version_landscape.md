---
description: Dynamo 版本地景與套件生態——斷代史、相容性矩陣、套件選型指南（全文信心標籤制）
version: 1.0
last_updated: 2026-07-08
author: Claude Fable 5（制度化 session，2026-07-08）
---

# 版本地景與套件生態

> **為什麼 AI 特別需要這份**：AI 的訓練資料混雜了 Dynamo 十年來所有版本的教學文章，不標年代。你「記得」的節點名、語法、行為可能來自任何一個年代。這份文件給你斷代坐標系——回答任何版本相關問題前，先定位使用者在哪個年代，再過濾你的記憶。
>
> 信心標籤：【確認】/【次級】/【未確認】。**編輯本檔時不得移除信心標籤**（規則同 `~/.claude/docs/model-reference.md`）。

---

## 1. 三個斷代（背下來）

| 斷代 | 版本 | 關鍵變化 | 對顧問的含義 |
|:--|:--|:--|:--|
| **Dynamo 1.x** (~2017 前) | 1.0–1.3 | 清單語法 `{}`、無 List@Level、UI 完全不同 | 網路最舊教學來自這年代；`{}` 清單語法在 2.x+ 是語法錯誤【確認】 |
| **Dynamo 2.x** (2018–2024) | 2.0–2.19 | 清單改 `[]`、List@Level、.dyn 改 JSON 格式（1.x 是 XML，2.x 開不回 1.x）【確認：官方 wiki，2026-07-08 查證】、約 2.7+ 引入 CPython3【次級：確切版號】 | 生態主體。大部分套件、教學、論壇答案屬於這年代 |
| **Dynamo 3.x/4.x** (2024+，Revit 2025+) | 3.0+ | 平台換 **.NET 8**【確認】→ 2.x 時代 Zero-Touch 套件 DLL 需重編才能用【確認】；PythonNet 3【次級】；UI 翻新【次級】 | 「升級 Revit 2025 後套件全掛」的根因。查套件是否已出 3.x 版是第一動作 |

## 2. Revit ↔ Dynamo 版本對照（本專案已實測【確認】）

| Revit | Dynamo【確認】 | Python 預設【次級，除標註】 | .NET【次級，除標註】 |
|:--|:--|:--|:--|
| 2020 | 2.3 | IronPython2 | Framework 4.x |
| 2021 | 2.6 | IronPython2 | Framework 4.x |
| 2022 | 2.10 | CPython3（IP2 改選裝）【次級：斷點確切位置】 | Framework 4.x |
| 2023 | 2.13 | CPython3 | Framework 4.x |
| 2024 | 2.19 | CPython3 | Framework 4.8 |
| 2025 | 3.0 | CPython3 (PythonNet3) | **.NET 8**【確認】 |
| 2026 | 3.4 | CPython3 | .NET 8【次級】 |
| 2027 | 4.0 | CPython3 | .NET 10【次級：本專案部署經驗——4.x 建置需 .NET 10 SDK，見根目錄 README】 |

（Revit↔Dynamo 對應版號取自本專案 README 的實測表【確認】；Python/.NET 欄位除標註者外為生態常識【次級】。）

**Dynamo 一年多版**：Revit 大版本內的更新（如 2024.1、2024.2）也會升 Dynamo 小版本，行為可能微變。問版本要問到小數點：「Help → About 的完整版號」。

## 3. 套件生態選型表【確認：定位；次級：維護現況會漂移】

| 套件 | 定位 | 顧問備註 |
|:--|:--|:--|
| **Clockwork** | 瑞士刀型工具集（元素、清單、文件操作） | Custom Node (.dyf) 為主 → 可打開看內部學做法；跨版本相容性好 |
| **archi-lab (Grimshaw)** | Revit API 深度封裝（視圖、圖紙、參數、選集） | Zero-Touch 為主 → 3.x 需對應版本 |
| **Data-Shapes** | 使用者輸入表單 UI | Dynamo Player 工具的標配；給終端使用者的圖幾乎必配 |
| **BimorphNodes** | 碰撞檢測、CAD/Link 元素處理 | Link 幾何座標變換的首選 |
| **Rhythm** | Revit 雜項工具（作者 John Pierson） | 更新勤快，3.x 支援快 |
| **Genius Loci** | MEP 與通用 API 節點 | MEP 案子常備 |
| **Springs (SpringNodes)** | 幾何↔元素轉換（`FamilyInstance.ByGeometry` 等） | 「把 Dynamo 幾何變成真 Revit 元素」的經典解 |
| **MeshToolkit** | 網格運算（Autodesk 官方） | 處理掃描/mesh 資料 |
| **LunchBox** | 幾何 pattern、資料工具 | Grasshopper 血統 |
| **Orchid** | 族群文件 (Family) 批次操作 | **不在官方 Package Manager 上架，GitHub 手動安裝**【次級】——部署成本高，選用前告知使用者 |
| **TuneUp** | 圖執行時間剖析（Autodesk 出品【次級】） | 效能問題的第一工具：找出最慢的節點 |
| **Monocle** | 圖面整理 UI 工具 | 開發者 QoL |

選型鐵律（同 [consultant_playbook.md](consultant_playbook.md) §2）：OOTB 能做就不用套件；要用就挑表內這種有信譽的；**每加一個套件 = 團隊每台機器多一個部署相依 + 一個版本升級風險**，這句話要說給使用者聽。

## 4. 節點命名慣例（用來「猜」節點名，配合 `search_nodes` 驗證）

- 格式：`類別.By建構方式`（建立）/ `類別.屬性`（查詢）/ `類別.動詞`（操作）【確認】。
  - `Point.ByCoordinates`、`Curve.PointAtParameter`、`Surface.ByLoft`、`Element.SetParameterByName`。
- Revit 元素類多在 `Revit.Elements` 命名空間；DS 幾何在 `Autodesk.DesignScript.Geometry`【確認】。兩邊都有 `Point`/`Curve` 概念——**Dynamo 幾何與 Revit 元素是兩個世界，靠 `ToProtoType`/元素建立節點互轉**。
- 本專案情境：先 `search_nodes` 驗證存在與簽名，再放置；Custom Node 用 GUID（見 [node-creation-guid.md](../../memory-bank/lessons/node-creation-guid.md)）。

## 5. 權威資訊源（AI 查證用）

| 來源 | 用途 |
|:--|:--|
| Dynamo Primer (primer.dynamobim.org) | 官方教材，概念級 |
| Dynamo Dictionary (dictionary.dynamobim.com) | 節點簽名速查 |
| forum.dynamobim.com | 實戰問題第一寶庫；搜錯誤訊息原文命中率高 |
| DynamoDS GitHub (DynamoDS/Dynamo) | 版本 release notes、已知 issue |
| The Building Coder / Revit API Docs (revitapidocs.com) | Revit API 層問題 |

**查證紀律**：版本行為有疑義且有網路工具可用時，先搜 release notes/論壇再回答；不可用時，明示信心等級並給校準實驗（見 [revit_integration.md](revit_integration.md) §2 的方法論）。

## 維護規則

- 新 Revit/Dynamo 版本發布或本專案實測新版本後，更新 §2 表格並升級信心標籤。
- 套件表的「維護現況」類陳述每年至少覆核一次（看 Package Manager 最後更新日）。
- **不得移除信心標籤**；把【次級】升【確認】需附上驗證方式（實測或官方文件）。

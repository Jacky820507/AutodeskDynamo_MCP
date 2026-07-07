---
description: Dynamo 清單結構、Lacing、List@Level 完整心智模型——「結果數量/結構不對」類問題的根治知識
version: 1.0
last_updated: 2026-07-08
author: Claude Fable 5（制度化 session，2026-07-08）
---

# 清單、Lacing 與 List@Level

> **為什麼這份文件存在**：Dynamo 是資料流語言，每條線上流的都是「任意深度的巢狀清單」。節點如何把「期望單一項的函數」套用到「一整包清單」上，由 Lacing 與 List@Level 決定。**這是 Dynamo 與一般程式語言最大的心智模型差異**，也是沉默錯誤（不報警告、結果卻錯）的最大來源。AI 讀者先建立 §1 的模型，再背 §4 的處方。

---

## 1. 核心心智模型：Replication（複製套用）

一個節點的函數簽名要 `f(item)`，你餵它 `[a, b, c]`，Dynamo 不會報錯——它自動變成 `[f(a), f(b), f(c)]`。這叫 replication，**是隱式的、自動的**。

由此推得三條定律：

1. **輸出的巢狀深度 ≈ 輸入比函數預期「多出來」的層數**。餵二維清單給要單項的節點 → 輸出也是二維。
2. **兩個以上輸入都超深時，需要配對規則**——這就是 Lacing：
   - **Shortest（預設/Auto）**：拉鏈式一對一，短的用完就停。`[a,b,c] + [1,2]` → `[a1, b2]`。
   - **Longest**：拉鏈式，短清單的**最後一項重複**補齊。`[a,b,c] + [1,2]` → `[a1, b2, c2]`（短清單的 `2` 重複配給 `c`）。
   - **Cross Product**：全組合笛卡兒積。`[a,b,c] × [1,2]` → `[[a1,a2],[b1,b2],[c1,c2]]`（輸出多包一層！）。
3. **Cross Product 會讓輸出深度 +1**。網格/矩陣類需求要它；但誤開它就是「結果數量爆炸」的來源。

DesignScript 對應語法（Code Block 內）：

```
// replication guide：同號=拉鏈，異號=笛卡兒
Point.ByCoordinates(xs<1>, ys<1>, 0);   // 拉鏈：n 個點
Point.ByCoordinates(xs<1>, ys<2>, 0);   // 笛卡兒：n×m 網格點
```

## 2. List@Level：指定「函數作用在哪一層」

Lacing 管「多輸入怎麼配對」，List@Level 管「單一輸入要下潛到第幾層才算一個 item」。

- 層級**從最裡面數**：最深的單項是 `@L1`，包它的清單是 `@L2`，再外層 `@L3`……最外層整包就是最大的 `Ln`。UI 只提供正數層級，沒有負數。（官方 Primer 原文：「The list Levels are organized in reverse order so that the lowest level data is always in 'L1'.」——2026-07-08 查證）
- 操作：點節點輸入埠旁的 `>` 展開 → 勾 Use Levels → 選 `@L#`。
- **Keep list structure**：勾了以後輸出保留輸入的巢狀分組，不勾則 Dynamo 可能自動攤平一層。要維持「按樓層分組」這類語意結構時必勾。

**典型場景**：`List.GetItemAtIndex` 想拿「每個子清單的第 0 項」而不是「整包的第 0 個子清單」→ list 輸入設 `@L2`。

## 3. 常用清單手術刀（節點速查）

| 需求 | 節點 / DS | 備註 |
|:--|:--|:--|
| 攤平一層 | `List.Flatten`（amt=1） | **預設 amt=-1 是全攤平**，會毀掉分組語意，慎用 |
| 加深一層 | `List.Chop` / `List.GroupByKey` | Chop 按固定長度切；GroupByKey 按鍵分組 |
| 轉置（行↔列） | `List.Transpose` | 網格點結構調整的標配 |
| 過濾 | `List.FilterByBoolMask` | 搭配任何布林節點；`in`/`out` 兩個輸出都能用 |
| 逐項配對映射 | `List.Map` / `List.Combine` | 2.x 之後多數場景被 List@Level 取代，但老圖常見 |
| 查結構 | `List.Count` + `Watch` | **除錯第一步永遠是接 Watch 看實際結構**，不要用猜的 |
| 找 null | `Object.IsNull` → FilterByBoolMask | 定位沉默失敗的哪幾項 |
| 去 null | `List.Clean`（preserveIndices=false） | 注意：清掉 null 後索引會位移，後續按索引配對會錯位 |

## 4. 症狀 → 處方（比 failure_signatures 更細的本層專用表）

| 症狀 | 診斷 | 處方 |
|:--|:--|:--|
| 預期 n 個結果，得到 n×m | Cross Product 誤開，或 DS `<1><2>` | Lacing 改 Auto/Shortest |
| 預期 n×m 網格，只得到 min(n,m) | 該開 Cross 沒開 | Lacing 改 Cross Product，或 `<1><2>` |
| 結果少了幾項 | Shortest 截斷 | 檢查兩輸入長度是否本來就該相等——不等通常代表上游過濾器把某些項殺掉了，回上游對齊 |
| 巢狀多一層 | 上游 replication 或 Cross | 下游埠設 @L，或 Flatten(1)。**優先 @L**：它不破壞結構，Flatten 是不可逆的資訊丟失 |
| 「作用到子清單」變成「作用到整包」 | 缺 List@Level | 輸入埠設 @L2（或實際目標層），勾 Keep list structure |
| 每組內部順序對，組間錯位 | 兩條資料流的分組方式不一致（一邊按樓層分、一邊平的） | `List.Transpose` 或重建分組，讓兩邊結構同構後再進節點 |
| null 疫情 | 上游某節點部分項失敗 | IsNull 過濾定位 → 修上游真因，**不要直接 List.Clean 眼不見為淨**（數量錯位會在更下游炸） |

## 5. 給 AI 的除錯紀律

1. **每次懷疑資料形狀，先在病灶節點的每個輸入接 Watch**（本專案 MCP 情境：用 `analyze_workspace` 讀節點輸出摘要，或臨時建 Watch 節點）。看到實際結構後，90% 的問題不辯自明。
2. **報告結構要用「深度×各層數量」描述**：說「2 層：4 組×各 25 點」，不要說「一堆點的清單」。
3. **修復優先序：List@Level > Lacing > Flatten/Chop 手術 > List.Map**。越前面的越宣告式、越不破壞語意。
4. 建圖時（本專案 MCP 建圖情境）**主動避免製造問題**：需要網格就明寫 Cross/`<1><2>` 並在報告中說明預期數量（n×m=多少），跑完用實際數量驗證。數量對不上 = 立刻停下重查，不要繼續往下建。

## 相關文件

- 特徵速查：[failure_signatures.md](failure_signatures.md) §L2
- 診斷總流程：[consultant_playbook.md](consultant_playbook.md)

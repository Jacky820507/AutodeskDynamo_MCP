# CLAUDE.md — 本專案給 Claude Code 的路由索引（薄檔，內容不放這裡）

本專案的 AI 行為規範主檔是 **[GEMINI.md](GEMINI.md)**（歷史命名，實際適用所有 AI client，包含 Claude）。Claude Code 不會自動載入 GEMINI.md，所以由本檔負責路由。

## 開始任務前（依序執行）

1. **Read [GEMINI.md](GEMINI.md)**——指令定義（/lessons、/save、/image…）、四條鐵律、自我審查清單都在那裡。
2. **Read `memory-bank/activeContext.md` 與 `memory-bank/progress.md`**——恢復專案上下文的唯一來源。
3. 要操作 Dynamo 時，先執行 `analyze_workspace` 確認連線與 Session（防幽靈連線）。

## 問題路由

| 你遇到的是 | 去讀 |
|:---|:---|
| 任何 Dynamo 領域問題（圖邏輯、Python、Revit、版本） | [domain/expertise/consultant_playbook.md](domain/expertise/consultant_playbook.md) → 依七層模型定位後按其路由 |
| 有明確警告訊息/症狀 | [domain/expertise/failure_signatures.md](domain/expertise/failure_signatures.md)（查表優先於推理） |
| MCP 橋接連不上、指令成功但畫面沒反應 | [domain/troubleshooting.md](domain/troubleshooting.md) |
| 要透過 MCP 建節點/連線/注入 Python | [domain/node_creation_strategy.md](domain/node_creation_strategy.md)、[domain/mcp_tools.md](domain/mcp_tools.md) |

## 本專案最容易犯的四個錯（詳見 GEMINI.md，這裡只留提醒）

1. 沒讀 Memory Bank 就動手。
2. 指令回報成功就以為畫面正確——必須用 `analyze_workspace` 驗證。
3. 不查 `DynamoScripts/` 腳本庫就重複造輪子（復用優先）。
4. 要求使用者放置 StartMCPServer 節點——一律改用 Dynamo 選單 `BIM Assistant`。

## 維護規則

- 本檔只做路由，超過 60 行就該精簡；新知識寫進 `domain/`（SOP/領域知識）或 `memory-bank/lessons/`（教訓），不要寫在這裡。
- `domain/expertise/` 各檔案內含自己的維護規則（信心標籤不可移除、特徵表只收已驗證案例）。

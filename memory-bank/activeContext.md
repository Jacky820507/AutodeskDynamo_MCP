# 當前工作焦點

> **最後更新**: 2026-06-26

## 📍 當前狀態
- **版本**:
| 版本 | 日期 | 狀態 |
|:---|:---|:---|
| v3.5 | 2026-03-02 | ✅ 已發布 (UI Enhancement & Startup Fix) |
| v3.6 | 2026-04-27 | ✅ 已完成 (Python Path Config & Error Guidance) |
| v3.7 | 2026-06-21 | ✅ 已完成 (Mermaid Skill 可讀性與三模式強化) |

- **主要工作**: **v3.8 效能優化與外掛 GUID 映射** - 正在驗證 `create_group` 在大型圖表下的表現，並維護系統啟動的穩健性與跨 Revit 版本安裝對映。

## 🎯 近期決策

| 日期 | 決策 | 結果 |
|:---|:---|:---|
| 2026-03-02 | 修復 MODULE_NOT_FOUND | 透過 `npm install --force` 恢復缺失的 dist 資料夾，並修正 import 路徑 |
| 2026-03-02 | 仿 Revit MCP UI | 為工具清單加入編號與優化描述，提升 AI Client 端的按鈕式體驗 |
| 2026-03-02 | 修復連線逾時 Bug | 將 `cleanup_stale_sessions` 預設值由 30s 提高至 300s |
| 2026-04-27 | 修復 Python 啟動錯誤 | 在 mcp_config.json 加入 python_path 配置，並優化 9009 錯誤引導 |
| 2026-06-21 | Mermaid 圖表模式化 | `generate_workspace_mermaid` 新增 `mode`（`pipeline`/`semantic`/`detail`），預設 `pipeline` |
| 2026-06-21 | 可讀邏輯圖修正 | Pipeline 改以階段語意輸出，避免僅列出節點連線；預設方向改 `TD` |
| 2026-06-21 | 連線可讀性修正 | 以 stage rank過濾反向邊，解決循環邊造成的線段混亂 |
| 2026-06-21 | 工程化工具補齊 | 新增 `tools/generate_mermaid_artifacts.py`，支援生成/驗證/轉圖 |

## 🔄 進行中任務
- [x] 修復 MCP Server 啟動錯誤 (v3.5)
- [x] 工具清單介面優化 (v3.5)
- [x] 倉儲結構清理 (Moving files to `tools/`, `logs/`, `trials/`)
- [x] 更新 `README.md` 與 `README_EN.md` 至 v3.4
- [x] 更新 `.skills/dynamo-script-analysis` 至 v1.4（TD 預設 + mode 三模式）
- [x] 更新 `domain/commands/image.md`（對齊 mode 與驗證流程）
- [x] 更新 `tests/verify_generate_workspace_mermaid.py`（TD + pipeline 驗證）
- [ ] 驗證 `create_group` 功能穩定性
- [ ] 建立 Clockwork GUIDs 映射表 (Mapping Table)

## ⚠️ 待解決問題
- **BUG-003**: Custom Node (外掛節點) 無法透過名稱字串搜尋/建立。
  - **Workaround**: 已成功使用 GUID 建立。長期目標是建立 Mapping Table。

## 📝 備註
- 系統核心功能穩定，分析能力強化後可處理超過 100 個節點的複雜圖表。
- 建議在未來專案中優先使用原生節點，若必須使用外掛，請先取得其 GUID。
- Mermaid 目前建議預設：`direction=TD`、`mode=pipeline`；除非 debug，否則不建議直接使用 `detail` 模式。

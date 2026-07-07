---
command: /domain
trigger: 使用者明確下達 /domain 或成功完成一個可重複使用的工作流程
version: 1.0
---

# /domain 指令 SOP

## 📋 指令目的

將成功的對話工作流程轉換為標準 SOP 格式，存放於 `domain/` 資料夾。

---

## 🔄 執行流程

```mermaid
flowchart TD
    A[觸發 /domain] --> B[確認 SOP 對象]
    B --> C[提取關鍵步驟與工具]
    C --> D[撰寫 YAML frontmatter]
    D --> E[編寫 Markdown 內容]
    E --> F[儲存至 domain/]
    F --> G{是否需要更新觸發表?}
    G -->|是| H[更新 GEMINI.md 指令表]
    G -->|否| I[完成]
    H --> I
```

---

## 📁 產出位置

| 類型 | 路徑 |
|:---|:---|
| SOP 文件 | `domain/*.md` |
| 指令 SOP | `domain/commands/*.md` |

---

## ✏️ 撰寫規範

### YAML Frontmatter

```yaml
---
title: "SOP 標題"
version: 1.0
last_update: 2026-02-04
applies_to: ["server.py", "GraphHandler.cs"]
---
```

### 內容結構

```markdown
# [SOP 標題]

## 📋 目的
[簡述此 SOP 解決的問題]

## 🔧 前置條件
- [必要工具/環境]
- [必要權限]

## 🔄 執行步驟

### 步驟 1：[動作名稱]
[詳細說明]

### 步驟 2：[動作名稱]
[詳細說明]

## ⚠️ 注意事項
- [重要提醒]

## 📎 相關文件
- [連結]
```

---

## 📦 分類規則

| 內容類型 | 存放位置 |
|:---|:---|
| 斜線指令 SOP | `domain/commands/` |
| 技術流程 SOP | `domain/` |
| 故障排除 | `domain/troubleshooting.md` |
| 架構分析 | `domain/architecture_*.md` |

---

## ⚠️ 注意事項

1. **避免與 lessons 混淆**：
   - `domain/` = 「怎麼做」(How-to)
   - `lessons/` = 「為什麼」(Why / 避坑經驗)

2. **命名規範**：
   - 小寫 + 底線
   - 描述性名稱
   - 例：`python_script_automation.md`

3. **語言政策（使用者 2026-07-08 拍板）**：SOP 一律**只寫繁體中文**，中文是唯一真相源。**禁止**建立 `*_EN.md` 版本（既有 `*_EN.md` 為凍結快照，不再同步）。詳見 GEMINI.md「核心行為義務」。

---

## 📝 範例：成功執行結果

**使用者對話**：成功完成 Python Script 節點自動化流程

**AI 執行**：
1. 建立 `domain/python_script_automation.md`

**回報**：
```
✅ 已建立 SOP：Python Script 節點自動化
   📁 domain/python_script_automation.md
```

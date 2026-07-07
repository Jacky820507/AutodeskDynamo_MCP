---
description: Dynamo MCP 故障排除標準操作程序 (SOP)
version: 1.1
last_updated: 2026-07-08
---

# Dynamo MCP 故障排除 SOP

> **目的**：提供結構化的故障診斷與修復流程，確保 AI 與使用者能快速解決連線與操作問題。
>
> **範圍**：本檔只涵蓋**橋接層 (L0)**——連線、Session、指令傳遞。若橋接正常但 Dynamo 圖本身出問題（結果數量不對、Python 節點報錯、Revit 元素行為怪異…），請改查 [`expertise/consultant_playbook.md`](expertise/consultant_playbook.md) 與 [`expertise/failure_signatures.md`](expertise/failure_signatures.md)。

---

## 🔴 連線失敗

### 症狀
- `analyze_workspace` 回傳 `Connection Refused`
- AI 顯示「❌ 失敗: Dynamo 監聽器未啟動」
- HTTP 請求超時

### 診斷步驟

#### 1. 檢查 Dynamo 是否開啟
```
Q: Dynamo 視窗是否開啟？
└─ NO → 請開啟 Dynamo（Sandbox 或 Revit 內建）
└─ YES → 繼續下一步
```

#### 2. 檢查連線狀態 (BIM Assistant Menu)
```
Q: Dynamo 頂部選單是否顯示 BIM Assistant -> Status: Connected？
└─ NO → 請點擊 BIM Assistant -> Connect to MCP Server
└─ YES → 繼續下一步
```

#### 3. 檢查連接埠佔用
**手動檢測**（PowerShell）：
```powershell
netstat -ano | findstr :65535
```

**預期結果**：
- 若顯示 `LISTENING` 且 PID 對應 Dynamo 程序 → 正常
- 若無任何結果 → ViewExtension 尚未啟動連線
- 若 PID 對應其他程序 → Port 被佔用，需終止該程序

#### 4. 強制重啟連線
**修復 SOP**：
1. 取消勾選 `BIM Assistant` -> `Connect to MCP Server`
2. 等待 2 秒，確保日誌顯示 `Connection closed`
3. 重新勾選 `Connect to MCP Server`
4. 執行 `analyze_workspace` 驗證

---

## 👻 幽靈連線

### 症狀
- AI 顯示操作成功（HTTP 200），但 **Dynamo 畫面無反應**
- `nodeCount` 顯示舊資料，但使用者表示「剛開新檔案」
- 使用者回報「看不到節點」

### 發生場景
- 在 **Revit 中重新開啟 Dynamo 視窗**（未關閉 Revit）
- Dynamo 窗口崩潰後重啟
- 多個 Dynamo 實例同時運行

### 診斷方法

#### 自動偵測
```
IF analyze_workspace.nodeCount > 1 
   AND 使用者回報「空白檔案」或「看不到東西」
THEN 判定為幽靈連線
```

#### 手動確認
1. 執行 `analyze_workspace`
2. 查看回傳的 `sessionId`
3. 對比前次記錄的 `sessionId`
4. 若不一致 → 確認為新實例，但連線到舊 Session

### 修復流程

**標準 SOP**（強制執行）：
```
1. 斷開連線
   └─ 透過選單取消勾選 Connect to MCP Server

2. 重啟連線
   └─ 重新勾選 Connect to MCP Server

3. 驗證修復
   └─ 執行 analyze_workspace
   └─ 確認 nodeCount 與畫布一致
   └─ 確認 sessionId 已更新
```

### 預防措施
- 每次對話開始時，強制執行 [`startup_checklist.md`](startup_checklist.md)
- 若 Dynamo 視窗被重開，**必須**引導使用者執行完整修復流程
- 關閉 Dynamo 前，建議先透過 `BIM Assistant` 選單斷開連線

---

## ⚠️ 多程序衝突

### 症狀
- `analyze_workspace` 回傳警告：「⚠️ 嚴重警告: 偵測到多個 Dynamo/Revit 程序」
- 指令發送成功，但不確定哪個 Dynamo 接收到

### 診斷步驟

#### 1. 檢查系統程序
**PowerShell**：
```powershell
tasklist | findstr /i "DynamoSandbox Revit"
```

**預期結果**：
- 僅一個 `DynamoSandbox.exe` 或 `Revit.exe` 程序 → 正常
- 多個程序 → 確認為多程序衝突

#### 2. 識別連線目標
- 執行 `analyze_workspace`
- 查看回傳的 `processId`
- 對照 `tasklist` 結果，確認當前連線至哪個程序

### 修復流程

**強制終止法**（推薦）：
```
1. 儲存所有 Dynamo 檔案
2. 關閉所有 Dynamo 與 Revit 視窗
3. 工作管理員 → 強制結束所有 Dynamo/Revit 程序
4. 重新啟動 Dynamo
5. 透過選單 `BIM Assistant` → `Connect to MCP Server` 建立連線（**禁止**要求使用者放置 StartMCPServer 節點，見 GEMINI.md 鐵律 #4）
6. 執行 analyze_workspace 驗證
```

**選擇性終止法**（進階）：
```
1. 識別目標 PID（透過 analyze_workspace.processId）
2. 終止非目標 PID 的其他程序
3. 執行 analyze_workspace 確認警告消失
```

---

## 🔧 節點創建失敗

### 症狀
- `execute_dynamo_instructions` 回傳成功，但節點未出現
- 回傳錯誤訊息：「Node creation failed」
- 節點位置錯誤或參數缺失

### 常見原因

#### 1. 節點名稱或參數格式錯誤（雙軌制）
本專案支援兩種創建軌道（詳見 [`node_creation_strategy.md`](node_creation_strategy.md)）：

**軌道 B（原生節點）**——名稱需存在於節點庫，有 Overload 的節點要指明或給足參數：
```json
{"name": "Point.ByCoordinates", "overload": "3D", "params": {"x": 0, "y": 0, "z": 100}}
```

**軌道 A（Code Block，降級/複雜邏輯用）**——名稱固定 `"Number"`，代碼放 `value` 且以 `;` 結尾：
```json
{"name": "Number", "value": "Point.ByCoordinates(0, 0, 0);"}
```

**常見錯誤**：軌道 B 的名稱拼錯或該節點不在庫中（先用 `search_nodes` 驗證）；Custom Node 用名稱創建不穩定，一律改用 GUID（見 [`../memory-bank/lessons/node-creation-guid.md`](../memory-bank/lessons/node-creation-guid.md)）。

#### 2. 創建失敗後不降級
**錯誤做法**：軌道 B 反覆失敗仍重試相同指令

**解決方案**：軌道 B 失敗 → 將同邏輯改寫為 DesignScript 走軌道 A（系統亦有自動降級機制）

#### 3. DesignScript 語法錯誤
**常見錯誤**：
- 缺少分號 `;`
- 參數類型錯誤（字串未加引號）
- Overload 選擇錯誤（2D vs 3D）

**診斷方法**：
1. 檢查 `value` 欄位是否以 `;` 結尾
2. 在 Dynamo 內手動建立 Code Block 測試語法
3. 查詢 `DynamoViewExtension/common_nodes.json` 確認節點簽名

---

## 📌 通用故障排除流程

```mermaid
graph TD
    A[遇到問題] --> B{能否連線?}
    B -->|NO| C[檢查 BIM Assistant 選單連線狀態]
    B -->|YES| D{操作有反應?}
    D -->|NO| E[幽靈連線檢測]
    D -->|YES| F{結果正確?}
    F -->|NO| G{是橋接指令問題還是圖本身問題?}
    F -->|YES| H[正常運作]
    
    C --> I{已勾選 Connect?}
    I -->|NO| J[勾選 Connect to MCP Server]
    I -->|YES| K[取消勾選後重新勾選-強制重啟連線]
    
    E --> L[執行幽靈連線修復 SOP]
    G -->|指令/節點創建| M[參考 node_creation_strategy.md]
    G -->|圖邏輯/Dynamo本身| N[參考 expertise/failure_signatures.md]
```

---

## 🔗 相關文件

- **啟動檢查**：[`startup_checklist.md`](startup_checklist.md)
- **快速參考**：[`QUICK_REFERENCE.md`](../QUICK_REFERENCE.md)
- **節點創建規範**：[`node_creation_strategy.md`](node_creation_strategy.md)
- **Dynamo 領域問題（非橋接）**：[`expertise/consultant_playbook.md`](expertise/consultant_playbook.md)
- **技術實作**：`DynamoViewExtension/src/GraphHandler.cs`、`WebSocketClient.cs`

---

## 📞 升級路徑

若上述 SOP 無法解決問題，請：

1. **檢查日誌**：
   - `DynamoViewExtension` 日誌位置：`%AppData%\Dynamo\[Version]\MCPListener_*.log`
   - 查找錯誤訊息或堆疊追蹤

2. **提供診斷資訊**：
   - `analyze_workspace` 完整回應
   - Dynamo 版本與 Revit 版本
   - 重現步驟

3. **社群支援**：
   - 提交 Issue 至專案 GitHub
   - 附上日誌與診斷資訊

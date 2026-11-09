<!-- 這個檔案由 tools/build.mjs 根據 meta.json 產生。要修改請編輯 meta.json，不要改這個檔案。 -->

# UI 元件名稱

24 個名稱 · #049–072 · 包 `ui` · 語言: [English](README.md) / [Español](README.es.md) / [日本語](README.ja.md) / [简体中文](README.zh-Hans.md)

找到名稱後，直接告訴 AI。再加上「幾秒」「多強」「什麼在動」，結果會更接近你想要的。

## 展開與彈出式元件

| 編號 | 名稱 | 英文名稱 | 一句話說明 | 對 AI 的說法範例 |
|---|---|---|---|---|
| [#049](https://showheyohtaki.github.io/motion-prompt/#049) | **Modal** | Modal dialog | 畫面變暗，中央跳出一個視窗 | 按下刪除按鈕時，用 Modal 跳出確認。背景變暗約 40%，並在 0.3 秒內一邊微放大一邊淡入。 |
| [#050](https://showheyohtaki.github.io/motion-prompt/#050) | **Drawer** | Drawer (Off-canvas) | 從側邊滑出選單面板 | 按下選單按鈕時，從左側滑出 Drawer。寬度為螢幕的 40%，0.4 秒滑出，背景稍微變暗。 |
| [#051](https://showheyohtaki.github.io/motion-prompt/#051) | **Bottom Sheet** | Bottom sheet | 面板從畫面底部往上滑出 | 點「查看詳情」時，用 Bottom Sheet 顯示詳細內容。高度為螢幕的 40%，0.4 秒升起，往下拖曳就關閉。 |
| [#052](https://showheyohtaki.github.io/motion-prompt/#052) | **手風琴** | Accordion | 點擊標題展開或收合內容 | 把常見問題做成手風琴。只有點到的項目在 0.35 秒內展開，箭頭旋轉 180 度。 |
| [#053](https://showheyohtaki.github.io/motion-prompt/#053) | **下拉選單** | Dropdown (select) | 點擊欄位，選項往下展開 | 把縣市欄位做成下拉選單。點擊後 0.25 秒內往下展開選項，選好後收起並填入所選的值。 |
| [#054](https://showheyohtaki.github.io/motion-prompt/#054) | **Tooltip** | Tooltip | 游標移上去顯示簡短說明 | 幫「?」圖示加上 Tooltip。游標移上去 0.2 秒後在上方顯示說明，移開就消失。 |
| [#055](https://showheyohtaki.github.io/motion-prompt/#055) | **Popover** | Popover | 點擊後跳出帶箭頭的小面板 | 幫「詳情」按鈕加上 Popover。點擊後 0.3 秒內在右側跳出帶箭頭的小面板，按「確定」就關閉。 |
| [#056](https://showheyohtaki.github.io/motion-prompt/#056) | **Toast** | Toast notification | 角落跳出通知並自動消失 | 儲存後在右下角用 Toast 顯示「已儲存」。0.35 秒內從右側滑入，2 秒後自動消失。 |

## 選擇與切換元件

| 編號 | 名稱 | 英文名稱 | 一句話說明 | 對 AI 的說法範例 |
|---|---|---|---|---|
| [#057](https://showheyohtaki.github.io/motion-prompt/#057) | **頁籤** | Tabs | 點擊頁籤標題切換內容 | 在價格頁面上方放三個頁籤。點擊時底線在 0.25 秒內滑動過去，內容以 0.2 秒的交叉淡入淡出切換。 |
| [#058](https://showheyohtaki.github.io/motion-prompt/#058) | **輪播** | Carousel | 橫向切換，依序展示內容 | 把首頁頂部的圖片做成輪播。按右箭頭每次用 0.4 秒換一張，下方顯示目前位置的圓點。 |
| [#059](https://showheyohtaki.github.io/motion-prompt/#059) | **Toggle** | Toggle switch | 切換開啟或關閉 | 在通知設定的每一列放上 Toggle。點擊時圓鈕在 0.2 秒內滑動，開啟時軌道變成藍色。 |
| [#060](https://showheyohtaki.github.io/motion-prompt/#060) | **Segmented Control** | Segmented control | 用並排按鈕切換檢視 | 在圖表上方放「日／週／月」的 Segmented Control。點擊時選取背景在 0.25 秒內滑動，圖表同步改變。 |
| [#061](https://showheyohtaki.github.io/motion-prompt/#061) | **Filter Chip** | Filter chips | 點擊以加上或移除篩選條件 | 在列表上方放 Filter Chip。點擊後出現勾號並變成藍色，0.15 秒內篩選列表。 |
| [#062](https://showheyohtaki.github.io/motion-prompt/#062) | **範圍滑桿** | Range slider | 用兩個滑鈕選出範圍 | 把價格篩選做成範圍滑桿。要有兩個滑鈕，拖曳時用氣泡顯示數值。 |
| [#063](https://showheyohtaki.github.io/motion-prompt/#063) | **數量加減器** | Stepper (+/−) | 用 ＋/－ 按鈕增減數字 | 把數量欄位做成＋／－數量加減器。每按一次增減 1，數字輕輕彈一下，持續 0.25 秒。 |
| [#064](https://showheyohtaki.github.io/motion-prompt/#064) | **分頁（Pagination）** | Pagination | 用頁碼切換頁面 | 在搜尋結果下方加上分頁頁碼。目前頁碼用藍色圓形標示，點擊後圓形在 0.2 秒內移動，並換成對應的列表。 |

## 導覽與狀態元件

| 編號 | 名稱 | 英文名稱 | 一句話說明 | 對 AI 的說法範例 |
|---|---|---|---|---|
| [#065](https://showheyohtaki.github.io/motion-prompt/#065) | **漢堡選單** | Hamburger menu | 點擊三條線圖示打開選單 | 在手機版頁首右側放漢堡選單。點擊時三條線在 0.3 秒內變成 ×，選單從上方往下展開。 |
| [#066](https://showheyohtaki.github.io/motion-prompt/#066) | **麵包屑** | Breadcrumbs | 以階層顯示目前所在位置 | 在文章頁上方加上麵包屑。格式為「首頁 › 課程 › 網頁設計」，目前頁面用粗體且不加連結。 |
| [#067](https://showheyohtaki.github.io/motion-prompt/#067) | **Mega Menu** | Mega menu | 展開大型的分組連結面板 | 幫頁首的「產品」加上 Mega Menu。游標移上去時 0.25 秒內往下展開滿版面板，排列三欄連結和一張圖片。 |
| [#068](https://showheyohtaki.github.io/motion-prompt/#068) | **步驟指示器** | Step indicator | 顯示目前進行到第幾步 | 在申請表單上方加上步驟指示器。分為填寫、確認、付款、完成四個步驟，已完成的步驟顯示勾號。 |
| [#069](https://showheyohtaki.github.io/motion-prompt/#069) | **Skeleton** | Skeleton screen | 載入時以灰色方塊佔位 | 列表載入時顯示 Skeleton。做成和內容形狀相同的灰色方塊，並讓光澤每 0.9 秒由左向右掃過。 |
| [#070](https://showheyohtaki.github.io/motion-prompt/#070) | **Spinner** | Spinner | 旋轉的圓圈表示請稍候 | 送出中在按鈕上顯示 Spinner。大約每秒轉一圈多一點，完成後換成藍色圓形的勾號。 |
| [#071](https://showheyohtaki.github.io/motion-prompt/#071) | **Badge** | Badge | 以小圓點顯示數量 | 在頁首的鈴鐺加上 Badge 顯示未讀數。每次數字增加就在 0.3 秒內微微彈跳，點開後消失。 |
| [#072](https://showheyohtaki.github.io/motion-prompt/#072) | **Empty State** | Empty state | 沒有內容時顯示的引導畫面 | 列表清空時顯示 Empty State。用 0.35 秒淡入線條圖示、「目前還沒有任何內容」和新增按鈕。 |

點編號會在圖庫打開會動的範例。單一名稱的秒數、緩動數值和參考程式碼： `api/v1/en/e/<id>.txt` ([#049](../../api/v1/en/e/049.txt)).

[所有包](../README.md)

Haven PWA（初版）
=================

功能
- iPhone Safari 可使用的 PWA 網頁相簿
- 首次使用設定 4–8 位數密碼
- IndexedDB 本機保存照片與影片
- 全部／照片／影片／收藏篩選
- 全螢幕檢視、影片播放、收藏、刪除、分享或匯出
- Service Worker 快取核心程式，支援離線啟動
- 深色介面與簡單轉場動畫

重要限制
1. 這是「先做密碼鎖」的版本，尚未對媒體檔案加密。PIN 保存在本機瀏覽器設定中，不能抵禦懂得檢查瀏覽器資料的人，也不等同於作業系統安全鎖。
2. 相片與影片存於 Safari 網站資料（IndexedDB），不是 iPhone「照片」App。清除 Safari 網站資料、瀏覽器儲存被系統清理或裝置損壞時，資料可能遺失。
3. 請保留 iPhone 原始相片並定期匯出備份。大量影片可能佔用很多空間。
4. 首次載入網頁需要網路。GitHub Pages 啟用 HTTPS 且程式載入完成後，才可離線啟動。這個版本沒有在背景上傳媒體，但首次打開網站仍需下載程式檔。
5. 本版本未整合 Face ID/Touch ID，也未提供從 iPhone 相簿直接刪除原始照片的能力。
6. 為確保離線完全性，CSS 不依賴外部字型；如需要字型可日後自行加入本地檔案。

部署到 GitHub Pages（iPhone）
1. 解壓縮 Haven_PWA_iPhone.zip。
2. 在 Safari 打開 github.com，進入你的 haven-pwa 儲存庫。
3. 先確認目前重要舊檔案是否需要備份。這個版本的檔案會覆蓋同名檔案；不要刪除你尚未備份的資料。
4. 在儲存庫頁面按 Add file → Upload files（如果手機畫面不同，打開瀏覽器「要求桌面版網站」）。
5. 選擇並上傳解壓後的 index.html、style.css、app.js、manifest.json、sw.js、icon.svg、README_繁體中文.txt。要上傳檔案本身，不是只上傳 ZIP。
6. 在頁面底部按 Commit changes。
7. 進入 Settings → Pages，選擇 Deploy from a branch；Branch 選 main，資料夾選 /(root)，按 Save。
8. 等待部署完成，打開 GitHub Pages 提供的網址（通常是 https://你的帳號.github.io/haven-pwa/）。
9. 用 Safari 打開網址，先設定密碼並匯入少量測試照片。
10. Safari 分享按鈕 → 加入主畫面。關閉 Wi‑Fi／行動數據後測試能否再次開啟。
11. 只有在確認部署成功後，才考慮移除舊版檔案。

排錯
- 若更新後還是舊畫面：關閉 Haven，重新載入 GitHub Pages；可能需要稍等快取更新。
- 若離線無法開啟：先連網開啟一次，確認網址為 HTTPS，等頁面完全載入後再測試。
- 若媒體未能匯入：先試一張小照片，確認 Safari 有足夠儲存空間。

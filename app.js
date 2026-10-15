(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const DB_NAME = "haven-local-v1", STORE = "media";
  let db, currentView = "all", items = [], currentItem = null, objectUrls = new Map(), pendingAction = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const s = d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          s.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function transaction(mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE);
      let result;
      try { result = action(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async function getAll() {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.sort((a,b) => b.createdAt-a.createdAt));
      req.onerror = () => reject(req.error);
    });
  }
  const getPin = () => localStorage.getItem("haven_pin");
  function initLock() {
    $("setupArea").classList.toggle("hidden", !!getPin());
    $("unlockArea").classList.toggle("hidden", !getPin());
  }
  function setMessage(s) { $("lockMessage").textContent = s; }
  function unlock() {
    $("lockScreen").classList.add("hidden"); $("app").classList.remove("hidden");
    refresh();
  }
  $("setPinBtn").addEventListener("click", () => {
    const a=$("newPin").value, b=$("confirmPin").value;
    if (!/^\d{4,8}$/.test(a)) return setMessage("請輸入 4 至 8 位數字密碼。");
    if (a !== b) return setMessage("兩次輸入的密碼不一致。");
    localStorage.setItem("haven_pin", a); $("newPin").value=""; $("confirmPin").value="";
    setMessage(""); unlock();
  });
  $("unlockBtn").addEventListener("click", () => {
    if ($("pinInput").value === getPin()) { $("pinInput").value=""; setMessage(""); unlock(); }
    else { setMessage("密碼不正確，請再試一次。"); $("pinInput").value=""; }
  });
  $("pinInput").addEventListener("keydown", e => { if(e.key==="Enter") $("unlockBtn").click(); });
  $("lockBtn").addEventListener("click", lock);
  function lock() {
    closeViewer(); $("app").classList.add("hidden"); $("lockScreen").classList.remove("hidden");
    $("pinInput").value=""; initLock();
  }
  function urlFor(item) {
    if (!objectUrls.has(item.id)) objectUrls.set(item.id, URL.createObjectURL(item.blob));
    return objectUrls.get(item.id);
  }
  function clearUrls() { for (const u of objectUrls.values()) URL.revokeObjectURL(u); objectUrls.clear(); }
  async function refresh() {
    try { items = await getAll(); render(); }
    catch(e) { showNotice("無法讀取本機相簿。請重新載入頁面；若仍有問題，請確認 Safari 儲存空間。"); }
    $("offlineState").textContent = navigator.onLine ? "可離線使用" : "目前離線";
  }
  function visibleItems() {
    if(currentView==="photos") return items.filter(x=>x.type.startsWith("image/"));
    if(currentView==="videos") return items.filter(x=>x.type.startsWith("video/"));
    if(currentView==="favorites") return items.filter(x=>x.favorite);
    return items;
  }
  function render() {
    const list=visibleItems(), gallery=$("gallery"); gallery.replaceChildren();
    $("mediaCount").textContent = `${items.length} 個項目 · 儲存在此裝置`;
    $("viewTitle").textContent = ({all:"我的相簿",photos:"照片",videos:"影片",favorites:"我的收藏"})[currentView];
    $("emptyState").classList.toggle("hidden", list.length>0);
    gallery.classList.toggle("hidden", list.length===0);
    list.forEach((item,i)=>{
      const card=document.createElement("button"); card.className="media-card"; card.setAttribute("aria-label",item.name||"開啟媒體");
      if(item.type.startsWith("image/")) { const img=document.createElement("img"); img.src=urlFor(item); img.alt=item.name||"照片"; img.loading="lazy"; card.append(img); }
      else { const v=document.createElement("video"); v.src=urlFor(item); v.muted=true; v.preload="metadata"; card.append(v); const mark=document.createElement("span"); mark.className="video-mark"; mark.textContent="▶"; card.append(mark); }
      if(item.favorite){const f=document.createElement("span");f.className="fav-mark";f.textContent="♥";card.append(f);}
      card.addEventListener("click",()=>openViewer(item.id)); gallery.append(card);
    });
  }
  function showNotice(text) { $("notice").textContent=text; $("notice").classList.remove("hidden"); setTimeout(()=> $("notice").classList.add("hidden"), 5000); }
  async function importFiles(fileList) {
    const files=Array.from(fileList||[]).filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/"));
    if(!files.length) return;
    let added=0;
    for(const file of files) {
      try {
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(STORE,"readwrite");
          tx.objectStore(STORE).add({name:file.name,type:file.type,blob:file,createdAt:Date.now(),favorite:false,size:file.size});
          tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
        }); added++;
      } catch(e) { showNotice("部分檔案未能儲存，可能是手機儲存空間不足。"); break; }
    }
    $("filePicker").value=""; $("emptyPicker").value="";
    await refresh(); if(added) showNotice(`已匯入 ${added} 個項目。請保留原始照片備份。`);
  }
  $("filePicker").addEventListener("change",e=>importFiles(e.target.files));
  $("emptyPicker").addEventListener("change",e=>importFiles(e.target.files));
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    currentView=btn.dataset.view;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b===btn));render();
  }));
  function openViewer(id) {
    currentItem=items.find(x=>x.id===id); if(!currentItem)return;
    const content=$("viewerContent");content.replaceChildren();
    const el=document.createElement(currentItem.type.startsWith("video/")?"video":"img");
    el.src=urlFor(currentItem); if(el.tagName==="VIDEO"){el.controls=true;el.playsInline=true;} else el.alt=currentItem.name||"照片";
    content.append(el); $("viewerIndex").textContent=currentItem.name||"媒體預覽";
    $("favoriteBtn").textContent=currentItem.favorite?"♥ 已收藏":"♡ 收藏";
    $("viewer").classList.remove("hidden");
  }
  function closeViewer(){const v=$("viewer"); if(!v.classList.contains("hidden")){const video=v.querySelector("video");if(video)video.pause();v.classList.add("hidden");currentItem=null;}}
  $("closeViewer").addEventListener("click",closeViewer);
  $("favoriteBtn").addEventListener("click",async()=>{
    if(!currentItem)return; const id=currentItem.id, favorite=!currentItem.favorite;
    await updateItem(id,{favorite});await refresh();openViewer(id);
  });
  async function updateItem(id,patch) {
    const item=items.find(x=>x.id===id); if(!item)return;
    await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put({...item,...patch});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  }
  $("deleteBtn").addEventListener("click",()=>{
    if(!currentItem)return; pendingAction=async()=>{const id=currentItem.id;await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});const u=objectUrls.get(id);if(u)URL.revokeObjectURL(u);objectUrls.delete(id);closeViewer();await refresh();};
    showModal("刪除這個項目？","這會從 Haven 的本機相簿移除項目，但不會刪除 iPhone「照片」App 中的原始檔。");
  });
  $("shareBtn").addEventListener("click",async()=>{
    if(!currentItem)return;
    try { const file=new File([currentItem.blob],currentItem.name||"haven-media",{type:currentItem.type});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})) await navigator.share({files:[file],title:"Haven 媒體"});
      else {const a=document.createElement("a");a.href=urlFor(currentItem);a.download=currentItem.name||"haven-media";a.click();showNotice("已準備下載檔案；iOS 的處理方式可能因版本而異。");}
    } catch(e) { if(e.name!=="AbortError") showNotice("無法分享此項目。"); }
  });
  $("viewerMore").addEventListener("click",()=>showNotice("提示：請使用「分享」匯出檔案，並定期備份。"));
  function showModal(title,text) {$("modalTitle").textContent=title;$("modalText").textContent=text;$("confirmModal").classList.remove("hidden");}
  function hideModal(){$("confirmModal").classList.add("hidden");pendingAction=null;}
  $("cancelModal").addEventListener("click",hideModal);
  $("confirmModalBtn").addEventListener("click",async()=>{const fn=pendingAction;hideModal();if(fn)await fn();});
  $("confirmModal").addEventListener("click",e=>{if(e.target===$("confirmModal"))hideModal();});
  window.addEventListener("online",()=>{$("offlineState").textContent="已連線";});
  window.addEventListener("offline",()=>{$("offlineState").textContent="目前離線";});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&!$("app").classList.contains("hidden")) lock();});
  (async()=>{
    initLock();
    try {
      db=await openDB();
      if("serviceWorker" in navigator && location.protocol.startsWith("http")) {
        navigator.serviceWorker.register("./sw.js").catch(()=>showNotice("離線快取尚未啟用。請確認已透過 GitHub Pages 的 HTTPS 網址開啟。"));
      }
    } catch(e) { setMessage("本機儲存無法啟動。請使用 Safari 的 HTTPS 網址開啟，並確認瀏覽器未限制網站資料。"); }
  })();
})();
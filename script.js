/* 出遊熊百岳 - script.js
   需求整合：
   - 讀取 mountains.json
   - 三種路線抽卡
   - 已征服勾選 + 集卡模式排除重抽
   - 抽卡紀錄（顯示3筆 + 可捲動）
   - 匯出抽卡圖 / 匯出紀錄圖（IG分享）
   - 每10座里程碑祝賀卡彈窗 + 可匯出
   - 緊急求助電話 + 急救教學
*/

const STORAGE = {
  visited: "bear100_visited_ids",
  history: "bear100_draw_history",
  diary: "bear100_diary_today",
  milestone: "bear100_milestone_last"
};

let allMountains = [];
let currentMountain = null;

// ===== 熊熊小語（可自行擴充）=====
const bearQuotes = [
  "把安全放第一名，你就已經是高手了。",
  "你不是在征服山，你是在學會照顧自己。",
  "慢慢走沒關係，穩穩走最厲害。",
  "今天願意出門，就是一種勇敢。",
  "不逞強，才是真的強。",
  "把每一步走穩，比走快更重要。"
];

// ===== util =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function loadSet(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return new Set();
    return new Set(JSON.parse(raw));
  }catch(e){ return new Set(); }
}
function saveSet(key, set){
  localStorage.setItem(key, JSON.stringify([...set]));
}

function loadArr(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function saveArr(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}

function nowISO(){
  const d = new Date();
  const pad = (x)=> String(x).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ===== mountains.json 兼容 =====
function normalizeMountain(m, idx){
  // 兼容你之前可能用的欄位：name_zh/name_en/difficulty_zh 等
  const name = m.name || m.name_zh || `未命名-${idx+1}`;
  const en = m.name_en ? ` | ${m.name_en}` : (m.nameEn ? ` | ${m.nameEn}` : "");
  const elev = m.elevation_m ?? m.elevation ?? "";
  const diff = m.difficulty || "beginner"; // beginner / intermediate / advanced
  const diffZh = m.difficulty_zh || (diff==="beginner"?"新手友善":diff==="intermediate"?"需要經驗":"建議帶隊");

  return {
    id: m.id ?? (idx+1),
    name,
    en,
    elevation_m: elev,
    difficulty: diff,
    difficulty_zh: diffZh,
    bear_story: m.bear_story || "🐻 熊熊說：每一步都算數，你很棒。",
    bear_advice: m.bear_advice || "✅ 走穩、補水、注意保暖。",
    risk_note: m.risk_note || m.risk || "⚠️ 注意天候變化與撤退時間。"
  };
}

async function loadMountains(){
  const res = await fetch("./mountains.json", { cache: "no-store" });
  if(!res.ok) throw new Error("mountains.json 讀取失敗");
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.mountains || []);
  allMountains = list.map(normalizeMountain);
}

// ===== UI: progress =====
function updateProgress(){
  const visited = loadSet(STORAGE.visited);
  const total = allMountains.length || 100;

  $("#progressPill").textContent = `✅ ${visited.size} / ${total}`;
  $("#progressText").textContent = `${visited.size} / ${total}`;

  const pct = total ? (visited.size / total) * 100 : 0;
  $("#progressBar").style.width = `${clamp(pct,0,100)}%`;

  checkMilestone(visited.size);
}

// ===== Milestone (每10座) =====
function checkMilestone(count){
  const total = allMountains.length || 100;
  const step = 10;
  const currentMilestone = Math.floor(count / step) * step;
  if(currentMilestone <= 0) return;

  const last = Number(localStorage.getItem(STORAGE.milestone) || "0");
  if(currentMilestone > last){
    localStorage.setItem(STORAGE.milestone, String(currentMilestone));
    openCongratsModal(currentMilestone, total);
  }
}

function openCongratsModal(m, total){
  openModal(`🎉 特別祝賀卡：已征服 ${m} 座！`, `
    <div class="export-wrap" id="congratsExport">
      <div class="export-title">你太猛了！已完成 <span style="color:#ff4b4b;font-weight:1000;">${m}</span> / ${total}</div>
      <div class="export-sub">🐻 熊熊說：每一步都算數。你不是在跟別人比，你是在超越昨天的自己。</div>
      <div class="mount-tags" style="margin-top:10px;">
        <span class="tag">✅ 下一個目標：${m+10} 座</span>
        <span class="tag">⭐ 再解鎖一張祝賀卡</span>
      </div>
      <div class="export-ig">📷 IG：@luckygbear</div>
    </div>
  `, `
    <button class="btn primary" id="btnExportCongrats">📸 匯出 IG 祝賀圖</button>
    <button class="btn ghost" id="btnCloseCongrats">稍後</button>
  `);

  $("#btnExportCongrats").onclick = async () => {
    await exportElementAsImage($("#congratsExport"), `bear-congrats-${m}.png`);
  };
  $("#btnCloseCongrats").onclick = closeModal;
}

// ===== Bear quote interactions =====
function setRandomQuote(){
  const q = bearQuotes[Math.floor(Math.random() * bearQuotes.length)];
  $("#bearQuote").textContent = q;
}
function enableLongPressCopy(el){
  let t = null;
  el.addEventListener("touchstart", ()=>{
    t = setTimeout(async ()=>{
      try{
        await navigator.clipboard.writeText(el.textContent.trim());
        toast("已複製熊熊小語 ✨");
      }catch(e){
        toast("複製失敗，請手動長按選取");
      }
    }, 450);
  }, {passive:true});
  el.addEventListener("touchend", ()=>{ if(t) clearTimeout(t); });
  el.addEventListener("touchmove", ()=>{ if(t) clearTimeout(t); });
}

// ===== Draw =====
function getPoolByDifficulty(diff, collectMode){
  const visited = loadSet(STORAGE.visited);
  let pool = allMountains.filter(m => m.difficulty === diff);

  if(diff === "any") pool = allMountains.slice();

  if(collectMode){
    pool = pool.filter(m => !visited.has(String(m.id)));
  }
  return pool;
}

function drawOne(diff){
  const collectMode = $("#collectMode").checked;
  const pool = getPoolByDifficulty(diff, collectMode);

  if(pool.length === 0){
    openModal("沒有可抽的山了", `
      <div class="muted">集卡模式下，這個難度的山你可能都已征服了。</div>
      <div class="muted small" style="margin-top:8px;">你可以取消「集卡模式」或改抽其他難度。</div>
    `, `<button class="btn ghost" onclick="closeModal()">知道了</button>`);
    return;
  }

  // 抽卡等待動畫（簡單但很有抽卡感）
  fakeDrawAnimation(async ()=>{
    const picked = pool[Math.floor(Math.random()*pool.length)];
    currentMountain = picked;
    renderResult(picked);
    pushHistory(picked);
  });
}

function fakeDrawAnimation(done){
  const panel = $("#resultPanel");
  panel.style.display = "block";
  $("#resultCard").innerHTML = `
    <div class="mount-title">🎲 抽籤中…</div>
    <div class="mount-sub">出遊熊正在翻卡片，請稍等一下…</div>
    <div class="mount-body">
      <div class="spinner"></div>
      <div class="muted small" style="margin-top:8px;">（小提醒：看天氣、看時間、看體力）</div>
    </div>
  `;
  injectSpinnerCSSOnce();

  setTimeout(()=> done(), 700);
}

function injectSpinnerCSSOnce(){
  if(document.getElementById("spinner-css")) return;
  const s = document.createElement("style");
  s.id = "spinner-css";
  s.textContent = `
    .spinner{
      width:34px;height:34px;border-radius:50%;
      border:4px solid rgba(0,0,0,.08);
      border-top-color: #ff8d2a;
      animation: spin .8s linear infinite;
      margin-top:10px;
    }
    @keyframes spin{ to{ transform: rotate(360deg);} }
  `;
  document.head.appendChild(s);
}

function renderResult(m){
  const visited = loadSet(STORAGE.visited);
  const isVisited = visited.has(String(m.id));

  $("#resultPanel").style.display = "block";
  $("#btnToggleVisited").textContent = isVisited ? "✅ 已去過（取消）" : "✅ 勾選已去過";

  $("#resultCard").innerHTML = `
    <div class="mount-title">⛰️ ${escapeHtml(m.name)}</div>
    <div class="mount-sub">${m.elevation_m ? `${m.elevation_m}m` : ""}${m.en} ｜ ${escapeHtml(m.difficulty_zh)}</div>

    <div class="mount-tags">
      <span class="tag">${badgeByDiff(m.difficulty)}</span>
      <span class="tag">📍 百岳抽卡</span>
      ${isVisited ? `<span class="tag">✅ 已征服</span>` : ``}
    </div>

    <div class="mount-body">
      <div>${escapeHtml(m.bear_story)}</div>
      <div style="margin-top:8px;">${escapeHtml(m.bear_advice)}</div>
      <div style="margin-top:8px;">${escapeHtml(m.risk_note)}</div>
    </div>
  `;

  $("#btnToggleVisited").onclick = () => toggleVisited(m.id);
}

// ===== visited toggle =====
function toggleVisited(id){
  const visited = loadSet(STORAGE.visited);
  const key = String(id);
  if(visited.has(key)){
    visited.delete(key);
    toast("已取消勾選");
  }else{
    visited.add(key);
    toast("+1 已征服 ✅");
  }
  saveSet(STORAGE.visited, visited);
  updateProgress();

  // 更新結果卡 / 清單
  if(currentMountain && String(currentMountain.id) === key){
    renderResult(currentMountain);
  }
  renderList();
  renderDiaryPreview();
}

// ===== history =====
function pushHistory(m){
  const arr = loadArr(STORAGE.history);
  const diaryText = (localStorage.getItem(STORAGE.diary) || "").trim();

  arr.unshift({
    ts: nowISO(),
    id: m.id,
    name: m.name,
    elev: m.elevation_m,
    diff: m.difficulty,
    story: m.bear_story,
    advice: m.bear_advice,
    risk: m.risk_note,
    mood: diaryText
  });

  // 最多存 50 筆（你也可以改更大）
  const trimmed = arr.slice(0, 50);
  saveArr(STORAGE.history, trimmed);

  renderDiaryPreview();
}

// ===== list page =====
function renderList(){
  if(!allMountains.length) return;
  const visited = loadSet(STORAGE.visited);
  const q = ($("#searchBox")?.value || "").trim();
  const diff = ($("#filterDiff")?.value || "all");

  let items = allMountains.slice();
  if(diff !== "all") items = items.filter(m=> m.difficulty === diff);
  if(q){
    const lower = q.toLowerCase();
    items = items.filter(m => (m.name || "").toLowerCase().includes(lower) || (m.en || "").toLowerCase().includes(lower));
  }

  const el = $("#mountList");
  el.innerHTML = "";

  items.forEach(m=>{
    const checked = visited.has(String(m.id));
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <input class="checkbox" type="checkbox" ${checked ? "checked":""} />
      <div class="item-main">
        <div class="item-title">${escapeHtml(m.name)}</div>
        <div class="item-sub">${m.elevation_m ? `${m.elevation_m}m` : ""}${m.en} ｜ ${escapeHtml(m.difficulty_zh)}</div>
      </div>
      <div class="item-badge">${badgeByDiff(m.difficulty)}</div>
    `;
    row.querySelector("input").addEventListener("change", ()=> toggleVisited(m.id));
    row.addEventListener("click", (e)=>{
      if(e.target.tagName.toLowerCase()==="input") return;
      openMountainModal(m);
    });
    el.appendChild(row);
  });

  if(items.length===0){
    el.innerHTML = `<div class="muted">沒有符合的山。</div>`;
  }
}

function openMountainModal(m){
  const visited = loadSet(STORAGE.visited);
  const isVisited = visited.has(String(m.id));

  openModal(`⛰️ ${m.name}`, `
    <div class="mount-card" id="modalCard">
      <div class="mount-title">${escapeHtml(m.name)}</div>
      <div class="mount-sub">${m.elevation_m ? `${m.elevation_m}m` : ""}${m.en} ｜ ${escapeHtml(m.difficulty_zh)}</div>

      <div class="mount-tags">
        <span class="tag">${badgeByDiff(m.difficulty)}</span>
        ${isVisited ? `<span class="tag">✅ 已征服</span>` : `<span class="tag">⬜ 未征服</span>`}
      </div>

      <div class="mount-body">
        <div>${escapeHtml(m.bear_story)}</div>
        <div style="margin-top:8px;">${escapeHtml(m.bear_advice)}</div>
        <div style="margin-top:8px;">${escapeHtml(m.risk_note)}</div>
      </div>
      <div class="export-ig">📷 IG：@luckygbear</div>
    </div>
  `, `
    <button class="btn primary" id="btnModalExport">📸 匯出這張山卡</button>
    <button class="btn ghost" id="btnModalToggle">${isVisited ? "✅ 取消已征服" : "✅ 勾選已征服"}</button>
  `);

  $("#btnModalExport").onclick = async ()=> exportElementAsImage($("#modalCard"), `bear-mountain-${m.id}.png`);
  $("#btnModalToggle").onclick = ()=> { toggleVisited(m.id); closeModal(); };
}

// ===== Diary =====
function renderDiaryPreview(){
  const arr = loadArr(STORAGE.history).slice(0,3);
  const box = $("#diaryPreview");
  if(!box) return;

  if(arr.length===0){
    box.innerHTML = `<div class="muted">目前還沒有抽卡紀錄。</div>`;
    return;
  }

  box.innerHTML = arr.map(h=>`
    <div class="mini-card">
      <div style="font-weight:1000;">⛰️ ${escapeHtml(h.name)} <span class="muted small">（${escapeHtml(h.ts)}）</span></div>
      <div class="muted small" style="margin-top:4px;">${h.elev ? `${h.elev}m` : ""} ｜ ${badgeByDiff(h.diff)}</div>
      <div style="margin-top:8px;font-size:13px;line-height:1.55;">${escapeHtml(h.story)}</div>
      ${h.mood ? `<div class="muted small" style="margin-top:8px;">📝 心情：${escapeHtml(h.mood)}</div>` : ``}
    </div>
  `).join("");
}

function saveDiary(){
  const txt = ($("#diaryInput").value || "").trim();
  localStorage.setItem(STORAGE.diary, txt);
  toast("已儲存今日心情 📝");
}

// ===== Export image (用 CDN 動態載入 html2canvas，避免檔案變大) =====
async function ensureHtml2Canvas(){
  if(window.html2canvas) return;

  await new Promise((resolve, reject)=>{
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function exportElementAsImage(element, filename){
  if(!element) return;
  try{
    toast("正在產生圖片…");
    await ensureHtml2Canvas();
    const canvas = await window.html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
    const dataUrl = canvas.toDataURL("image/png");

    // 下載
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();

    toast("已產生圖片 ✅（可分享到 IG）");
  }catch(e){
    console.error(e);
    toast("匯出失敗，請稍後再試");
  }
}

// 匯出「抽卡紀錄圖」
async function exportHistoryImage(){
  const hist = loadArr(STORAGE.history);
  if(hist.length===0){
    toast("目前沒有紀錄可以匯出");
    return;
  }

  const top = hist.slice(0, 10); // 你要更多可改
  const html = `
    <div class="export-wrap" id="historyExport">
      <div class="export-title">出遊熊百岳｜抽卡紀錄</div>
      <div class="export-sub">（顯示最近 ${top.length} 筆）</div>
      <div class="export-ig">📷 IG：@luckygbear</div>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;">
        ${top.map(h=>`
          <div style="border:2px solid #f5d3a6;border-radius:16px;padding:10px 12px;background:#fff;">
            <div style="font-weight:1000;">⛰️ ${escapeHtml(h.name)} <span style="font-size:12px;color:#7a5d6a;">${escapeHtml(h.ts)}</span></div>
            <div style="font-size:12px;color:#7a5d6a;margin-top:4px;">${h.elev ? `${h.elev}m` : ""} ｜ ${badgeByDiff(h.diff)}</div>
            <div style="margin-top:8px;font-size:13px;line-height:1.55;">${escapeHtml(h.story)}</div>
            ${h.mood ? `<div style="margin-top:8px;font-size:12px;color:#7a5d6a;">📝 心情：${escapeHtml(h.mood)}</div>` : ``}
          </div>
        `).join("")}
      </div>
    </div>
  `;

  openModal("📸 匯出抽卡紀錄圖", html, `
    <button class="btn primary" id="btnDoExportHistory">📸 產生圖片</button>
    <button class="btn ghost" onclick="closeModal()">關閉</button>
  `);

  $("#btnDoExportHistory").onclick = async ()=>{
    await exportElementAsImage($("#historyExport"), `bear-history-${Date.now()}.png`);
  };
}

// ===== Emergency =====
function callEmergency(){
  openModal("📞 山難求助電話", `
    <div class="muted">請依你所在狀況選擇撥打：</div>
    <div class="mount-tags" style="margin-top:10px;">
      <a class="tag" href="tel:119">📞 119（消防／救護）</a>
      <a class="tag" href="tel:110">📞 110（警察）</a>
      <a class="tag" href="tel:112">📞 112（手機緊急）</a>
    </div>
    <div class="muted small" style="margin-top:10px;line-height:1.6;">
      若可行：保持冷靜、回報位置（座標/里程/地標）、人數、傷勢、天候、可否行走。<br>
      有訊號就先傳訊息給親友，並保留手機電量。
    </div>
  `, `<button class="btn ghost" onclick="closeModal()">知道了</button>`);
}

function firstAidGuide(){
  openModal("🩹 緊急急救教學（登山常見）", `
    <div class="mini-card">
      <div style="font-weight:1000;">⛰️ 高山症（頭痛/噁心/喘）</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        立即停止上升、保暖、補水；症狀加重就下撤。若出現意識混亂/走路不穩/呼吸困難 → 優先求援。
      </div>
    </div>

    <div class="mini-card">
      <div style="font-weight:1000;">🥶 失溫（發抖/反應慢）</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        立刻避風保暖（雨衣/鋁箔毯/乾衣物）、補充熱量；避免持續淋雨與久坐不動。
      </div>
    </div>

    <div class="mini-card">
      <div style="font-weight:1000;">🩸 出血（外傷）</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        直接加壓止血（乾淨布/繃帶），持續壓住；傷口包紮固定，必要時求援。
      </div>
    </div>

    <div class="mini-card">
      <div style="font-weight:1000;">🦴 扭傷/骨折</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        先固定再移動；能不走就不走。腫脹明顯或疼痛劇烈 → 優先求援。
      </div>
    </div>

    <div class="safe-strip" style="margin-top:10px;">
      🐻 熊熊提醒：最重要的是「停止惡化」＋「安全下撤/求援」。
    </div>
  `, `<button class="btn ghost" onclick="closeModal()">關閉</button>`);
}

// ===== Modal =====
function openModal(title, bodyHtml, footHtml=""){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modalFoot").innerHTML = footHtml;
  $("#modal").style.display = "flex";
}
function closeModal(){
  $("#modal").style.display = "none";
  $("#modalBody").innerHTML = "";
  $("#modalFoot").innerHTML = "";
}

// ===== Toast =====
function toast(msg){
  let el = document.getElementById("toast");
  if(!el){
    el = document.createElement("div");
    el.id = "toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.bottom = "110px";
    el.style.maxWidth = "calc(100% - 40px)";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "14px";
    el.style.background = "rgba(0,0,0,.78)";
    el.style.color = "#fff";
    el.style.fontWeight = "900";
    el.style.fontSize = "13px";
    el.style.zIndex = "120";
    el.style.opacity = "0";
    el.style.transition = "opacity .2s ease";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.style.opacity="0", 1200);
}

// ===== badges =====
function badgeByDiff(d){
  if(d==="beginner") return "🎒 新手";
  if(d==="intermediate") return "🥾 進階";
  return "⚠️ 需帶隊";
}

// ===== escape =====
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== nav =====
function switchPage(name){
  const pages = ["Draw","List","Diary","Settings"];
  pages.forEach(p=>{
    const el = document.getElementById(`page${p}`);
    if(el) el.style.display = (p===name) ? "" : "none";
  });

  $$(".nav-item").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.page === name);
  });

  // 進入某頁時刷新
  if(name==="List") renderList();
  if(name==="Diary") renderDiaryPreview();
}

// ===== init =====
async function init(){
  // modal close
  $("#modalClose").onclick = closeModal;
  $("#modal").addEventListener("click", (e)=>{
    if(e.target.id==="modal") closeModal();
  });

  // bear quote
  setRandomQuote();
  enableLongPressCopy($("#bearQuote"));
  $("#bearAvatar").addEventListener("click", ()=> setRandomQuote());

  // buttons
  $$(".route-card").forEach(btn=>{
    btn.addEventListener("click", ()=> drawOne(btn.dataset.diff));
  });
  $("#btnDrawAny").addEventListener("click", ()=> drawOne("any"));

  $("#btnOpenHistory").addEventListener("click", ()=> openHistoryModal());
  $("#btnExportCard").addEventListener("click", async ()=>{
    if(!currentMountain){
      toast("請先抽一座山");
      return;
    }
    await exportElementAsImage($("#resultCard"), `bear-draw-${currentMountain.id}.png`);
  });

  $("#btnCall119").addEventListener("click", callEmergency);
  $("#btnFirstAid").addEventListener("click", firstAidGuide);

  // list filters
  $("#searchBox").addEventListener("input", ()=> renderList());
  $("#filterDiff").addEventListener("change", ()=> renderList());

  // diary
  $("#btnSaveDiary").addEventListener("click", saveDiary);
  $("#btnExportHistory").addEventListener("click", exportHistoryImage);

  // settings reset
  $("#btnReset").addEventListener("click", ()=>{
    openModal("🧹 清除本機資料", `
      <div class="muted">確定要清除進度與抽卡紀錄嗎？</div>
      <div class="muted small" style="margin-top:8px;">（只影響本機，不影響你的 GitHub 檔案）</div>
    `, `
      <button class="btn danger" id="btnDoReset">清除</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    `);
    $("#btnDoReset").onclick = ()=>{
      localStorage.removeItem(STORAGE.visited);
      localStorage.removeItem(STORAGE.history);
      localStorage.removeItem(STORAGE.diary);
      localStorage.removeItem(STORAGE.milestone);
      currentMountain = null;
      $("#resultPanel").style.display = "none";
      updateProgress();
      renderList();
      renderDiaryPreview();
      closeModal();
      toast("已清除 ✅");
    };
  });

  // bottom nav
  $$(".nav-item").forEach(btn=>{
    btn.addEventListener("click", ()=> switchPage(btn.dataset.page));
  });

  // load mountains
  try{
    await loadMountains();
  }catch(e){
    console.error(e);
    openModal("mountains.json 讀取失敗", `
      <div class="muted">請確認你根目錄有 <b>mountains.json</b>，且內容為 JSON。</div>
      <div class="muted small" style="margin-top:8px;">GitHub Pages 路徑大小寫要一致：<b>mountains.json</b></div>
    `, `<button class="btn ghost" onclick="closeModal()">知道了</button>`);
  }

  updateProgress();
  renderList();
  renderDiaryPreview();

  // default page
  switchPage("Draw");
}

function openHistoryModal(){
  const arr = loadArr(STORAGE.history);
  if(arr.length===0){
    openModal("📜 抽卡紀錄", `<div class="muted">目前還沒有紀錄。</div>`, `<button class="btn ghost" onclick="closeModal()">關閉</button>`);
    return;
  }

  const top = arr.slice(0, 3);
  const html = `
    <div class="muted small">只顯示最新 3 筆（可上下捲動查看更多）</div>
    <div style="margin-top:10px; max-height: 48vh; overflow:auto; display:flex; flex-direction:column; gap:10px;">
      ${top.map(h=>`
        <div class="mini-card">
          <div style="font-weight:1000;">⛰️ ${escapeHtml(h.name)}</div>
          <div class="muted small" style="margin-top:4px;">${escapeHtml(h.ts)} ｜ ${badgeByDiff(h.diff)}</div>
          <div style="margin-top:8px;font-size:13px;line-height:1.55;">${escapeHtml(h.story)}</div>
        </div>
      `).join("")}
    </div>
  `;

  openModal("📜 抽卡紀錄", html, `
    <button class="btn primary" id="btnExportHistoryFromModal">📸 匯出抽卡紀錄圖</button>
    <button class="btn ghost" onclick="closeModal()">關閉</button>
  `);

  $("#btnExportHistoryFromModal").onclick = exportHistoryImage;
}

document.addEventListener("DOMContentLoaded", init);
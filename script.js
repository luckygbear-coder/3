/* 出遊熊百岳 - script.js（可直接覆蓋）
   ✅ 修好按鈕不能按（避免 ReferenceError / selector 綁不到）
   ✅ 抽山結果 & 抽卡動畫：Modal
   ✅ 里程碑證書：顯示最近征服山名
   ✅ 征服 log：STORAGE.conquered
   ✅ 大頭照：可上傳並套用（點頭像可選照片，或用 input#avatarUpload）
   ✅ 日記登山紀錄：時間/選山/照片/備註（localStorage）
*/

const STORAGE = {
  visited: "bear100_visited_ids",
  history: "bear100_draw_history",
  diary: "bear100_diary_today",
  milestone: "bear100_milestone_last",
  conquered: "bear100_conquered_log",
  profileAvatar: "bear100_profile_avatar"
};

const HIKE_KEY = "bear100_hike_logs";

let allMountains = [];
let currentMountain = null;

// ===== 熊熊小語（若你已刪掉熊熊說那格，程式也不會壞）=====
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
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function badgeByDiff(d){
  if(d==="beginner") return "🎒 新手";
  if(d==="intermediate") return "🥾 進階";
  return "⚠️ 需帶隊";
}

// ===== mountains.json 兼容 =====
function normalizeMountain(m, idx){
  const name = m.name || m.name_zh || `未命名-${idx+1}`;
  const en = m.name_en ? ` | ${m.name_en}` : (m.nameEn ? ` | ${m.nameEn}` : "");
  const elev = m.elevation_m ?? m.elevation ?? "";
  const diff = m.difficulty || "beginner";
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

// ===== Modal =====
function openModal(title, bodyHtml, footHtml=""){
  const titleEl = $("#modalTitle");
  const bodyEl = $("#modalBody");
  const footEl = $("#modalFoot");
  const modalEl = $("#modal");
  if(!titleEl || !bodyEl || !footEl || !modalEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  footEl.innerHTML = footHtml;
  modalEl.style.display = "flex";
}
function closeModal(){
  const modalEl = $("#modal");
  const bodyEl = $("#modalBody");
  const footEl = $("#modalFoot");
  if(modalEl) modalEl.style.display = "none";
  if(bodyEl) bodyEl.innerHTML = "";
  if(footEl) footEl.innerHTML = "";
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

// ===== progress =====
function updateProgress(){
  const visited = loadSet(STORAGE.visited);
  const total = allMountains.length || 100;

  const pill = $("#progressPill");
  if(pill) pill.textContent = `登山進度：已征服 ${visited.size} 座（${visited.size}/${total}）`;

  const txt = $("#progressText");
  if(txt) txt.textContent = `${visited.size} / ${total}`;

  const bar = $("#progressBar");
  if(bar){
    const pct = total ? (visited.size / total) * 100 : 0;
    bar.style.width = `${clamp(pct,0,100)}%`;
  }

  checkMilestone(visited.size);
}

// ===== milestone =====
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
  const recent = loadArr(STORAGE.conquered).slice(0, 3).map(x=>x.name).filter(Boolean);
  const recentHtml = recent.length
    ? `<div class="export-sub" style="margin-top:8px;">🏔️ 最近征服：<b>${escapeHtml(recent.join("、"))}</b></div>`
    : "";

  openModal(`🎉 特別祝賀卡：已征服 ${m} 座！`, `
    <div class="export-wrap" id="congratsExport">
      <div class="export-title">出遊熊百岳｜征服證書</div>
      <div class="export-sub">✅ 已征服 <span style="color:#ff4b4b;font-weight:1000;">${m}</span> / ${total} 座</div>
      ${recentHtml}
      <div class="mount-tags" style="margin-top:10px;">
        <span class="tag">下一個目標：${m+10} 座</span>
        <span class="tag">記得安全下山 🐻</span>
      </div>
      <div class="export-ig">📷 IG：@luckygbear</div>
    </div>
  `, `
    <button class="btn primary" id="btnExportCongrats">📸 匯出證書圖</button>
    <button class="btn ghost" id="btnCloseCongrats">關閉</button>
  `);

  const exportBtn = $("#btnExportCongrats");
  const closeBtn = $("#btnCloseCongrats");
  if(exportBtn) exportBtn.onclick = async () => {
    await exportElementAsImage($("#congratsExport"), `bear-certificate-${m}.png`);
  };
  if(closeBtn) closeBtn.onclick = closeModal;
}

// ===== bear quote（可有可無）=====
function setRandomQuote(){
  const el = $("#bearQuote");
  if(!el) return;
  const q = bearQuotes[Math.floor(Math.random() * bearQuotes.length)];
  el.textContent = q;
}
function enableLongPressCopy(el){
  if(!el) return;
  let t = null;
  el.addEventListener("touchstart", ()=>{
    t = setTimeout(async ()=>{
      try{
        await navigator.clipboard.writeText(el.textContent.trim());
        toast("已複製小語 ✨");
      }catch(e){
        toast("複製失敗，請手動長按選取");
      }
    }, 450);
  }, {passive:true});
  el.addEventListener("touchend", ()=>{ if(t) clearTimeout(t); });
  el.addEventListener("touchmove", ()=>{ if(t) clearTimeout(t); });
}

// ===== draw pool =====
function getPoolByDifficulty(diff, collectMode){
  const visited = loadSet(STORAGE.visited);
  let pool = allMountains.filter(m => m.difficulty === diff);
  if(diff === "any") pool = allMountains.slice();
  if(collectMode) pool = pool.filter(m => !visited.has(String(m.id)));
  return pool;
}

function openDrawResultModal(m){
  const visited = loadSet(STORAGE.visited);
  const isVisited = visited.has(String(m.id));

  openModal(
    "🎉 抽到這座山",
    `
    <div class="mount-card" id="drawResultCard">
      <div class="mount-title">⛰️ ${escapeHtml(m.name)}</div>
      <div class="mount-sub">
        ${m.elevation_m ? `${m.elevation_m}m` : ""}
        ${m.en || ""} ｜ ${escapeHtml(m.difficulty_zh)}
      </div>

      <div class="mount-tags">
        <span class="tag">${badgeByDiff(m.difficulty)}</span>
        ${isVisited ? `<span class="tag">✅ 已征服</span>` : ``}
      </div>

      <div class="mount-body">
        <div>${escapeHtml(m.bear_story)}</div>
        <div style="margin-top:8px;">${escapeHtml(m.bear_advice)}</div>
        <div style="margin-top:8px;">${escapeHtml(m.risk_note)}</div>
      </div>

      <div class="export-ig">📷 IG：@luckygbear</div>
    </div>
    `,
    `
    <button class="btn primary" id="btnExportDraw">📸 匯出 IG 抽卡圖</button>
    <button class="btn ghost" id="btnToggleVisitedDraw">
      ${isVisited ? "取消已去過" : "勾選已去過"}
    </button>
    `
  );

  const exportBtn = $("#btnExportDraw");
  const toggleBtn = $("#btnToggleVisitedDraw");
  if(exportBtn) exportBtn.onclick = async () => {
    await exportElementAsImage(document.getElementById("drawResultCard"), `bear-draw-${m.id}.png`);
  };
  if(toggleBtn) toggleBtn.onclick = () => {
    toggleVisited(m.id);
    closeModal();
  };
}

function fakeDrawAnimationThen(done){
  openModal("🎲 抽籤中…", `
    <div class="mount-card">
      <div class="mount-title">出遊熊正在翻卡片…</div>
      <div class="mount-sub">請稍等一下下 🐻</div>
      <div class="mount-body">
        <div class="spinner"></div>
        <div class="muted small" style="margin-top:8px;">（小提醒：看天氣、看時間、看體力）</div>
      </div>
    </div>
  `);
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

function drawOne(diff){
  const collectEl = $("#collectMode");
  const collectMode = collectEl ? collectEl.checked : true;
  const pool = getPoolByDifficulty(diff, collectMode);

  if(pool.length === 0){
    openModal("沒有可抽的山了", `
      <div class="muted">集卡模式下，這個難度的山你可能都已征服了。</div>
      <div class="muted small" style="margin-top:8px;">你可以取消「集卡模式」或改抽其他難度。</div>
    `, `<button class="btn ghost" onclick="closeModal()">知道了</button>`);
    return;
  }

  fakeDrawAnimationThen(()=>{
    const picked = pool[Math.floor(Math.random()*pool.length)];
    currentMountain = picked;
    pushHistory(picked);
    openDrawResultModal(picked);
  });
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

    // conquered log
    const m = allMountains.find(x => String(x.id) === key);
    const log = loadArr(STORAGE.conquered);
    log.unshift({ ts: nowISO(), id: key, name: m ? m.name : "未知" });
    saveArr(STORAGE.conquered, log.slice(0, 50));
  }

  saveSet(STORAGE.visited, visited);
  updateProgress();
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
  saveArr(STORAGE.history, arr.slice(0, 50));
  renderDiaryPreview();
}

// ===== list =====
function renderList(){
  const el = $("#mountList");
  if(!el) return;

  if(!allMountains.length){
    el.innerHTML = `<div class="muted">尚未載入 mountains.json</div>`;
    return;
  }

  const visited = loadSet(STORAGE.visited);
  const q = ($("#searchBox")?.value || "").trim().toLowerCase();
  const diff = ($("#filterDiff")?.value || "all");

  let items = allMountains.slice();
  if(diff !== "all") items = items.filter(m=> m.difficulty === diff);
  if(q){
    items = items.filter(m =>
      (m.name || "").toLowerCase().includes(q) || (m.en || "").toLowerCase().includes(q)
    );
  }

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

  const exportBtn = $("#btnModalExport");
  const toggleBtn = $("#btnModalToggle");
  if(exportBtn) exportBtn.onclick = async ()=> exportElementAsImage($("#modalCard"), `bear-mountain-${m.id}.png`);
  if(toggleBtn) toggleBtn.onclick = ()=> { toggleVisited(m.id); closeModal(); };
}

// ===== Diary Preview（最近3筆抽卡）=====
function renderDiaryPreview(){
  const box = $("#diaryPreview");
  if(!box) return;

  const arr = loadArr(STORAGE.history).slice(0,3);
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
  const input = $("#diaryInput");
  const txt = (input?.value || "").trim();
  localStorage.setItem(STORAGE.diary, txt);
  toast("已儲存今日心情 📝");
}

// ===== Export image =====
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
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
    toast("已產生圖片 ✅");
  }catch(e){
    console.error(e);
    toast("匯出失敗，請稍後再試");
  }
}
async function exportHistoryImage(){
  const hist = loadArr(STORAGE.history);
  if(hist.length===0){ toast("目前沒有紀錄可以匯出"); return; }

  const top = hist.slice(0, 10);
  const recent = loadArr(STORAGE.conquered).slice(0, 3).map(x=>x.name).filter(Boolean);
  const recentHtml = recent.length
    ? `<div class="export-sub" style="margin-top:8px;">🏔️ 最近征服：<b>${escapeHtml(recent.join("、"))}</b></div>`
    : "";

  const html = `
    <div class="export-wrap" id="historyExport">
      <div class="export-title">出遊熊百岳｜抽卡紀錄</div>
      <div class="export-sub">（最近 ${top.length} 筆）</div>
      ${recentHtml}
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

  const btn = $("#btnDoExportHistory");
  if(btn) btn.onclick = async ()=> exportElementAsImage($("#historyExport"), `bear-history-${Date.now()}.png`);
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
      若可行：回報位置（座標/地標/里程）、人數、傷勢、天候、可否行走。<br>
      有訊號先傳訊息給親友，並保留手機電量。
    </div>
  `, `<button class="btn ghost" onclick="closeModal()">知道了</button>`);
}
function firstAidGuide(){
  openModal("🩹 緊急急救教學（登山常見）", `
    <div class="mini-card">
      <div style="font-weight:1000;">⛰️ 高山症（頭痛/噁心/喘）</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        停止上升、保暖、補水；症狀加重就下撤。意識混亂/走路不穩/呼吸困難 → 優先求援。
      </div>
    </div>
    <div class="mini-card">
      <div style="font-weight:1000;">🥶 失溫（發抖/反應慢）</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        立刻避風保暖（雨衣/鋁箔毯/乾衣物）、補充熱量；避免持續淋雨。
      </div>
    </div>
    <div class="mini-card">
      <div style="font-weight:1000;">🩸 出血（外傷）</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        直接加壓止血，持續壓住；包紮固定，必要時求援。
      </div>
    </div>
    <div class="mini-card">
      <div style="font-weight:1000;">🦴 扭傷/骨折</div>
      <div class="muted small" style="margin-top:6px;line-height:1.6;">
        先固定再移動；能不走就不走。疼痛劇烈或腫脹明顯 → 優先求援。
      </div>
    </div>
    <div class="safe-strip" style="margin-top:10px;">
      🐻 熊熊提醒：最重要是「停止惡化」＋「安全下撤/求援」。
    </div>
  `, `<button class="btn ghost" onclick="closeModal()">關閉</button>`);
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
  if(name==="List") renderList();
  if(name==="Diary"){ renderDiaryPreview(); renderMountainOptions(); renderHikeList(); }
}

// ===== Install Prompt =====
let deferredPrompt = null;
const INSTALL_KEY = "bear100_install_prompt_shown";

function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}
function showInstallHint(){
  if(isInStandalone()) return;
  if(localStorage.getItem(INSTALL_KEY)) return;

  const hint = document.getElementById("installHint");
  const desc = document.getElementById("installDesc");
  const btnInstall = document.getElementById("btnInstall");
  const btnLater = document.getElementById("btnInstallLater");
  if(!hint || !desc || !btnInstall || !btnLater) return;

  if(isIOS()){
    desc.innerHTML = `點擊 Safari 的 <b>分享</b> 圖示<br>再選「<b>加入主畫面</b>」即可 🐻`;
    btnInstall.textContent = "我知道了";
    btnInstall.onclick = ()=>{
      hint.style.display = "none";
      localStorage.setItem(INSTALL_KEY, "1");
    };
  }else{
    btnInstall.onclick = async ()=>{
      if(!deferredPrompt){ toast("此瀏覽器暫不支援一鍵安裝"); return; }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      hint.style.display = "none";
      localStorage.setItem(INSTALL_KEY, "1");
    };
  }

  btnLater.onclick = ()=>{
    hint.style.display = "none";
    localStorage.setItem(INSTALL_KEY, "1");
  };

  hint.style.display = "flex";
}
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredPrompt = e;
});

// ===== 大頭照（一定要放在 init 之前：避免 not defined）=====
async function fileToDataUrlCompressed(file, maxW=1024, quality=0.82){
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((res, rej)=>{ img.onload=res; img.onerror=rej; img.src=url; });
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);

  return canvas.toDataURL("image/jpeg", quality);
}

function applyAvatar(){
  const data = localStorage.getItem(STORAGE.profileAvatar);
  const img = document.getElementById("bearImg");
  const fallback = document.getElementById("bearEmoji");
  if(!img || !fallback) return;

  if(data){
    img.src = data;
    img.style.display = "block";
    fallback.style.display = "none";
  }
}

function bindAvatarUpload(){
  const up = document.getElementById("avatarUpload");      // 你要在 HTML 放 <input id="avatarUpload" type="file" accept="image/*" hidden>
  const avatarBtn = document.getElementById("bearAvatar"); // 點頭像開啟選檔
  if(avatarBtn && up){
    avatarBtn.addEventListener("click", ()=> up.click());
  }
  if(!up) return;

  up.addEventListener("change", async ()=>{
    const f = up.files?.[0];
    if(!f) return;
    try{
      const data = await fileToDataUrlCompressed(f, 640, 0.85);
      localStorage.setItem(STORAGE.profileAvatar, data);
      applyAvatar();
      toast("已更新大頭照 ✅");
    }catch(e){
      console.error(e);
      toast("大頭照更新失敗");
    }
  });
}

// ===== 登山日記：時間/選山/照片/備註 =====
function loadHikes(){ return loadArr(HIKE_KEY); }
function saveHikes(arr){ saveArr(HIKE_KEY, arr); }

function renderMountainOptions(){
  const sel = $("#hikeMountain");
  if(!sel) return;
  sel.innerHTML =
    `<option value="">請選擇山</option>` +
    allMountains.map(m =>
      `<option value="${m.id}">${escapeHtml(m.name)}${m.elevation_m ? `（${m.elevation_m}m）` : ""}</option>`
    ).join("");
}

function renderHikeList(){
  const box = $("#hikeList");
  if(!box) return;
  const arr = loadHikes().slice(0, 8);
  if(arr.length===0){
    box.innerHTML = `<div class="muted">還沒有登山紀錄喔。</div>`;
    return;
  }
  box.innerHTML = arr.map(h=>`
    <div class="mini-card">
      <div style="font-weight:1000;">⛰️ ${escapeHtml(h.mountainName)} <span class="muted small">（${escapeHtml(h.time)}）</span></div>
      ${h.photo ? `<img src="${h.photo}" class="photo-preview" style="display:block;margin-top:10px;">` : ``}
      ${h.note ? `<div style="margin-top:8px;font-size:13px;line-height:1.55;">📝 ${escapeHtml(h.note)}</div>` : ``}
    </div>
  `).join("");
}

function bindDiaryForm(){
  const timeEl = $("#hikeTime");
  const selEl  = $("#hikeMountain");
  const fileEl = $("#hikePhoto");
  const noteEl = $("#hikeNote");
  const prevEl = $("#hikePreview");
  const saveBtn = $("#btnSaveHike");
  if(!timeEl || !selEl || !fileEl || !noteEl || !saveBtn) return;

  if(!timeEl.value){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    timeEl.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  let photoData = "";

  fileEl.addEventListener("change", async ()=>{
    const f = fileEl.files?.[0];
    if(!f) return;
    try{
      photoData = await fileToDataUrlCompressed(f, 1024, 0.82);
      if(prevEl){
        prevEl.src = photoData;
        prevEl.style.display = "block";
      }
    }catch(e){
      console.error(e);
      toast("照片讀取失敗");
    }
  });

  saveBtn.addEventListener("click", ()=>{
    const mountainId = selEl.value;
    if(!mountainId){
      toast("請先選擇山名");
      return;
    }
    const m = allMountains.find(x => String(x.id) === String(mountainId));
    const time = timeEl.value ? timeEl.value.replace("T"," ") : nowISO();
    const note = (noteEl.value || "").trim();

    const arr = loadHikes();
    arr.unshift({
      time,
      mountainId,
      mountainName: m ? m.name : "未知",
      note,
      photo: photoData
    });
    saveHikes(arr.slice(0, 30));

    // 同步：存登山紀錄就勾已征服
    toggleVisited(mountainId);

    // reset
    noteEl.value = "";
    fileEl.value = "";
    photoData = "";
    if(prevEl){ prevEl.style.display="none"; prevEl.src=""; }

    toast("已儲存登山紀錄 ✅");
    renderHikeList();
  });
}

// ===== 抽卡紀錄 modal =====
function openHistoryModal(){
  const arr = loadArr(STORAGE.history);
  if(arr.length===0){
    openModal("📜 抽卡紀錄", `<div class="muted">目前還沒有紀錄。</div>`,
      `<button class="btn ghost" onclick="closeModal()">關閉</button>`);
    return;
  }

  const top = arr.slice(0, 3);
  const html = `
    <div class="muted small">只顯示最新 3 筆</div>
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

  const btn = $("#btnExportHistoryFromModal");
  if(btn) btn.onclick = exportHistoryImage;
}

// ===== init =====
async function init(){
  // modal close
  const closeBtn = $("#modalClose");
  if(closeBtn) closeBtn.onclick = closeModal;

  const modalEl = $("#modal");
  if(modalEl){
    modalEl.addEventListener("click", (e)=>{ if(e.target.id==="modal") closeModal(); });
  }

  // avatar
  applyAvatar();
  bindAvatarUpload();

  // bear quote（可有可無）
  setRandomQuote();
  enableLongPressCopy($("#bearQuote"));

  // ✅ 抽山按鈕：同時支援 .route-card（舊）與 .route-tile（新方格）
  const drawBtns = [...$$(".route-card"), ...$$(".route-tile")];
  drawBtns.forEach(btn=>{
    btn.addEventListener("click", ()=> drawOne(btn.dataset.diff));
  });

  // 其他按鈕（全部防呆）
  const btnDrawAny = $("#btnDrawAny");
  if(btnDrawAny) btnDrawAny.addEventListener("click", ()=> drawOne("any"));

  const btnOpenHistory = $("#btnOpenHistory");
  if(btnOpenHistory) btnOpenHistory.addEventListener("click", openHistoryModal);

  const btnCall = $("#btnCall119");
  if(btnCall) btnCall.addEventListener("click", callEmergency);

  const btnAid = $("#btnFirstAid");
  if(btnAid) btnAid.addEventListener("click", firstAidGuide);

  const searchBox = $("#searchBox");
  if(searchBox) searchBox.addEventListener("input", renderList);

  const filterDiff = $("#filterDiff");
  if(filterDiff) filterDiff.addEventListener("change", renderList);

  const btnSaveDiary = $("#btnSaveDiary");
  if(btnSaveDiary) btnSaveDiary.addEventListener("click", saveDiary);

  const btnExportHistory = $("#btnExportHistory");
  if(btnExportHistory) btnExportHistory.addEventListener("click", exportHistoryImage);

  const btnReset = $("#btnReset");
  if(btnReset){
    btnReset.addEventListener("click", ()=>{
      openModal("🧹 清除本機資料", `
        <div class="muted">確定要清除進度與抽卡紀錄嗎？</div>
        <div class="muted small" style="margin-top:8px;">（只影響本機，不影響你的 GitHub 檔案）</div>
      `, `
        <button class="btn danger" id="btnDoReset">清除</button>
        <button class="btn ghost" onclick="closeModal()">取消</button>
      `);

      const doBtn = $("#btnDoReset");
      if(doBtn) doBtn.onclick = ()=>{
        localStorage.removeItem(STORAGE.visited);
        localStorage.removeItem(STORAGE.history);
        localStorage.removeItem(STORAGE.diary);
        localStorage.removeItem(STORAGE.milestone);
        localStorage.removeItem(STORAGE.conquered);
        localStorage.removeItem(STORAGE.profileAvatar);
        currentMountain = null;
        updateProgress();
        renderList();
        renderDiaryPreview();
        renderHikeList();
        closeModal();
        toast("已清除 ✅");
      };
    });
  }

  // bottom nav
  $$(".nav-item").forEach(btn=> btn.addEventListener("click", ()=> switchPage(btn.dataset.page)));

  // load mountains
  try{
    await loadMountains();
  }catch(e){
    console.error(e);
    openModal("mountains.json 讀取失敗", `
      <div class="muted">請確認根目錄有 <b>mountains.json</b>，且內容為 JSON。</div>
      <div class="muted small" style="margin-top:8px;">GitHub Pages 路徑大小寫要一致：<b>mountains.json</b></div>
    `, `<button class="btn ghost" onclick="closeModal()">知道了</button>`);
  }

  updateProgress();
  renderList();
  renderDiaryPreview();

  // diary form
  renderMountainOptions();
  bindDiaryForm();
  renderHikeList();

  // default page
  switchPage("Draw");

  // install hint
  setTimeout(showInstallHint, 1500);
}

document.addEventListener("DOMContentLoaded", init);
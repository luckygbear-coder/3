// ===================== Keys =====================
const HISTORY_KEY = "hikingBearHistory";        // 抽卡紀錄（最多20）
const VISITED_KEY = "hikingBearVisited";        // 已征服（集卡）
const JOURNAL_KEY = "hikingBearJournal";        // 日記本
const MILESTONE_KEY = "hikingBearMilestoneShown"; // 已顯示過的10座祝賀

const MAX_HISTORY = 20;

// ===================== DOM =====================
const statusPill = document.getElementById("statusPill");
const progressPill = document.getElementById("progressPill");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

const bubble = document.getElementById("bubble");
const bearBtn = document.getElementById("bearBtn");

const btnBeginner = document.getElementById("btnBeginner");
const btnIntermediate = document.getElementById("btnIntermediate");
const btnAdvanced = document.getElementById("btnAdvanced");
const toggleCardMode = document.getElementById("toggleCardMode");

const btnHistory = document.getElementById("btnHistory");
const btnExportHistory = document.getElementById("btnExportHistory");

const searchInput = document.getElementById("searchInput");
const diffFilter = document.getElementById("diffFilter");
const mountainList = document.getElementById("mountainList");

const journalDate = document.getElementById("journalDate");
const journalMountain = document.getElementById("journalMountain");
const journalPhoto = document.getElementById("journalPhoto");
const journalText = document.getElementById("journalText");
const saveJournalBtn = document.getElementById("saveJournal");
const resetJournalBtn = document.getElementById("resetJournal");
const photoPreview = document.getElementById("photoPreview");
const journalQuery = document.getElementById("journalQuery");
const journalList = document.getElementById("journalList");
const exportJournalIG = document.getElementById("exportJournalIG");

const btnResetVisited = document.getElementById("btnResetVisited");
const btnResetHistory = document.getElementById("btnResetHistory");
const btnResetJournal = document.getElementById("btnResetJournal");
const btnResetAll = document.getElementById("btnResetAll");

// Modals
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModal = document.getElementById("closeModal");
const resultCard = document.getElementById("resultCard");
const modalHeadTitle = document.getElementById("modalHeadTitle");

const celeBackdrop = document.getElementById("celeBackdrop");
const closeCele = document.getElementById("closeCele");
const closeCele2 = document.getElementById("closeCele2");
const exportCeleIG = document.getElementById("exportCeleIG");
const celeTitle = document.getElementById("celeTitle");
const celeBody = document.getElementById("celeBody");

// Tabs
const tabs = document.querySelectorAll(".tab");
const pages = {
  draw: document.getElementById("page-draw"),
  mountains: document.getElementById("page-mountains"),
  journal: document.getElementById("page-journal"),
  settings: document.getElementById("page-settings")
};

// ===================== Data =====================
let mountains = [];
let mountainsRich = [];

const diffLabel = { beginner:"新手", intermediate:"進階", advanced:"需帶隊" };

// 強制分級（可自行擴充）
const FORCE_ADVANCED = new Set([
  "中央尖山","南湖大山","南湖大山東峰","南湖大山南峰","南湖北山",
  "大劍山","大霸尖山","小霸尖山","品田山","劍山","無明山"
]);
const FORCE_BEGINNER = new Set([
  "石門山","合歡山主峰","合歡山東峰","合歡山北峰","西合歡山"
]);

// ===================== Utils =====================
function setStatus(t){ if(statusPill) statusPill.textContent = t; }

function safeJsonParse(v, fallback){
  try{ return JSON.parse(v) ?? fallback; }catch{ return fallback; }
}

function loadVisited(){ return safeJsonParse(localStorage.getItem(VISITED_KEY), {}); }
function saveVisited(obj){ localStorage.setItem(VISITED_KEY, JSON.stringify(obj)); }
function isVisited(name){ const v = loadVisited(); return !!v[name]; }

function markVisited(name, checked){
  const v = loadVisited();
  if(checked) v[name] = true;
  else delete v[name];
  saveVisited(v);
  updateProgressUI();
  checkMilestoneAndCelebrate(); // 勾選也算征服進度
}

function loadHistory(){ return safeJsonParse(localStorage.getItem(HISTORY_KEY), []); }
function saveHistory(list){ localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); }
function addHistory(m){
  const list = loadHistory();
  list.unshift({
    name: m.name_zh,
    diff: m.difficulty,
    elev: m.elevation_m,
    time: new Date().toLocaleString("zh-TW")
  });
  saveHistory(list);
}

function loadJournal(){ return safeJsonParse(localStorage.getItem(JOURNAL_KEY), []); }
function saveJournal(list){ localStorage.setItem(JOURNAL_KEY, JSON.stringify(list)); }

function loadMilestoneShown(){ return safeJsonParse(localStorage.getItem(MILESTONE_KEY), 0); }
function saveMilestoneShown(n){ localStorage.setItem(MILESTONE_KEY, JSON.stringify(n)); }

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

// ===================== Difficulty + Enrich =====================
function inferDifficulty(m){
  const name = (m.name_zh || "").trim();
  const elev = Number(m.elevation_m || 0);

  if(FORCE_BEGINNER.has(name)) return "beginner";
  if(FORCE_ADVANCED.has(name)) return "advanced";

  if(elev >= 3600) return "advanced";
  if(elev >= 3300) return "intermediate";
  return "beginner";
}

function hashToIndex(num, mod){
  return Math.abs((num * 2654435761) % 4294967296) % mod;
}

const STORY_TPL = {
  beginner: [
    (m)=>`🐻 熊熊說：${m.name_zh}像是「第一步」——慢慢走，也是在變強。`,
    (m)=>`🐻 熊熊說：今天選${m.name_zh}很棒！你在練的不是速度，是「穩定」。`,
    (m)=>`🐻 熊熊說：站在${m.name_zh}看風景，記得也看看自己：你正在前進。`,
    (m)=>`🐻 熊熊說：別急，先把呼吸找回來。${m.name_zh}會陪你練耐心。`,
    (m)=>`🐻 熊熊說：你願意出門，就已經贏一半了。${m.name_zh}是溫柔的開始。`
  ],
  intermediate: [
    (m)=>`🐻 熊熊說：${m.name_zh}提醒你——準備，是把夢想走得更安全的方式。`,
    (m)=>`🐻 熊熊說：這座山會累，但累不是壞事，它是在幫你打開新的視野。`,
    (m)=>`🐻 熊熊說：走到一半想放棄時，先喝水、補能量，再做決定。`,
    (m)=>`🐻 熊熊說：${m.name_zh}像一個小考驗：配速、補水、保暖，缺一不可。`,
    (m)=>`🐻 熊熊說：你不是在征服山，你是在學會照顧自己。`
  ],
  advanced: [
    (m)=>`🐻 熊熊說：${m.name_zh}不是「硬上」的山，是「尊重」的山。需要夥伴與判斷。`,
    (m)=>`🐻 熊熊說：真正的勇敢，是知道什麼時候該撤退，什麼時候再來。`,
    (m)=>`🐻 熊熊說：高風險路線請別獨行。把安全放第一，才有下一次的冒險。`,
    (m)=>`🐻 熊熊說：這座山會考驗你：天候、地形、心態。先把準備做滿。`,
    (m)=>`🐻 熊熊說：你不需要證明什麼。平安回來，就是滿分。`
  ]
};

const ADVICE_TPL = {
  beginner: [
    ()=>"防曬＋補水＋薄外套。慢慢走、勤休息。",
    ()=>"提早出發避人潮，回程保留體力別摸黑。",
    ()=>"登山杖會很加分，步伐小一點更省力。",
    ()=>"高山紫外線強，帽子/墨鏡/防曬要記得。",
    ()=>"把速度放慢，你會走得更久、更舒服。"
  ],
  intermediate: [
    ()=>"先練長時間步行與爬升，行前睡飽吃好。",
    ()=>"配速保守、補水補鹽，風大時加保暖層。",
    ()=>"若頭痛噁心暈，優先休息觀察，必要就下撤。",
    ()=>"帶頭燈與保暖，天候變化快要留撤退時間。",
    ()=>"分段小目標：下一個轉彎、下一個樹影、下一口水。"
  ],
  advanced: [
    ()=>"建議跟隊/有經驗者同行，路線判讀與時間控管很重要。",
    ()=>"天候不穩直接改期；避免單獨行動，保持隊伍完整。",
    ()=>"準備保暖、防雨、頭燈、急救與備糧，並確實回報行程。",
    ()=>"留足撤退時間與體力，別把『登頂』當成唯一目標。",
    ()=>"遇濃霧/強風/落石風險上升時，優先撤退不猶豫。"
  ]
};

function inferRiskNote(diff){
  if(diff==="beginner") return "⚠️ 天候變化快、紫外線強；記得防曬補水與保暖。";
  if(diff==="intermediate") return "⚠️ 高山症/失溫/午後雷雨常見；請保留撤退時間。";
  return "⚠️ 曝險/迷途/落石風險較高；建議跟隊並確實做行程控管。";
}

function enrichMountain(m){
  const diff = inferDifficulty(m);
  const i1 = hashToIndex(m.id || 1, 5);
  const i2 = hashToIndex((m.id || 1) + 7, 5);

  return {
    ...m,
    difficulty: diff,
    bear_story: STORY_TPL[diff][i1](m),
    bear_advice: "✅ " + ADVICE_TPL[diff][i2](),
    risk_note: inferRiskNote(diff)
  };
}

// ===================== Progress UI =====================
function updateProgressUI(){
  const visited = loadVisited();
  const visitedCount = Object.keys(visited).length;
  const total = mountainsRich?.length ? mountainsRich.length : 100;

  const pct = total ? clamp((visitedCount / total) * 100, 0, 100) : 0;

  if(progressPill) progressPill.textContent = `✅ ${visitedCount} / ${total}`;
  if(progressText) progressText.textContent = `${visitedCount} / ${total}`;
  if(progressFill) progressFill.style.width = `${pct}%`;
}

// ===================== Milestone Celebration =====================
function checkMilestoneAndCelebrate(){
  const visitedCount = Object.keys(loadVisited()).length;
  const milestone = Math.floor(visitedCount / 10) * 10; // 0,10,20...
  const shown = loadMilestoneShown();

  if(milestone >= 10 && milestone > shown){
    // show celebration
    saveMilestoneShown(milestone);
    openCelebration(milestone, visitedCount);
  }
}

function openCelebration(milestone, visitedCount){
  const total = mountainsRich?.length ? mountainsRich.length : 100;
  celeTitle.textContent = `🎉 特別祝賀卡：已征服 ${milestone} 座！`;
  celeBody.innerHTML = `
    <div style="font-weight:800;font-size:16px;margin-bottom:8px;">
      你太猛了！已完成 <span style="color:#ff6b6b;">${milestone}</span> / ${total}
    </div>
    <div style="color:#7a5b6a;font-size:13px;line-height:1.6;">
      🐻 熊熊說：每一步都算數。你不是在跟別人比，你是在超越昨天的自己。<br>
      ✅ 下一個目標：${milestone + 10} 座（再解鎖一張祝賀卡）
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(242,196,139,.95);font-size:12px;color:#7a5b6a;">
      📷 IG @luckygbear
    </div>
  `;
  showBackdrop(celeBackdrop);
}

function showBackdrop(backdrop){
  backdrop.style.display = "flex";
  backdrop.setAttribute("aria-hidden","false");
}
function hideBackdrop(backdrop){
  backdrop.style.display = "none";
  backdrop.setAttribute("aria-hidden","true");
}

// ===================== Draw (Pick) =====================
function pickByDifficulty(diff){
  const poolAll = mountainsRich.filter(x => x.difficulty === diff);
  if(!poolAll.length) return null;

  const cardMode = !!toggleCardMode?.checked;
  if(!cardMode) return poolAll[Math.floor(Math.random() * poolAll.length)];

  const visited = loadVisited();
  const pool = poolAll.filter(m => !visited[m.name_zh]);
  if(!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===================== Render result modal =====================
function renderMountain(m){
  modalHeadTitle.textContent = `抽到：${m.name_zh}`;
  const checked = isVisited(m.name_zh) ? "checked" : "";

  resultCard.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
      <div>
        <div style="font-weight:900;font-size:16px;line-height:1.2;">${m.name_zh}</div>
        <div style="margin-top:6px;color:#7a5b6a;font-size:12px;line-height:1.4;">
          • ${(m.name_en || "").trim()}<br>
          • 海拔 ${m.elevation_m} m
        </div>
      </div>
      <div class="badge">⛰️ ${diffLabel[m.difficulty]}</div>
    </div>

    <div class="checkline">
      <input type="checkbox" id="visitedCheck" ${checked} />
      <span>✔ 我已征服這座山（集卡）</span>
    </div>

    <div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(242,196,139,.95);">
      <div style="font-weight:800;margin-bottom:6px;">爬山熊故事</div>
      <div>${m.bear_story}</div>

      <div style="font-weight:800;margin:10px 0 6px;">熊熊建議</div>
      <div>${m.bear_advice}</div>

      <div style="font-weight:800;margin:10px 0 6px;">風險提醒</div>
      <div>${m.risk_note}</div>
    </div>
  `;

  document.getElementById("visitedCheck")?.addEventListener("change",(e)=>{
    markVisited(m.name_zh, e.target.checked);
    renderMountainList();   // 百岳清單同步
  });
}

// ===================== Mountain List Page =====================
function renderMountainList(){
  const q = (searchInput?.value || "").trim();
  const f = diffFilter?.value || "all";
  const visited = loadVisited();

  let list = mountainsRich.slice();

  if(f !== "all") list = list.filter(m => m.difficulty === f);

  if(q){
    list = list.filter(m => (m.name_zh || "").includes(q) || (m.name_en || "").toLowerCase().includes(q.toLowerCase()));
  }

  // sort: visited last (optional)
  list.sort((a,b)=>{
    const av = visited[a.name_zh] ? 1 : 0;
    const bv = visited[b.name_zh] ? 1 : 0;
    if(av !== bv) return av - bv; // 未征服在前
    return (a.id||0) - (b.id||0);
  });

  mountainList.innerHTML = list.map(m=>{
    const checked = visited[m.name_zh] ? "checked" : "";
    return `
      <div class="item">
        <div class="item-top">
          <div>
            <h3>${m.name_zh}</h3>
            <div class="meta">海拔 ${m.elevation_m}m｜${m.name_en || ""}</div>
          </div>
          <div class="badge">⛰️ ${diffLabel[m.difficulty]}</div>
        </div>

        <label class="checkline">
          <input type="checkbox" data-visit="${escapeHtml(m.name_zh)}" ${checked} />
          <span>✔ 已征服</span>
        </label>
      </div>
    `;
  }).join("");

  mountainList.querySelectorAll("input[type='checkbox'][data-visit]").forEach(chk=>{
    chk.addEventListener("change",(e)=>{
      const name = unescapeHtml(e.target.getAttribute("data-visit"));
      markVisited(name, e.target.checked);
    });
  });
}

// ===================== Journal =====================
let journalPhotoDataUrl = "";

function setTodayDateIfEmpty(){
  if(!journalDate.value){
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    journalDate.value = `${yyyy}-${mm}-${dd}`;
  }
}

function renderJournalMountainOptions(){
  const opts = mountainsRich
    .slice()
    .sort((a,b)=> (a.id||0)-(b.id||0))
    .map(m=> `<option value="${escapeHtml(m.name_zh)}">${m.name_zh}</option>`)
    .join("");
  journalMountain.innerHTML = opts;
}

function renderJournalList(){
  const q = (journalQuery?.value || "").trim();
  const list = loadJournal()
    .slice()
    .sort((a,b)=> (b.date||"").localeCompare(a.date||"") || (b.time||0)-(a.time||0));

  const filtered = q
    ? list.filter(x => (x.date||"").includes(q) || (x.mountain||"").includes(q))
    : list;

  journalList.innerHTML = filtered.length ? filtered.map((j,idx)=>{
    const img = j.photo ? `<div class="photo-preview"><img src="${j.photo}" alt="照片"/></div>` : "";
    const text = (j.text || "").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
    return `
      <div class="item">
        <div class="item-top">
          <div>
            <h3>${j.mountain}</h3>
            <div class="meta">${j.date}｜${j.elev ? `海拔 ${j.elev}m` : ""}</div>
          </div>
          <button class="mini" data-del="${idx}">刪除</button>
        </div>
        ${img}
        <div class="meta" style="margin-top:8px;color:#4b3044;">${text || "（無文字）"}</div>
      </div>
    `;
  }).join("") : `<div class="item"><div class="meta">尚無紀錄。先寫一篇日記吧 🐻</div></div>`;

  // delete
  journalList.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.getAttribute("data-del"));
      const all = loadJournal().slice().sort((a,b)=> (b.date||"").localeCompare(a.date||"") || (b.time||0)-(a.time||0));
      // 對應到排序後的 idx，需找回同一筆
      const target = all[idx];
      if(!target) return;
      const raw = loadJournal();
      const next = raw.filter(x => x.id !== target.id);
      saveJournal(next);
      renderJournalList();
    });
  });
}

function clearJournalForm(){
  journalPhotoDataUrl = "";
  journalText.value = "";
  photoPreview.hidden = true;
  photoPreview.innerHTML = "";
  setTodayDateIfEmpty();
}

journalPhoto?.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;

  // ⚠️ 注意：照片轉 base64 會變大，建議用較小照片；先直接存（你要我幫你加壓縮也可以）
  const reader = new FileReader();
  reader.onload = ()=>{
    journalPhotoDataUrl = String(reader.result || "");
    photoPreview.hidden = false;
    photoPreview.innerHTML = `<img src="${journalPhotoDataUrl}" alt="預覽" />`;
  };
  reader.readAsDataURL(file);
});

saveJournalBtn?.addEventListener("click", ()=>{
  const date = journalDate.value;
  const mountain = unescapeHtml(journalMountain.value || "");
  const text = (journalText.value || "").trim();

  if(!date) return alert("請選日期");
  if(!mountain) return alert("請選山名");
  if(!text && !journalPhotoDataUrl) return alert("請至少上傳照片或寫一段話");

  const m = mountainsRich.find(x => x.name_zh === mountain);
  const entry = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random(),
    date,
    mountain,
    elev: m?.elevation_m || "",
    photo: journalPhotoDataUrl || "",
    text,
    time: Date.now()
  };

  const list = loadJournal();
  list.push(entry);
  saveJournal(list);

  // 建議：寫日記通常代表去過，也幫你順便勾選征服
  if(!isVisited(mountain)){
    markVisited(mountain, true);
    renderMountainList();
  }

  setStatus("✅ 日記已儲存");
  setTimeout(()=> setStatus("⛰️ 今日狀態：準備出發"), 1200);

  clearJournalForm();
  renderJournalList();
  checkMilestoneAndCelebrate();
});

resetJournalBtn?.addEventListener("click", clearJournalForm);
journalQuery?.addEventListener("input", renderJournalList);

// 匯出最新日記 IG 圖
exportJournalIG?.addEventListener("click", ()=>{
  const list = loadJournal().slice().sort((a,b)=> (b.time||0)-(a.time||0));
  if(!list.length) return alert("尚無日記可匯出");
  exportJournalAsIG(list[0]);
});

// ===================== Export IG Images =====================
function exportHistoryAsIG(){
  const history = loadHistory();
  const visitedCount = Object.keys(loadVisited()).length;
  const total = mountainsRich?.length ? mountainsRich.length : 100;

  const lines = history.slice(0,6).map((h,i)=>`${i+1}. ${h.name}（${h.elev}m）`);
  const subtitle = `集卡進度：${visitedCount} / ${total}`;

  exportIGCanvas({
    title: "爬山熊・抽卡紀錄",
    subtitle,
    lines,
    footer: "IG @luckygbear"
  }, "hikingbear-history.png");
}

function exportCelebrationAsIG(milestone){
  const visitedCount = Object.keys(loadVisited()).length;
  const total = mountainsRich?.length ? mountainsRich.length : 100;

  exportIGCanvas({
    title: "🎉 特別祝賀卡",
    subtitle: `已征服 ${milestone} / ${total}`,
    lines: [
      "🐻 熊熊說：每一步都算數。",
      "你不是在跟別人比，",
      "你是在超越昨天的自己。",
      `下一目標：${milestone + 10} 座`
    ],
    footer: "IG @luckygbear"
  }, `hikingbear-celebrate-${milestone}.png`);
}

function exportJournalAsIG(entry){
  const lines = [];
  lines.push(`日期：${entry.date}`);
  lines.push(`山名：${entry.mountain}`);
  if(entry.elev) lines.push(`海拔：${entry.elev}m`);

  const text = (entry.text || "").trim();
  if(text){
    // 只取前3行避免爆版
    const tlines = text.split("\n").slice(0,3);
    tlines.forEach(l => lines.push(l));
  }

  exportIGCanvas({
    title: "📔 山旅日記",
    subtitle: "把回憶收藏起來",
    lines,
    footer: "IG @luckygbear",
    photoDataUrl: entry.photo || ""
  }, "hikingbear-journal.png");
}

function exportIGCanvas(payload, filename){
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  // BG
  ctx.fillStyle = "#ffeec9";
  ctx.fillRect(0,0,1080,1080);

  // Card
  roundRect(ctx, 60, 70, 960, 940, 38);
  ctx.fillStyle = "#fff7e6";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(242,196,139,.95)";
  ctx.stroke();

  // Title
  ctx.fillStyle = "#4b3044";
  ctx.font = "900 56px system-ui, -apple-system, sans-serif";
  wrapText(ctx, payload.title, 110, 170, 860, 62);

  // Subtitle
  ctx.fillStyle = "#7a5b6a";
  ctx.font = "700 34px system-ui, -apple-system, sans-serif";
  wrapText(ctx, payload.subtitle || "", 110, 250, 860, 44);

  let y = 330;

  // Optional photo
  const photo = payload.photoDataUrl || "";
  const drawLines = () => {
    ctx.fillStyle = "#4b3044";
    ctx.font = "600 38px system-ui, -apple-system, sans-serif";
    (payload.lines || []).slice(0,10).forEach(line=>{
      y += 56;
      wrapText(ctx, "• " + line, 120, y, 840, 50);
    });

    // Footer
    ctx.fillStyle = "#7a5b6a";
    ctx.font = "700 34px system-ui, -apple-system, sans-serif";
    ctx.fillText(payload.footer || "IG @luckygbear", 110, 1000);

    // Download
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  if(photo){
    const img = new Image();
    img.onload = ()=>{
      // photo box
      roundRect(ctx, 110, y, 860, 420, 26);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "rgba(242,196,139,.8)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // draw image cover-like
      const boxX = 110, boxY = y, boxW = 860, boxH = 420;
      const ir = img.width / img.height;
      const br = boxW / boxH;

      let dw, dh, dx, dy;
      if(ir > br){
        dh = boxH;
        dw = dh * ir;
        dx = boxX - (dw - boxW)/2;
        dy = boxY;
      }else{
        dw = boxW;
        dh = dw / ir;
        dx = boxX;
        dy = boxY - (dh - boxH)/2;
      }
      ctx.save();
      // clip rounded
      clipRoundRect(ctx, boxX, boxY, boxW, boxH, 26);
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      y += 420 + 10;
      drawLines();
    };
    img.src = photo;
  }else{
    drawLines();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  if(!text) return;
  const words = String(text).split("");
  let line = "";
  for(let i=0;i<words.length;i++){
    const test = line + words[i];
    const w = ctx.measureText(test).width;
    if(w > maxWidth && i>0){
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    }else{
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function clipRoundRect(ctx, x, y, w, h, r){
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
}

// ===================== Bear Lines + copy =====================
const BEAR_LINES = [
  "🐻 熊熊說：你不用很厲害才開始，你開始了就會越來越厲害。",
  "🐻 熊熊說：把安全放第一名，你就已經是高手了。",
  "🐻 熊熊說：慢慢走、好好呼吸，風景會在前方等你。",
  "🐻 熊熊說：登山不是比快，是比誰更會照顧自己。",
  "🐻 熊熊說：天氣不好就改期，改期也是一種勇敢。"
];
let bearLineIdx = 0;

function nextBearLine(){
  bearLineIdx = (bearLineIdx + 1) % BEAR_LINES.length;
  bubble.innerHTML = `${BEAR_LINES[bearLineIdx]}<div class="hint">提示：長按可複製小語</div>`;
}

bearBtn?.addEventListener("click", nextBearLine);

// long press copy
let pressTimer = null;
function copyBubble(){
  const text = bubble?.innerText?.trim() || "";
  if(!text) return;
  navigator.clipboard?.writeText(text).then(()=>{
    setStatus("✅ 已複製熊熊小語");
    setTimeout(()=> setStatus("⛰️ 今日狀態：準備出發"), 1200);
  }).catch(()=>{});
}
bearBtn?.addEventListener("touchstart", ()=>{ pressTimer = setTimeout(copyBubble, 550); }, {passive:true});
bearBtn?.addEventListener("touchend", ()=>{ if(pressTimer) clearTimeout(pressTimer); pressTimer=null; });
bearBtn?.addEventListener("mousedown", ()=>{ pressTimer = setTimeout(copyBubble, 550); });
bearBtn?.addEventListener("mouseup", ()=>{ if(pressTimer) clearTimeout(pressTimer); pressTimer=null; });

// ===================== Tabs =====================
tabs.forEach(t=>{
  t.addEventListener("click", ()=>{
    tabs.forEach(x=>x.classList.remove("active"));
    t.classList.add("active");

    const key = t.getAttribute("data-tab");
    Object.values(pages).forEach(p=>p.classList.remove("active"));
    pages[key].classList.add("active");

    // refresh
    updateProgressUI();
    if(key === "mountains") renderMountainList();
    if(key === "journal") renderJournalList();
  });
});

// ===================== Modal events =====================
closeModal?.addEventListener("click", ()=> hideBackdrop(modalBackdrop));
modalBackdrop?.addEventListener("click", (e)=>{ if(e.target === modalBackdrop) hideBackdrop(modalBackdrop); });

closeCele?.addEventListener("click", ()=> hideBackdrop(celeBackdrop));
closeCele2?.addEventListener("click", ()=> hideBackdrop(celeBackdrop));
celeBackdrop?.addEventListener("click", (e)=>{ if(e.target === celeBackdrop) hideBackdrop(celeBackdrop); });

exportCeleIG?.addEventListener("click", ()=>{
  const shown = loadMilestoneShown();
  if(!shown) return alert("尚未達成里程碑");
  exportCelebrationAsIG(shown);
});

// ===================== Buttons (Draw) =====================
btnBeginner?.addEventListener("click", ()=>{
  const m = pickByDifficulty("beginner");
  if(!m) return alert("這個難度目前已被你集滿（或資料尚未載入）");
  addHistory(m);
  renderMountain(m);
  showBackdrop(modalBackdrop);
});

btnIntermediate?.addEventListener("click", ()=>{
  const m = pickByDifficulty("intermediate");
  if(!m) return alert("這個難度目前已被你集滿（或資料尚未載入）");
  addHistory(m);
  renderMountain(m);
  showBackdrop(modalBackdrop);
});

btnAdvanced?.addEventListener("click", ()=>{
  const m = pickByDifficulty("advanced");
  if(!m) return alert("這個難度目前已被你集滿（或資料尚未載入）");
  addHistory(m);
  renderMountain(m);
  showBackdrop(modalBackdrop);
});

btnHistory?.addEventListener("click", ()=>{
  const list = loadHistory();
  if(!list.length) return alert("尚無抽卡紀錄");
  const lines = list.slice(0,10).map(h=>`${h.name}｜${diffLabel[h.diff]}｜${h.elev}m｜${h.time}`);
  alert(lines.join("\n"));
});

btnExportHistory?.addEventListener("click", exportHistoryAsIG);

// ===================== Mountain list events =====================
searchInput?.addEventListener("input", renderMountainList);
diffFilter?.addEventListener("change", renderMountainList);

// ===================== Settings =====================
btnResetVisited?.addEventListener("click", ()=>{
  if(!confirm("確定要重置「已征服」嗎？")) return;
  localStorage.removeItem(VISITED_KEY);
  localStorage.removeItem(MILESTONE_KEY);
  updateProgressUI();
  renderMountainList();
  setStatus("✅ 已重置征服清單");
});

btnResetHistory?.addEventListener("click", ()=>{
  if(!confirm("確定要清除抽卡紀錄嗎？")) return;
  localStorage.removeItem(HISTORY_KEY);
  setStatus("✅ 已清除抽卡紀錄");
});

btnResetJournal?.addEventListener("click", ()=>{
  if(!confirm("確定要清除日記本嗎？")) return;
  localStorage.removeItem(JOURNAL_KEY);
  renderJournalList();
  setStatus("✅ 已清除日記本");
});

btnResetAll?.addEventListener("click", ()=>{
  if(!confirm("確定要全部清除（重置 App）嗎？")) return;
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(VISITED_KEY);
  localStorage.removeItem(JOURNAL_KEY);
  localStorage.removeItem(MILESTONE_KEY);
  journalPhotoDataUrl = "";
  updateProgressUI();
  renderMountainList();
  renderJournalList();
  setStatus("✅ 已全部重置");
});

// ===================== Load Mountains =====================
async function loadMountains(){
  try{
    setStatus("⛰️ 載入百岳資料中…");

    // 正確路徑：同層 mountains.rich.json ✅
    const res = await fetch("./mountains.rich.json", { cache:"no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    mountains = Array.isArray(data) ? data : (data.mountains || []);

    mountainsRich = mountains.map(enrichMountain);

    setStatus("⛰️ 今日狀態：準備出發");
    updateProgressUI();

    // init journal select + list
    renderMountainList();
    renderJournalMountainOptions();
    setTodayDateIfEmpty();
    renderJournalList();

    // milestone check on load
    checkMilestoneAndCelebrate();

  }catch(err){
    console.error(err);
    setStatus("❌ 載入失敗：請確認 mountains.rich.json 是否同層");
    mountainsRich = [];
    updateProgressUI();
  }
}

// ===================== Escape helpers =====================
function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function unescapeHtml(str){
  return String(str).replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"').replaceAll("&#039;","'").replaceAll("&amp;","&");
}

// ===================== Start =====================
loadMountains();
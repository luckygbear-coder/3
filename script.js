let mountains = [];
let selectedDiff = "beginner";
let currentMountain = null;

const LS_CONQUERED = "conquered";
const LS_JOURNAL = "journal_entries";
const conquered = new Set(JSON.parse(localStorage.getItem(LS_CONQUERED) || "[]"));

let journalEntries = JSON.parse(localStorage.getItem(LS_JOURNAL) || "[]");

/* ===== 抽山頁 ===== */
const progressCount = document.getElementById("progressCount");
const progressCount2 = document.getElementById("progressCount2");
const progressFill = document.getElementById("progressFill");
const bearTalk = document.getElementById("bearTalk");

const modal = document.getElementById("modal");
const modalMask = document.getElementById("modalMask");
const modalClose = document.getElementById("modalClose");
const btnLater = document.getElementById("btnLater");

const mBigTitle = document.getElementById("mBigTitle");
const mSubline = document.getElementById("mSubline");
const mName = document.getElementById("mName");
const mInfo = document.getElementById("mInfo");
const mStory = document.getElementById("mStory");
const mAdvice = document.getElementById("mAdvice");
const mRisk = document.getElementById("mRisk");

const btnDraw = document.getElementById("btnDraw");
const btnConquer = document.getElementById("btnConquer");
const btnHistory = document.getElementById("btnHistory");
const btnExport = document.getElementById("btnExport");

/* ===== 分頁 ===== */
const pageDraw = document.getElementById("pageDraw");
const pageList = document.getElementById("pageList");
const pageJournal = document.getElementById("pageJournal");
const dock = document.getElementById("dock");
const navBtns = document.querySelectorAll(".nav-btn");

/* ===== 百岳頁 ===== */
const listDoneCount = document.getElementById("listDoneCount");
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const chips = document.querySelectorAll(".chip");
const mountainList = document.getElementById("mountainList");

let activeFilter = "all";
let searchQuery = "";

/* ===== 日記頁 ===== */
const journalCount = document.getElementById("journalCount");
const jDate = document.getElementById("jDate");
const jMountain = document.getElementById("jMountain");
const jMood = document.getElementById("jMood");
const jNote = document.getElementById("jNote");
const btnAddJournal = document.getElementById("btnAddJournal");
const btnQuickFromCard = document.getElementById("btnQuickFromCard");
const btnClearJournal = document.getElementById("btnClearJournal");
const journalList = document.getElementById("journalList");

/* ===== 讀資料 ===== */
fetch("./mountains.json")
  .then(r => r.json())
  .then(data => {
    mountains = (data.mountains || []).slice().sort((a,b)=>a.id-b.id);
    updateProgress();
    wireRoutes();
    wireBearTalkCopy();
    wireNav();
    wireListUI();
    wireJournalUI();
    renderList();
    renderJournal();
  })
  .catch(() => alert("讀取 mountains.json 失敗，請確認檔案在同一層且格式正確。"));

/* ===== 分頁切換 ===== */
function wireNav(){
  navBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const page = btn.dataset.page;

      navBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      // 先全部隱藏
      pageDraw.classList.add("hidden");
      pageList.classList.add("hidden");
      pageJournal.classList.add("hidden");
      dock.classList.add("hidden");

      if(page === "draw"){
        pageDraw.classList.remove("hidden");
        dock.classList.remove("hidden");
      }else if(page === "list"){
        pageList.classList.remove("hidden");
        listDoneCount.textContent = conquered.size;
      }else if(page === "journal"){
        pageJournal.classList.remove("hidden");
        journalCount.textContent = journalEntries.length;
      }else{
        toast("設定分頁我下一步幫你做 🙂");
        // 預設回抽山
        navBtns.forEach(b=>b.classList.remove("active"));
        document.querySelector('.nav-btn[data-page="draw"]').classList.add("active");
        pageDraw.classList.remove("hidden");
        dock.classList.remove("hidden");
      }
    });
  });
}

/* ===== 抽山頁：路線 ===== */
function wireRoutes(){
  document.querySelectorAll(".route").forEach(el => {
    el.addEventListener("click", () => {
      selectedDiff = el.dataset.diff;
      toast(`已選擇：${getDiffLabel(selectedDiff)}`);
    });
  });
}
function getDiffLabel(d){
  if(d==="beginner") return "新手百岳";
  if(d==="intermediate") return "進階挑戰";
  return "需帶隊";
}

btnDraw.addEventListener("click", () => {
  const collect = document.getElementById("collectMode").checked;

  let pool = mountains.filter(m => m.difficulty === selectedDiff);
  if (collect) pool = pool.filter(m => !conquered.has(m.id));

  if (pool.length === 0) {
    openModal({
      title: "你太猛了！",
      sub: `這個分類已抽完（${getDiffLabel(selectedDiff)}）`,
      name: "—",
      info: "—",
      story: "🐻 熊熊說：先休息一下也很棒！換個分類試試看～",
      advice: "✅ 小提醒：安全與補給永遠放第一。",
      risk: ""
    });
    return;
  }

  currentMountain = pool[Math.floor(Math.random() * pool.length)];
  openModal({
    title: "你太猛了！",
    sub: `已完成 ${conquered.size} / 100`,
    name: `${currentMountain.name_zh}（${currentMountain.elevation_m}m）`,
    info: `${currentMountain.name_en}｜${currentMountain.difficulty_zh}`,
    story: currentMountain.bear_story,
    advice: currentMountain.bear_advice,
    risk: currentMountain.risk_note
  });
});

btnConquer.addEventListener("click", () => {
  if (!currentMountain) return;

  if (!conquered.has(currentMountain.id)) {
    conquered.add(currentMountain.id);
    persistConquered();
    updateProgress();
    listDoneCount.textContent = conquered.size;
    renderList();

    mBigTitle.textContent = "做得好！這一步很關鍵！";
    mSubline.textContent = `已完成 ${conquered.size} / 100（下一個目標：${nextMilestone(conquered.size)}）`;

    toast(`🎉 已征服：${currentMountain.name_zh}`);
  } else {
    toast("你已經征服過這座了 ✅");
  }
});

btnHistory.addEventListener("click", () => {
  alert("📜 抽卡紀錄：我下一步可做成「三筆＋可捲動」彈窗");
});
btnExport.addEventListener("click", () => {
  alert("📸 匯出 IG 祝賀圖：我下一步可做成一鍵產圖下載");
});

/* ===== Modal ===== */
modalMask.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);
btnLater.addEventListener("click", closeModal);

function openModal({title, sub, name, info, story, advice, risk}){
  mBigTitle.textContent = title || "你太猛了！";
  mSubline.textContent = sub || "";
  mName.textContent = name || "—";
  mInfo.textContent = info || "—";
  mStory.textContent = story || "";
  mAdvice.textContent = advice || "";
  mRisk.textContent = risk || "";

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

/* ===== 進度 ===== */
function updateProgress(){
  progressCount.textContent = conquered.size;
  progressCount2.textContent = conquered.size;
  progressFill.style.width = `${Math.min(100, conquered.size)}%`;

  const lines = [
    "🐻 熊熊說：把安全放第一名，你就已經是高手了。",
    "🐻 熊熊說：每一步都算數。你不是在跟別人比，你是在超越昨天的自己。",
    "🐻 熊熊說：累了就休息，休息不是放棄，是為了走更遠。",
    "🐻 熊熊說：天氣不對就撤退，這叫成熟的勇敢。"
  ];
  bearTalk.firstChild.nodeValue = lines[conquered.size % lines.length];
}
function nextMilestone(n){
  const next = Math.ceil((n+1)/10)*10;
  return `${next} 座（再解鎖一張祝賀卡）`;
}
function persistConquered(){
  localStorage.setItem(LS_CONQUERED, JSON.stringify([...conquered]));
}

/* ===== 長按複製小語 ===== */
function wireBearTalkCopy(){
  let pressTimer = null;

  bearTalk.addEventListener("touchstart", () => {
    pressTimer = setTimeout(() => copyBearTalk(), 500);
  }, {passive:true});

  bearTalk.addEventListener("touchend", () => {
    if (pressTimer) clearTimeout(pressTimer);
  });

  bearTalk.addEventListener("mousedown", () => {
    pressTimer = setTimeout(() => copyBearTalk(), 500);
  });

  bearTalk.addEventListener("mouseup", () => {
    if (pressTimer) clearTimeout(pressTimer);
  });
}
function copyBearTalk(){
  const text = bearTalk.innerText.replace("提示：長按可複製小語","").trim();
  navigator.clipboard?.writeText(text);
  toast("已複製熊熊小語 ✅");
}

/* ===== 百岳頁：搜尋/篩選/渲染 ===== */
function wireListUI(){
  listDoneCount.textContent = conquered.size;

  searchInput.addEventListener("input", () => {
    searchQuery = (searchInput.value || "").trim().toLowerCase();
    renderList();
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    renderList();
  });

  chips.forEach(chip=>{
    chip.addEventListener("click", ()=>{
      chips.forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      renderList();
    });
  });
}

function renderList(){
  if(!mountainList) return;

  const q = searchQuery;

  let items = mountains.slice();

  items = items.filter(m=>{
    const isDone = conquered.has(m.id);

    if(activeFilter === "beginner" || activeFilter === "intermediate" || activeFilter === "advanced"){
      if(m.difficulty !== activeFilter) return false;
    }
    if(activeFilter === "done" && !isDone) return false;
    if(activeFilter === "todo" && isDone) return false;

    if(q){
      const hay = [
        m.name_zh, m.name_en, String(m.elevation_m),
        m.difficulty_zh, m.difficulty
      ].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  mountainList.innerHTML = items.map(m => {
    const isDone = conquered.has(m.id);
    const badgeClass = m.difficulty;
    const badgeText =
      m.difficulty === "beginner" ? "新手友善" :
      m.difficulty === "intermediate" ? "需要經驗" :
      "建議帶隊";

    return `
      <div class="m-item" data-id="${m.id}">
        <input class="m-check" type="checkbox" ${isDone ? "checked" : ""} aria-label="已征服" />
        <div class="m-main">
          <div class="m-top">
            <div class="m-name">${m.id}. ${m.name_zh}（${m.elevation_m}m）</div>
            <div class="badge ${badgeClass}">${badgeText}</div>
          </div>
          <div class="m-meta">${m.name_en}</div>
          <div class="m-actions">
            <button class="m-btn" data-act="view">看卡片</button>
            <button class="m-btn ${isDone ? "" : "primary"}" data-act="toggle">
              ${isDone ? "取消征服" : "標記已征服"}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  mountainList.onclick = (e) => {
    const item = e.target.closest(".m-item");
    if(!item) return;

    const id = Number(item.dataset.id);
    const m = mountains.find(x=>x.id===id);
    if(!m) return;

    if(e.target.classList.contains("m-check")){
      setDone(id, e.target.checked);
      return;
    }

    const act = e.target.dataset.act;
    if(act === "view"){
      currentMountain = m;
      openModal({
        title: "百岳卡片",
        sub: `已完成 ${conquered.size} / 100`,
        name: `${m.name_zh}（${m.elevation_m}m）`,
        info: `${m.name_en}｜${m.difficulty_zh}`,
        story: m.bear_story,
        advice: m.bear_advice,
        risk: m.risk_note
      });
      return;
    }
    if(act === "toggle"){
      const now = conquered.has(id);
      setDone(id, !now);
      return;
    }
  };
}

function setDone(id, done){
  if(done) conquered.add(id);
  else conquered.delete(id);

  persistConquered();
  updateProgress();
  listDoneCount.textContent = conquered.size;

  renderList();
  toast(done ? "✅ 已標記征服" : "↩️ 已取消征服");
}

/* ===== 日記頁 ===== */
function wireJournalUI(){
  // 預設日期：今天
  if(jDate && !jDate.value){
    jDate.value = new Date().toISOString().slice(0,10);
  }

  // 山名下拉：載入百岳
  jMountain.innerHTML = `
    <option value="">— 選擇百岳（可空白）—</option>
    ${mountains.map(m => `<option value="${m.id}">${m.id}. ${m.name_zh}（${m.elevation_m}m）</option>`).join("")}
  `;

  btnAddJournal.addEventListener("click", addJournal);
  btnQuickFromCard.addEventListener("click", () => {
    if(!currentMountain){
      toast("先去「抽山」抽到一座，再回來帶入喔～");
      return;
    }
    jMountain.value = String(currentMountain.id);
    toast(`已帶入：${currentMountain.name_zh}`);
  });

  btnClearJournal.addEventListener("click", () => {
    if(!confirm("確定要清空全部日記嗎？（無法復原）")) return;
    journalEntries = [];
    saveJournal();
    renderJournal();
    toast("已清空日記");
  });

  // 列表按鈕事件代理
  journalList.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    const item = e.target.closest(".j-item");
    if(!btn || !item) return;

    const id = item.dataset.id;
    if(btn.dataset.act === "delete"){
      if(!confirm("刪除這筆日記？")) return;
      journalEntries = journalEntries.filter(x => x.id !== id);
      saveJournal();
      renderJournal();
      toast("已刪除");
    }
    if(btn.dataset.act === "openCard"){
      const mId = item.dataset.mid;
      const m = mountains.find(x => String(x.id) === String(mId));
      if(!m){
        toast("這筆沒有綁定山名，或 mountains.json 找不到。");
        return;
      }
      currentMountain = m;
      openModal({
        title: "日記中的百岳卡片",
        sub: `已完成 ${conquered.size} / 100`,
        name: `${m.name_zh}（${m.elevation_m}m）`,
        info: `${m.name_en}｜${m.difficulty_zh}`,
        story: m.bear_story,
        advice: m.bear_advice,
        risk: m.risk_note
      });
    }
  });
}

function addJournal(){
  const date = (jDate.value || "").trim();
  const mood = (jMood.value || "").trim();
  const note = (jNote.value || "").trim();
  const mid = (jMountain.value || "").trim();

  if(!date){
    toast("請選日期");
    return;
  }

  const m = mid ? mountains.find(x => String(x.id) === String(mid)) : null;

  const entry = {
    id: cryptoRandomId(),
    date,
    mood,
    mountain_id: m ? m.id : null,
    mountain_name: m ? m.name_zh : "",
    elevation_m: m ? m.elevation_m : null,
    note
  };

  // 最新在前
  journalEntries.unshift(entry);
  saveJournal();
  renderJournal();

  // 清空心得
  jNote.value = "";
  toast("已新增日記 ✅");
}

function renderJournal(){
  journalCount.textContent = journalEntries.length;

  if(journalEntries.length === 0){
    journalList.innerHTML = `<div class="small">目前還沒有日記～新增一筆吧 🐻</div>`;
    return;
  }

  journalList.innerHTML = journalEntries.map(e => {
    const title = e.mountain_name
      ? `${e.mood}｜${e.mountain_name}${e.elevation_m ? `（${e.elevation_m}m）` : ""}`
      : `${e.mood}｜（未選山名）`;

    const sub = `${e.date}${e.mountain_id ? `｜百岳 #${e.mountain_id}` : ""}`;

    return `
      <div class="j-item" data-id="${e.id}" data-mid="${e.mountain_id || ""}">
        <div class="j-top">
          <div>
            <div class="j-title">${escapeHtml(title)}</div>
            <div class="j-sub">${escapeHtml(sub)}</div>
          </div>
          <button class="j-btn danger" data-act="delete">刪除</button>
        </div>

        ${e.note ? `<div class="j-note">${escapeHtml(e.note)}</div>` : `<div class="small">（沒有寫心得）</div>`}

        <div class="j-mini-actions">
          <button class="j-btn" data-act="openCard" ${e.mountain_id ? "" : "disabled"}>看這座山卡片</button>
        </div>
      </div>
    `;
  }).join("");
}

function saveJournal(){
  localStorage.setItem(LS_JOURNAL, JSON.stringify(journalEntries));
}

/* ===== 小工具 ===== */
function cryptoRandomId(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

/* ===== toast ===== */
let toastTimer = null;
function toast(msg){
  let el = document.getElementById("toast");
  if(!el){
    el = document.createElement("div");
    el.id = "toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.bottom = "140px";
    el.style.padding = "10px 12px";
    el.style.background = "rgba(0,0,0,.75)";
    el.style.color = "#fff";
    el.style.borderRadius = "12px";
    el.style.fontSize = "13px";
    el.style.zIndex = "80";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.style.display="none"; }, 1200);
}
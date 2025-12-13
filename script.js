let mountains = [];
let selectedDiff = "beginner";
let currentMountain = null;

const LS_CONQUERED = "conquered";
const conquered = JSON.parse(localStorage.getItem(LS_CONQUERED) || "[]");

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

fetch("./mountains.json")
  .then(r => r.json())
  .then(data => {
    mountains = data.mountains || [];
    updateProgress();
    wireRoutes();
    wireBearTalkCopy();
  })
  .catch(() => {
    alert("讀取 mountains.json 失敗，請確認檔案在同一層且格式正確。");
  });

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
  if (collect) pool = pool.filter(m => !conquered.includes(m.id));

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
  const done = conquered.length;

  openModal({
    title: "你太猛了！",
    sub: `已完成 ${done} / 100`,
    name: `${currentMountain.name_zh}（${currentMountain.elevation_m}m）`,
    info: `${currentMountain.name_en}｜${currentMountain.difficulty_zh}`,
    story: currentMountain.bear_story,
    advice: currentMountain.bear_advice,
    risk: currentMountain.risk_note
  });
});

btnConquer.addEventListener("click", () => {
  if (!currentMountain) return;

  if (!conquered.includes(currentMountain.id)) {
    conquered.push(currentMountain.id);
    localStorage.setItem(LS_CONQUERED, JSON.stringify(conquered));
    updateProgress();

    // 征服後更新彈窗文案（保留你截圖的感覺）
    mBigTitle.textContent = "做得好！這一步很關鍵！";
    mSubline.textContent = `已完成 ${conquered.length} / 100（下一個目標：${nextMilestone(conquered.length)}）`;

    toast(`🎉 已征服：${currentMountain.name_zh}`);
  } else {
    toast("你已經征服過這座了 ✅");
  }
});

btnHistory.addEventListener("click", () => {
  alert("📜 抽卡紀錄：下一步我可以幫你做成可捲動列表（最近 30 筆）");
});

btnExport.addEventListener("click", () => {
  alert("📸 匯出 IG 祝賀圖：下一步我可以幫你做成一鍵產圖下載（不會爆版）");
});

/* Modal open/close */
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
  document.body.style.overflow = "hidden"; // 避免背景滑動
}

function closeModal(){
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

/* Progress */
function updateProgress(){
  progressCount.textContent = conquered.length;
  progressCount2.textContent = conquered.length;
  progressFill.style.width = `${Math.min(100, conquered.length)}%`;

  // 熊熊小語也可以換一換
  const lines = [
    "🐻 熊熊說：把安全放第一名，你就已經是高手了。",
    "🐻 熊熊說：每一步都算數。你不是在跟別人比，你是在超越昨天的自己。",
    "🐻 熊熊說：累了就休息，休息不是放棄，是為了走更遠。",
    "🐻 熊熊說：天氣不對就撤退，這叫成熟的勇敢。"
  ];
  bearTalk.firstChild.nodeValue = lines[conquered.length % lines.length];
}

function nextMilestone(n){
  const next = Math.ceil((n+1)/10)*10;
  return `${next} 座（再解鎖一張祝賀卡）`;
}

/* 長按複製小語 */
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

/* 小提示 toast（不擋操作） */
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
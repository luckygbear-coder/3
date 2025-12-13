let mountains = [];
let selectedDiff = "beginner";
let currentMountain = null;

const conquered = JSON.parse(localStorage.getItem("conquered") || "[]");

const progressCount = document.getElementById("progressCount");
const progressFill = document.getElementById("progressFill");
const resultCard = document.getElementById("resultCard");

fetch("./mountains.json")
  .then(r => r.json())
  .then(data => {
    mountains = data.mountains;
    updateProgress();
  });

document.querySelectorAll(".route").forEach(r => {
  r.onclick = () => {
    selectedDiff = r.dataset.diff;
    alert("已選擇：" + r.innerText.split("\n")[0]);
  };
});

document.getElementById("btnDraw").onclick = () => {
  const collect = document.getElementById("collectMode").checked;

  let pool = mountains.filter(m => m.difficulty === selectedDiff);
  if (collect) {
    pool = pool.filter(m => !conquered.includes(m.id));
  }

  if (pool.length === 0) {
    alert("這個分類已沒有可抽的山了！");
    return;
  }

  currentMountain = pool[Math.floor(Math.random() * pool.length)];
  showMountain(currentMountain);
};

document.getElementById("btnConquer").onclick = () => {
  if (!currentMountain) return;
  if (!conquered.includes(currentMountain.id)) {
    conquered.push(currentMountain.id);
    localStorage.setItem("conquered", JSON.stringify(conquered));
    updateProgress();
    alert("🎉 已征服 " + currentMountain.name_zh);
  }
};

function showMountain(m) {
  document.getElementById("mName").innerText =
    `${m.name_zh}（${m.elevation_m}m）`;
  document.getElementById("mInfo").innerText =
    `${m.name_en}｜${m.difficulty_zh}`;
  document.getElementById("mStory").innerText = m.bear_story;
  document.getElementById("mAdvice").innerText = m.bear_advice;
  document.getElementById("mRisk").innerText = m.risk_note;
  resultCard.classList.remove("hidden");
}

function updateProgress() {
  progressCount.innerText = conquered.length;
  progressFill.style.width = (conquered.length) + "%";
}
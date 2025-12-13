let mountains = [];
let conquered = JSON.parse(localStorage.getItem("conquered") || "[]");

fetch("mountains-rich.json")
  .then(res => res.json())
  .then(data => mountains = data.mountains);

const drawBtn = document.getElementById("drawBtn");
const modal = document.getElementById("drawModal");

drawBtn.onclick = () => {
  const available = mountains.filter(m => !conquered.includes(m.id));
  if (!available.length) return alert("已全部抽完");

  const m = available[Math.floor(Math.random() * available.length)];
  conquered.push(m.id);
  localStorage.setItem("conquered", JSON.stringify(conquered));

  document.getElementById("modalTitle").innerText = m.name_zh;
  document.getElementById("modalStory").innerText = m.bear_story;
  document.getElementById("modalAdvice").innerText = m.bear_advice;
  modal.style.display = "flex";

  updateProgress();
};

function closeModal() {
  modal.style.display = "none";
}

function updateProgress() {
  const count = conquered.length;
  document.getElementById("progressText").innerText = `${count} / 100`;
  document.getElementById("progressBar").style.width = `${count}%`;
}
updateProgress();

/* Export / History */
document.getElementById("exportCardBtn").onclick = () => alert("📸 匯出抽卡 IG 圖（下一步可接 canvas）");
document.getElementById("exportCongratsBtn").onclick = () => alert("🎉 匯出祝賀圖");
document.getElementById("historyBtn").onclick = () => alert(`已抽 ${conquered.length} 座`);

/* Safety */
const safetyModal = document.getElementById("safetyModal");
document.getElementById("safetyBtn").onclick = () => safetyModal.style.display = "flex";
function closeSafety(){ safetyModal.style.display = "none"; }

/* Diary */
document.getElementById("saveDiaryBtn").onclick = () => {
  const date = diaryDate.value;
  const text = diaryText.value;
  if (!date) return alert("請選日期");
  localStorage.setItem(`diary-${date}`, text);
  alert("日記已儲存");
};

/* Reset */
document.getElementById("resetBtn").onclick = () => {
  if (confirm("確定清空所有紀錄？")) {
    localStorage.clear();
    location.reload();
  }
};
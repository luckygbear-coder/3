let mountains = [];
let progress = JSON.parse(localStorage.getItem("bearProgress")) || [];

fetch("./mountains.json")
  .then(res => res.json())
  .then(data => mountains = data);

const barFill = document.getElementById("barFill");
const progressBadge = document.getElementById("progressBadge");

function updateProgress() {
  const count = progress.length;
  progressBadge.textContent = `${count} / 100`;
  barFill.style.width = `${count}%`;
}

updateProgress();

document.getElementById("drawBtn").onclick = () => {
  if (!mountains.length) return alert("山還沒載入好");

  const m = mountains[Math.floor(Math.random() * mountains.length)];

  document.getElementById("resultCard").hidden = false;
  document.getElementById("mountainName").textContent =
    `${m.name}（${m.height}m）`;
  document.getElementById("mountainInfo").textContent = m.note || "";
  document.getElementById("mountainBear").textContent =
    "🐻 熊熊說：你不是在征服山，而是在照顧自己。";

  document.getElementById("markDoneBtn").onclick = () => {
    if (!progress.includes(m.name)) {
      progress.push(m.name);
      localStorage.setItem("bearProgress", JSON.stringify(progress));
      updateProgress();
      alert(`🎉 已征服 ${progress.length} 座！`);
    }
  };
};
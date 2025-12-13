let mountains = [];
let conquered = JSON.parse(localStorage.getItem("conquered") || "[]");
let history = JSON.parse(localStorage.getItem("drawHistory") || "[]");

let lastDrawn = null; // 用來匯出「抽卡IG圖」

const drawBtn = document.getElementById("drawBtn");
const modal = document.getElementById("drawModal");
const safetyModal = document.getElementById("safetyModal");
const historyModal = document.getElementById("historyModal");
const historyList = document.getElementById("historyList");

fetch("mountains-rich.json")
  .then(res => res.json())
  .then(data => {
    mountains = data.mountains || [];
    updateProgress();
  })
  .catch(() => alert("讀取 mountains-rich.json 失敗，請確認檔名與路徑"));

drawBtn.onclick = () => {
  if (!mountains.length) return alert("資料尚未載入完成，請稍等 1 秒再按一次");

  const available = mountains.filter(m => !conquered.includes(m.id));
  if (!available.length) return alert("🎉 你已經完成全部 100 座！");

  const m = available[Math.floor(Math.random() * available.length)];
  conquered.push(m.id);
  localStorage.setItem("conquered", JSON.stringify(conquered));

  lastDrawn = m;

  // 存歷史（最新在前）
  history.unshift({
    id: m.id,
    name_zh: m.name_zh,
    name_en: m.name_en,
    elevation_m: m.elevation_m,
    time: new Date().toISOString()
  });
  history = history.slice(0, 200); // 防爆
  localStorage.setItem("drawHistory", JSON.stringify(history));

  // 顯示 modal
  document.getElementById("modalTitle").innerText = `${m.name_zh}（${m.elevation_m}m）`;
  document.getElementById("modalStory").innerText = m.bear_story || "";
  document.getElementById("modalAdvice").innerText =
    `${m.bear_advice || ""}\n${m.risk_note || ""}`;
  modal.style.display = "flex";

  updateProgress();
};

function closeModal() { modal.style.display = "none"; }

// 進度
function updateProgress() {
  const count = conquered.length;
  document.getElementById("progressText").innerText = `${count} / 100`;
  document.getElementById("progressBar").style.width = `${Math.min(100, count)}%`;
}
updateProgress();

/* ======== 匯出：抽卡 IG 圖（1080×1080）======== */
document.getElementById("exportCardBtn").onclick = async () => {
  if (!lastDrawn) {
    alert("你還沒有抽到任何一張卡～先按「立即抽一張」再匯出！");
    return;
  }
  const dataUrl = await renderCardToDataURL({
    type: "draw",
    mountain: lastDrawn,
    progress: conquered.length
  });
  openOrDownloadImage(dataUrl, `出遊熊_抽卡_${lastDrawn.id}.png`);
};

/* ======== 匯出：祝賀圖（以目前進度）======== */
document.getElementById("exportCongratsBtn").onclick = async () => {
  const dataUrl = await renderCardToDataURL({
    type: "congrats",
    progress: conquered.length
  });
  openOrDownloadImage(dataUrl, `出遊熊_祝賀_${conquered.length}座.png`);
};

/* ======== 抽卡紀錄 ======== */
document.getElementById("historyBtn").onclick = () => {
  if (!history.length) {
    alert("目前還沒有抽卡紀錄～");
    return;
  }
  historyList.innerHTML = history
    .slice(0, 50)
    .map(h => {
      const d = new Date(h.time);
      const timeStr = `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
      return `• ${h.name_zh}（${h.elevation_m}m）<br><small style="opacity:.7">${timeStr}</small>`;
    })
    .join("<hr style='border:none;border-top:1px solid #eee;margin:10px 0'>");
  historyModal.style.display = "flex";
};
function closeHistory(){ historyModal.style.display = "none"; }

/* ======== 安全 ======== */
document.getElementById("safetyBtn").onclick = () => safetyModal.style.display = "flex";
function closeSafety(){ safetyModal.style.display = "none"; }

/* ======== 日記（文字 + 日期 + 圖片） ======== */
const diaryDate = document.getElementById("diaryDate");
const diaryText = document.getElementById("diaryText");
const diaryImage = document.getElementById("diaryImage");

diaryDate.onchange = () => loadDiary(diaryDate.value);

function loadDiary(date){
  if (!date) return;
  const savedText = localStorage.getItem(`diary-${date}`) || "";
  diaryText.value = savedText;

  const savedImg = localStorage.getItem(`diary-img-${date}`) || "";
  // 這裡不強制顯示預覽（避免介面變高），你要我也可以再加「小預覽圖」按鈕
}

document.getElementById("saveDiaryBtn").onclick = async () => {
  const date = diaryDate.value;
  if (!date) return alert("請先選日期");

  localStorage.setItem(`diary-${date}`, diaryText.value || "");

  // 圖片（轉 base64 存 localStorage）
  const file = diaryImage.files && diaryImage.files[0];
  if (file) {
    const base64 = await fileToDataURL(file);
    localStorage.setItem(`diary-img-${date}`, base64);
  }
  alert("✅ 日記已儲存");
};

/* ======== 清空重置 ======== */
document.getElementById("resetBtn").onclick = () => {
  if (!confirm("確定清空所有抽卡紀錄、征服進度、日記？")) return;
  localStorage.clear();
  location.reload();
};

/* ===================== 工具：Canvas 匯出 ===================== */
async function renderCardToDataURL({ type, mountain, progress }) {
  const canvas = document.getElementById("exportCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fff3d6");
  bg.addColorStop(1, "#ffe0b0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 卡片底
  roundRect(ctx, 70, 90, W-140, H-180, 48, "#ffffff", "#f1cfa3", 6);

  // 標題
  ctx.fillStyle = "#4b3044";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText("🐻 出遊熊百岳", 120, 170);

  // 進度
  ctx.fillStyle = "#333";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`進度：${progress}/100`, 120, 235);

  // 進度條
  const barX = 120, barY = 260, barW = 840, barH = 28;
  roundRect(ctx, barX, barY, barW, barH, 14, "#eee", "#ddd", 2);
  const fillW = Math.max(0, Math.min(barW, barW * (progress/100)));
  roundRect(ctx, barX, barY, fillW, barH, 14, "#ff9a2f", null, 0);

  // 內容文字
  ctx.fillStyle = "#4b3044";
  ctx.font = "bold 48px sans-serif";

  let y = 370;

  if (type === "draw" && mountain) {
    const title = `${mountain.name_zh}（${mountain.elevation_m}m）`;
    ctx.fillText(title, 120, y);

    y += 70;
    ctx.font = "36px sans-serif";
    y = wrapText(ctx, mountain.bear_story || "", 120, y, 840, 52);

    y += 16;
    y = wrapText(ctx, mountain.bear_advice || "", 120, y, 840, 52);

    y += 12;
    ctx.fillStyle = "#8a3b1a";
    y = wrapText(ctx, mountain.risk_note || "", 120, y, 840, 52);
  } else {
    const milestones = [10,20,30,40,50,60,70,80,90,100];
    const next = milestones.find(n => n > progress) || 100;
    ctx.fillText(`🎉 特別祝賀卡`, 120, y);

    y += 70;
    ctx.font = "42px sans-serif";
    ctx.fillStyle = "#4b3044";
    ctx.fillText(`你太猛了！已完成 ${progress}/100`, 120, y);

    y += 70;
    ctx.font = "36px sans-serif";
    const msg =
      `熊熊說：每一步都算數。你不是在跟別人比，你是在超越昨天的自己。\n` +
      `下一個目標：${next} 座（再解鎖一張祝賀卡）`;
    y = wrapText(ctx, msg, 120, y, 840, 56);
  }

  // Footer
  ctx.fillStyle = "#333";
  ctx.font = "32px sans-serif";
  ctx.fillText("IG @luckygbear", 120, 980);

  // 安全提醒（小字）
  ctx.fillStyle = "#666";
  ctx.font = "26px sans-serif";
  ctx.fillText("⚠️ 安全第一：天候不穩就撤退，山難請打 112", 120, 1030);

  return canvas.toDataURL("image/png");
}

function openOrDownloadImage(dataUrl, filename){
  // iOS Safari 通常不讓你直接下載，但可以開新分頁讓你長按存圖
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;

  // 先嘗試下載（支援的會直接下載）
  document.body.appendChild(a);
  a.click();
  a.remove();

  // 再開新視窗（iOS 必備）
  const w = window.open();
  if (w) {
    w.document.write(`<title>${filename}</title>`);
    w.document.write(`<img src="${dataUrl}" style="width:100%;height:auto;display:block">`);
    w.document.close();
  } else {
    // 若被擋彈窗
    alert("已產生圖片，但瀏覽器阻擋新視窗。\n請允許彈出視窗，或再按一次匯出。");
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const lines = String(text).split("\n");
  for (const line of lines) {
    const words = Array.from(line);
    let cur = "";
    for (const ch of words) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(cur, x, y);
        cur = ch;
        y += lineHeight;
      } else {
        cur = test;
      }
    }
    if (cur) {
      ctx.fillText(cur, x, y);
      y += lineHeight;
    } else {
      y += lineHeight;
    }
  }
  return y;
}

function roundRect(ctx, x, y, w, h, r, fillColor, strokeColor, strokeW){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && strokeW) {
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
}

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
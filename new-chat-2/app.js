const canvas = document.getElementById("coverCanvas");
const ctx = canvas.getContext("2d");

const companyInput = document.getElementById("companyInput");
const titleInput = document.getElementById("titleInput");
const audienceInput = document.getElementById("audienceInput");
const speakerInput = document.getElementById("speakerInput");
const photoInput = document.getElementById("photoInput");
const fileName = document.getElementById("fileName");
const downloadButton = document.getElementById("downloadButton");

const state = {
  template: "poster",
  accent: "#FFF8A8",
  downloadFormat: "png",
  image: null,
};

const fonts = {
  sans: '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif',
};

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (value) => Math.max(0, Math.min(255, value));
  return `rgb(${clamp(r + amount)}, ${clamp(g + amount)}, ${clamp(b + amount)})`;
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function coverImage(img, x, y, width, height) {
  const scale = Math.max(width / img.width, height / img.height);
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  const offsetX = x + (width - scaledWidth) / 2;
  const offsetY = y + (height - scaledHeight) / 2;
  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
}

function drawImageOrPlaceholder(x, y, width, height, radius = 0) {
  ctx.save();
  if (radius) {
    drawRoundedRect(x, y, width, height, radius);
    ctx.clip();
  }

  if (state.image) {
    coverImage(state.image, x, y, width, height);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, shade(state.accent, 22));
    gradient.addColorStop(1, "#111827");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    drawPlaceholderPattern(x, y, width, height);
  }

  ctx.restore();
}

function drawMutedPhoto(x, y, width, height, radius) {
  ctx.save();
  drawRoundedRect(x, y, width, height, radius);
  ctx.clip();
  ctx.filter = "saturate(1.08) contrast(0.96) brightness(1.03)";
  drawImageOrPlaceholder(x, y, width, height, 0);
  ctx.filter = "none";
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.fillRect(x, y, width, height);
  ctx.restore();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.04)";
  ctx.lineWidth = 2;
  drawRoundedRect(x, y, width, height, radius);
  ctx.stroke();
}

function drawPlaceholderPattern(x, y, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  for (let i = -height; i < width; i += 70) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + height);
    ctx.lineTo(x + i + height, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + width * 0.72, y + height * 0.32, Math.min(width, height) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillBackground(colorA, colorB = "#101827") {
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1080);
}

function setText(fontSize, weight = 800, color = "#ffffff", align = "left") {
  ctx.font = `${weight} ${fontSize}px ${fonts.sans}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
}

function wrapText(text, maxWidth, fontSize, weight = 900) {
  setText(fontSize, weight);
  const words = [...text.trim()];
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const test = current + word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function fitTitle(text, maxWidth, maxLines, startSize, minSize) {
  let size = startSize;
  let lines = wrapText(text, maxWidth, size);

  while ((lines.length > maxLines || lines.some((line) => ctx.measureText(line).width > maxWidth)) && size > minSize) {
    size -= 2;
    lines = wrapText(text, maxWidth, size);
  }

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    while (ctx.measureText(`${lines[maxLines - 1]}...`).width > maxWidth && lines[maxLines - 1].length > 1) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1);
    }
    if (lines[maxLines - 1] !== last) lines[maxLines - 1] += "...";
  }

  return { size, lines };
}

function drawLines(lines, x, y, size, lineHeight, align = "left") {
  setText(size, 900, "#ffffff", align);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function drawPill(text, x, y, color, align = "left") {
  setText(30, 800, "#ffffff", align);
  const metrics = ctx.measureText(text);
  const width = metrics.width + 48;
  const height = 58;
  const drawX = align === "center" ? x - width / 2 : x;

  ctx.fillStyle = color;
  drawRoundedRect(drawX, y, width, height, 29);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, align === "center" ? x : drawX + 24, y + 38);
}

function drawCompany(text, x, y, color = "#ffffff", align = "left") {
  setText(28, 900, color, align);
  ctx.fillText(text, x, y);
}

function fitSingleLine(text, maxWidth, startSize, minSize, weight = 900) {
  let size = startSize;
  setText(size, weight);
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    setText(size, weight);
  }
  return size;
}

function drawCenteredFit(text, x, y, maxWidth, startSize, minSize, color = "#000000") {
  const size = fitSingleLine(text, maxWidth, startSize, minSize, 900);
  setText(size, 900, color, "center");
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
  ctx.lineWidth = Math.max(4, size * 0.08);
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  return size;
}

function drawHangingLabel(text) {
  const x = 240;
  const y = 24;
  const width = 600;
  const height = 92;

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(300, 14);
  ctx.lineTo(780, 14);
  ctx.stroke();

  ctx.fillStyle = "#ffcc00";
  [287, 775].forEach((tabX) => {
    drawRoundedRect(tabX, 0, 18, 34, 7);
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5;
    ctx.stroke();
  });

  ctx.fillStyle = "#ffffff";
  drawRoundedRect(x, y, width, height, 30);
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6;
  ctx.stroke();
  drawRoundedRect(x + 14, y + 12, width - 28, height - 24, 22);
  ctx.lineWidth = 3;
  ctx.stroke();

  drawCenteredFit(text, 540, 84, width - 110, 46, 30, "#000000");
}

function getPosterCopy() {
  const titleLines = titleInput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const primary = titleLines[0] || "디지털 전환시대";
  const highlight = titleLines[1] || "생존전략";
  const extraSubtitle = titleLines.slice(2).join(" ");
  const subtitle = extraSubtitle || audienceInput.value.trim();
  return { primary, highlight, subtitle };
}

function drawSlantedHighlight(text, y) {
  ctx.save();
  ctx.translate(540, y);
  ctx.rotate((-2.2 * Math.PI) / 180);
  ctx.fillStyle = state.accent;
  drawRoundedRect(-470, -62, 940, 126, 4);
  ctx.fill();
  ctx.restore();

  drawCenteredFit(text, 540, y + 34, 780, 92, 54, "#000000");
}

function drawPoster() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1080, 1080);

  drawHangingLabel(companyInput.value.trim() || "업체명");
  drawMutedPhoto(52, 146, 976, 884, 78);

  const { primary, highlight, subtitle } = getPosterCopy();
  drawCenteredFit(primary, 540, 420, 930, 100, 58, "#000000");
  drawSlantedHighlight(highlight, 550);

  const bracketed = subtitle.startsWith("[") ? subtitle : `[${subtitle}]`;
  drawCenteredFit(bracketed, 540, 725, 900, 72, 42, "#000000");

  const speaker = speakerInput.value.trim() || "강사명";
  const pillFontSize = fitSingleLine(speaker, 360, 34, 24, 900);
  setText(pillFontSize, 900, "#ffffff", "center");
  const pillWidth = Math.max(330, ctx.measureText(speaker).width + 120);
  ctx.fillStyle = "#000000";
  drawRoundedRect(540 - pillWidth / 2, 835, pillWidth, 72, 36);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(speaker, 540, 881);
}

function drawClassic() {
  drawImageOrPlaceholder(0, 0, 1080, 1080);

  const overlay = ctx.createLinearGradient(0, 0, 1080, 0);
  overlay.addColorStop(0, "rgba(4, 9, 18, 0.86)");
  overlay.addColorStop(0.58, "rgba(4, 9, 18, 0.56)");
  overlay.addColorStop(1, "rgba(4, 9, 18, 0.14)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = withAlpha(state.accent, 0.92);
  ctx.fillRect(0, 0, 18, 1080);

  drawCompany(companyInput.value, 86, 126);

  const fitted = fitTitle(titleInput.value, 770, 4, 76, 48);
  drawLines(fitted.lines, 86, 440, fitted.size, fitted.size * 1.18);

  drawPill(audienceInput.value, 86, 848, withAlpha(state.accent, 0.9));
}

function drawSplit() {
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, 1080, 1080);
  drawImageOrPlaceholder(0, 0, 1080, 610);

  const imageShade = ctx.createLinearGradient(0, 310, 0, 610);
  imageShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  imageShade.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = imageShade;
  ctx.fillRect(0, 310, 1080, 300);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 610, 1080, 470);
  ctx.fillStyle = state.accent;
  ctx.fillRect(0, 610, 1080, 14);

  drawCompany(companyInput.value, 82, 704, "#111827");

  const fitted = fitTitle(titleInput.value, 860, 3, 66, 42);
  setText(fitted.size, 900, "#111827");
  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, 82, 812 + index * fitted.size * 1.16);
  });

  setText(28, 800, "#4b5563");
  ctx.fillText(audienceInput.value, 82, 1010);
}

function drawFocus() {
  fillBackground("#111827", "#2f3137");

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = state.accent;
  ctx.beginPath();
  ctx.arc(880, 220, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(910, 840, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawImageOrPlaceholder(610, 120, 360, 520, 8);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 2;
  drawRoundedRect(610, 120, 360, 520, 8);
  ctx.stroke();

  drawCompany(companyInput.value, 84, 126);

  const fitted = fitTitle(titleInput.value, 560, 5, 72, 42);
  drawLines(fitted.lines, 84, 318, fitted.size, fitted.size * 1.18);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(84, 790, 88, 6);
  drawPill(audienceInput.value, 84, 846, withAlpha(state.accent, 0.94));
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.documentElement.style.setProperty("--accent-soft", withAlpha(state.accent, 0.12));

  if (state.template === "split") {
    drawSplit();
  } else if (state.template === "focus") {
    drawFocus();
  } else {
    drawPoster();
  }
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      fileName.textContent = file.name;
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function setActiveButton(buttons, activeButton) {
  buttons.forEach((button) => button.classList.toggle("is-active", button === activeButton));
}

function downloadCover() {
  const link = document.createElement("a");
  const safeTitle = titleInput.value.trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 24) || "blog-cover";
  const isJpg = state.downloadFormat === "jpg";
  link.download = `${safeTitle}-1080x1080.${isJpg ? "jpg" : "png"}`;
  link.href = canvas.toDataURL(isJpg ? "image/jpeg" : "image/png", 0.94);
  link.click();
}

[companyInput, titleInput, audienceInput, speakerInput].forEach((input) => {
  input.addEventListener("input", render);
});

photoInput.addEventListener("change", handleUpload);
downloadButton.addEventListener("click", downloadCover);

document.querySelectorAll(".template-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.template = button.dataset.template;
    setActiveButton(document.querySelectorAll(".template-button"), button);
    render();
  });
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    state.accent = button.dataset.color;
    setActiveButton(document.querySelectorAll(".swatch"), button);
    render();
  });
});

document.querySelectorAll(".format-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.downloadFormat = button.dataset.format;
    setActiveButton(document.querySelectorAll(".format-button"), button);
  });
});

render();

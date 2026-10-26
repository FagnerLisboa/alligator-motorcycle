(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const motoSprite = new Image();
  motoSprite.src = "assets/moto-original.png";
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const livesEl = document.getElementById("lives");
  const fruitCountEl = document.getElementById("fruitCount");
  const acaiCountEl = document.getElementById("acaiCount");
  const activateSkillBtn = document.getElementById("activateSkill");
  const skillStatusEl = document.getElementById("skillStatus");
  const skillButtons = [...document.querySelectorAll(".skill-choice")];
  const skillEffectLabel = document.getElementById("skill-effect-label");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const overlay = document.getElementById("overlay");
  const overlayEmoji = document.getElementById("overlayEmoji");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("start");
  const soundToggle = document.getElementById("soundToggle");
  const musicToggle = document.getElementById("musicToggle");
  const shopToggle = document.getElementById("shopToggle");
  const shopPanel = document.getElementById("shopPanel");
  const walletCoinsEl = document.getElementById("walletCoins");
  const shopMessage = document.getElementById("shopMessage");
  const shopButtons = [...document.querySelectorAll(".shop-item-button")];
  const bikeButtons = [...document.querySelectorAll(".bike-item-button")];

  const W = canvas.width, H = canvas.height;
  const road = { x: 70, width: 340 };
  const lanes = [126, 240, 354];
  let best = 0;
  try {
    best = Number(localStorage.getItem("jacareMotoBest") || 0);
  } catch {
    best = 0;
  }
  let score = 0, coinsCollected = 0, speed = 260, elapsed = 0, roadOffset = 0, spawnTimer = 0, coinTimer = 0;
  const MAX_LIVES = 5;
  let lives = 3, invulnerableTimer = 0;
  let fruitSpawnTimer = 3, acaiSpawnTimer = 5;
  let fruitsCollected = 0, skillReady = false, skillTimer = 0, activeSkill = null;
  let selectedSkill = "shield", acaiCollected = 0;
  const acais = [];
  let walletCoins = 0, ownedSkins = ["green"], selectedSkin = "green";
  let ownedBikes = ["classic"], selectedBike = "classic";
  try {
    walletCoins = Math.max(0, Number(localStorage.getItem("jacareMotoWallet") || 0));
    ownedSkins = JSON.parse(localStorage.getItem("jacareMotoSkins") || '["green"]');
    if (!Array.isArray(ownedSkins) || !ownedSkins.includes("green")) ownedSkins = ["green"];
    selectedSkin = localStorage.getItem("jacareMotoSelectedSkin") || "green";
    if (!ownedSkins.includes(selectedSkin)) selectedSkin = "green";
    ownedBikes = JSON.parse(localStorage.getItem("jacareMotoBikes") || '["classic"]');
    if (!Array.isArray(ownedBikes) || !ownedBikes.includes("classic")) ownedBikes = ["classic"];
    selectedBike = localStorage.getItem("jacareMotoSelectedBike") || "classic";
    if (!ownedBikes.includes(selectedBike)) selectedBike = "classic";
  } catch (_) {
    walletCoins = 0; ownedSkins = ["green"]; selectedSkin = "green";
    ownedBikes = ["classic"]; selectedBike = "classic";
  }
    const fruits = [];
let running = false, lastTime = 0, soundOn = true, audioCtx = null;
  let musicOn = true, musicTimer = null, musicStep = 0;
  // Melodia arcade original sintetizada em tempo real (sem arquivos externos).
  const musicNotes = [
    [523.25, 659.25, 783.99, 659.25], [587.33, 698.46, 880.00, 698.46],
    [523.25, 659.25, 783.99, 987.77], [783.99, 698.46, 659.25, 587.33],
    [523.25, 659.25, 783.99, 659.25], [587.33, 698.46, 880.00, 1046.50],
    [987.77, 880.00, 783.99, 659.25], [698.46, 587.33, 523.25, 587.33]
  ];
  let obstacles = [], coins = [], particles = [];
  const keys = { left: false, right: false };
  const player = { x: 240, y: 555, width: 90, height: 140, tilt: 0 };
  bestEl.textContent = best;

  // Sons sintetizados com Web Audio: não precisa baixar arquivos de áudio.
  function initAudio() {
    if (!soundOn) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (_) { /* O jogo continua funcionando sem áudio. */ }
  }

  function tone(freq, duration, type = "sine", volume = 0.05, endFreq = null) {
    if (!soundOn) return;
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + duration + 0.02);
  }

  function playSound(kind) {
    if (!soundOn) return;
    if (kind === "start") { tone(440, .09, "triangle", .035); setTimeout(() => tone(660, .12, "triangle", .04), 90); }
    if (kind === "coin") { tone(880, .08, "sine", .06); setTimeout(() => tone(1320, .12, "sine", .045), 65); }
    if (kind === "hit") { tone(190, .22, "sawtooth", .07, 65); setTimeout(() => tone(90, .24, "triangle", .04, 40), 80); }
  }

  function playMusicNote() {
    if (!musicOn || !audioCtx || audioCtx.state !== "running") return;
    const bar = musicNotes[Math.floor(musicStep / 4) % musicNotes.length];
    const note = bar[musicStep % 4];
    const now = audioCtx.currentTime;
    // Melodia brilhante estilo arcade com baixo curto no primeiro tempo.
    tone(note, 0.16, "square", 0.018);
    if (musicStep % 4 === 0) tone(note / 2, 0.22, "triangle", 0.025);
    musicStep++;
  }

  function startMusic() {
    initAudio();
    if (!musicOn || !audioCtx || musicTimer) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    musicStep = 0;
    playMusicNote();
    musicTimer = window.setInterval(playMusicNote, 185);
  }

  function stopMusic() {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
  }

  function roundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawBackground() {
    ctx.fillStyle = "#4c914a"; ctx.fillRect(0, 0, W, H);
    for (let y = -40 + (roadOffset % 80); y < H; y += 80) {
      ctx.fillStyle = "#5ca653"; ctx.fillRect(10, y, 38, 23); ctx.fillRect(432, y + 34, 30, 20);
      ctx.fillStyle = "#3c7b3b"; ctx.fillRect(30, y + 12, 12, 4); ctx.fillRect(438, y + 47, 10, 4);
    }
    ctx.fillStyle = "#d6d4b2"; ctx.fillRect(road.x - 9, 0, road.width + 18, H);
    ctx.fillStyle = "#343b3d"; ctx.fillRect(road.x, 0, road.width, H);
    for (let y = -55 + (roadOffset % 55); y < H; y += 55) {
      ctx.fillStyle = "#3e4547"; ctx.fillRect(road.x + 16, y, road.width - 32, 2);
    }
    ctx.fillStyle = "#f4f0c9";
    for (const x of [road.x + road.width / 3, road.x + road.width * 2 / 3]) {
      for (let y = -70 + (roadOffset % 100); y < H; y += 100) ctx.fillRect(x - 3, y, 6, 48);
    }
    for (let i = 0; i < 7; i++) {
      const y = (i * 119 + roadOffset * .7) % (H + 50) - 30;
      ctx.fillStyle = "#2d6635"; ctx.beginPath(); ctx.arc(56, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(424, y + 40, 11, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawGator(x, y, tilt, time) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.fillStyle = "#172a18aa"; ctx.beginPath(); ctx.ellipse(0, 8, 40, 66, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#267b3e"; ctx.strokeStyle = "#14542d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, 37); ctx.quadraticCurveTo(-30, 56, -18, 76); ctx.quadraticCurveTo(-5, 64, 5, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#80c64b"; ctx.beginPath(); ctx.moveTo(-17 + i * 3, 47 + i * 5); ctx.lineTo(-10 + i * 3, 43 + i * 5); ctx.lineTo(-10 + i * 3, 49 + i * 5); ctx.closePath(); ctx.fill();
    }
    const swing = Math.sin(time * 17) * 8;
    const legs = [{x:-22,y:23,a:swing},{x:22,y:23,a:-swing},{x:-21,y:-20,a:-swing},{x:21,y:-20,a:swing}];
    legs.forEach(leg => {
      ctx.save(); ctx.translate(leg.x, leg.y); ctx.rotate(leg.a * Math.PI / 180);
      roundedRect(-7, -2, 15, 28, 7, "#2f9148", "#14542d");
      ctx.fillStyle = "#b8e56a";
      for (let c = 0; c < 3; c++) { ctx.beginPath(); ctx.ellipse(-4 + c * 5, 23, 2.5, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    ctx.fillStyle = "#278744"; ctx.strokeStyle = "#14542d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 31, 53, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b9d66a"; ctx.beginPath(); ctx.ellipse(0, 4, 19, 39, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = "#86ad4b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -18 + i * 7); ctx.quadraticCurveTo(0, -13 + i * 7, 14, -18 + i * 7); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const yy = -42 + i * 10; ctx.fillStyle = "#a3dc56"; ctx.beginPath(); ctx.moveTo(-5, yy + 4); ctx.lineTo(0, yy - 5); ctx.lineTo(5, yy + 4); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "#32984a"; ctx.strokeStyle = "#14542d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -48, 26, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-22, -66, 44, 32, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b9df72"; ctx.beginPath(); ctx.roundRect(-18, -48, 36, 11, 5); ctx.fill();
    ctx.fillStyle = "#123e24"; ctx.beginPath(); ctx.arc(-10, -59, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -59, 2.4, 0, Math.PI * 2); ctx.fill();
    [-15, 15].forEach(ex => { ctx.fillStyle = "#b9e75c"; ctx.beginPath(); ctx.arc(ex, -72, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, -73, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#17251a"; ctx.beginPath(); ctx.arc(ex + 1, -73, 2.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#fff8d8";
    for (let i = 0; i < 5; i++) { const dx = -13 + i * 6.5; ctx.beginPath(); ctx.moveTo(dx, -39); ctx.lineTo(dx + 3, -39); ctx.lineTo(dx + 1.5, -34); ctx.closePath(); ctx.fill(); }
    drawRider(0, -14, "#e44d3e", "#ffdb9b", "#283b54", false);
    drawRider(0, 17, "#4b8ee8", "#f2c59a", "#e9f0f4", true);
    ctx.restore();
  }

  function drawRider(x, y, jacket, skin, helmet, passenger) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = jacket; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-16, 12); ctx.lineTo(-10, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(16, 12); ctx.lineTo(10, 17); ctx.stroke();
    ctx.fillStyle = jacket; ctx.strokeStyle = "#24352a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = jacket; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-15, -12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(15, -12); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -14, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(0, -16, 9, Math.PI, Math.PI * 2); ctx.lineTo(9, -14); ctx.quadraticCurveTo(0, -8, -9, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#bfe8f3"; ctx.beginPath(); ctx.ellipse(0, -14, 7, 3, 0, Math.PI, Math.PI * 2); ctx.fill();
    if (passenger) { roundedRect(-8, -1, 16, 13, 4, "#f0b63f", "#8b6121"); }
    ctx.restore();
  }

  // Usa a imagem original enviada pelo usuário: jacaré-moto com os dois pilotos.
  function drawOriginalMoto(x, y, tilt, time) {
    // Pequena oscilação vertical dá sensação de suspensão sem deformar a arte.
    const bob = Math.sin(time * 10) * 2.2;
    ctx.save();
    if (invulnerableTimer > 0) ctx.globalAlpha = (Math.floor(performance.now() / 100) % 2) ? 0.45 : 1;
    ctx.translate(x, y + bob);
    ctx.rotate(tilt);

    // Rastros discretos atrás da moto, sincronizados com a velocidade da corrida.
    ctx.globalAlpha = 0.22;
    const trailColors = { green: "#d8ff91", gold: "#ffd45a", purple: "#d7a2ff" };
    ctx.strokeStyle = trailColors[selectedSkin] || trailColors.green;
    ctx.lineWidth = selectedSkin === "purple" ? 3 : 2;
    for (let i = 0; i < 3; i++) {
      const streakY = 40 + i * 18 + ((time * 95 + i * 13) % 22);
      const streakX = (i - 1) * 18;
      ctx.beginPath();
      ctx.moveTo(streakX, streakY);
      ctx.lineTo(streakX, streakY + 9 + (i % 2) * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Mantém a proporção e o tamanho menor da imagem original.
    const spriteW = 135;
    const spriteH = spriteW * (408 / 300);
    if (motoSprite.complete && motoSprite.naturalWidth > 0) {
      ctx.drawImage(motoSprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
    } else {
      drawGator(0, 0, 0, time);
    }
    ctx.restore();
  }

  function drawObstacle(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    if (o.type === "cone") {
      ctx.fillStyle = "#e95c32"; ctx.strokeStyle = "#87351e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16, 17); ctx.lineTo(-16, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff2d5"; ctx.fillRect(-11, 1, 22, 5); roundedRect(-20, 15, 40, 7, 3, "#f3d9a3", "#9b7b49");
    } else if (o.type === "rock") {
      ctx.fillStyle = "#92999a"; ctx.strokeStyle = "#50585a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-23, 13); ctx.lineTo(-18, -9); ctx.lineTo(-3, -19); ctx.lineTo(17, -13); ctx.lineTo(24, 6); ctx.lineTo(10, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#b9c0bf"; ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-2, -14); ctx.lineTo(6, -9); ctx.closePath(); ctx.fill();
    } else {
      roundedRect(-24, -36, 48, 72, 10, o.color || "#d84a45", "#772d2b");
      roundedRect(-17, -21, 34, 22, 6, "#a8d5dc", "#35545b"); roundedRect(-17, 8, 34, 16, 5, "#516e76", "#293e43");
      ctx.fillStyle = "#f6edb4"; ctx.fillRect(-19, -32, 9, 4); ctx.fillRect(10, -32, 9, 4);
      ctx.fillStyle = "#23292a"; ctx.fillRect(-28, -22, 5, 15); ctx.fillRect(23, -22, 5, 15); ctx.fillRect(-28, 15, 5, 15); ctx.fillRect(23, 15, 5, 15);
    }
    ctx.restore();
  }

  function drawCoin(c, time) {
    const spin = Math.abs(Math.cos(time * 7 + c.phase));
    const rx = Math.max(3, 11 * spin);
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.globalAlpha = c.collected ? 0 : 1;
    ctx.fillStyle = "#8b5a0b"; ctx.beginPath(); ctx.ellipse(2, 3, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createLinearGradient(-12, -10, 12, 12);
    grad.addColorStop(0, "#fff3a0"); grad.addColorStop(.45, "#ffd13d"); grad.addColorStop(1, "#e58a00");
    ctx.fillStyle = grad; ctx.strokeStyle = "#fff0a0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (spin > .45) { ctx.fillStyle = "#9a5c00"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 1); }
    ctx.restore();
  }

  function spawnObstacle() {
    const type = Math.random() < .32 ? "cone" : Math.random() < .48 ? "rock" : "car";
    const lane = Math.floor(Math.random() * lanes.length);
    const colors = ["#d84a45", "#e6b43b", "#527fda", "#c7d3d4"];
    obstacles.push({ x: lanes[lane], y: -60, type, color: colors[Math.floor(Math.random() * colors.length)], passed: false });
  }

  function spawnCoinLine() {
    const lane = Math.floor(Math.random() * lanes.length);
    const count = Math.random() < .55 ? 3 : 5;
    for (let i = 0; i < count; i++) coins.push({ x: lanes[lane], y: -35 - i * 48, phase: Math.random() * Math.PI * 2, collected: false });
  }

  function hitTest(o) {
    const dx = Math.abs(o.x - player.x), dy = Math.abs(o.y - player.y);
    const ow = o.type === "car" ? 25 : 21, oh = o.type === "car" ? 36 : 20;
    return dx < 34 + ow && dy < 58 + oh;
  }

  function saveShopData() {
    try {
      localStorage.setItem("jacareMotoWallet", String(walletCoins));
      localStorage.setItem("jacareMotoSkins", JSON.stringify(ownedSkins));
      localStorage.setItem("jacareMotoSelectedSkin", selectedSkin);
      localStorage.setItem("jacareMotoBikes", JSON.stringify(ownedBikes));
      localStorage.setItem("jacareMotoSelectedBike", selectedBike);
    } catch (_) { /* A loja continua utilizável mesmo se o navegador bloquear armazenamento. */ }
  }

  function refreshShop() {
    walletCoinsEl.textContent = walletCoins;
    shopButtons.forEach(button => {
      const skin = button.dataset.skin;
      const cost = Number(button.dataset.cost || 0);
      if (selectedSkin === skin) button.textContent = "EQUIPADO";
      else if (ownedSkins.includes(skin)) button.textContent = "EQUIPAR";
      else button.textContent = `🪙 ${cost}`;
      button.classList.toggle("equipped", selectedSkin === skin);
    });
    bikeButtons.forEach(button => {
      const bike = button.dataset.bike;
      const cost = Number(button.dataset.cost || 0);
      if (selectedBike === bike) button.textContent = "EQUIPADO";
      else if (ownedBikes.includes(bike)) button.textContent = "EQUIPAR";
      else button.textContent = `🪙 ${cost}`;
      button.classList.toggle("equipped", selectedBike === bike);
    });
  }

  function collectCoin(c) {
    c.collected = true; coinsCollected++; walletCoins++; score += 25;
    coinsEl.textContent = coinsCollected;
    refreshShop(); saveShopData();
    scoreEl.textContent = Math.floor(score);
    playSound("coin");
    for (let i = 0; i < 8; i++) particles.push({ x: c.x, y: c.y, vx: (Math.random() - .5) * 100, vy: -Math.random() * 100, life: .45, maxLife: .45 });
  }

  function loseLife() {
    if (!running || invulnerableTimer > 0) return;
    lives = Math.max(0, lives - 1);
    updateLivesDisplay();
    playSound("hit");
    if (lives <= 0) {
      endGame();
    } else {
      invulnerableTimer = 1.25;
      // Breve pisca de invulnerabilidade após a colisão.
      player.invulnerable = true;
    }
  }


  function updateFruitHud() {
    if (fruitCountEl) fruitCountEl.textContent = `${fruitsCollected}/3`;
    skillButtons.forEach(button => {
      button.disabled = !skillReady || !running;
      button.classList.toggle("skill-ready", skillReady && running);
      button.classList.toggle("skill-selected", button.dataset.skill === selectedSkill);
      button.setAttribute("aria-pressed", String(button.dataset.skill === selectedSkill));
    });
    if (activateSkillBtn) {
      activateSkillBtn.disabled = !skillReady || !running;
      activateSkillBtn.textContent = skillReady
        ? `✨ ATIVAR ${({shield: "ESCUDO", speed: "SUPER VELOCIDADE", magnet: "ÍMÃ"})[selectedSkill]}`
        : "✨ ATIVAR HABILIDADE (COLETE 3 🍓)";
    }
    if (acaiCountEl) acaiCountEl.textContent = `${acaiCollected}/3`;
    if (skillStatusEl) {
      if (activeSkill && skillTimer > 0) {
        const remaining = Math.ceil(skillTimer);
        const labels = { shield: "Escudo", speed: "Supervelocidade", magnet: "Ímã de moedas" };
        skillStatusEl.textContent = `${labels[activeSkill]}: ${remaining}s`;
      } else if (skillReady) {
        skillStatusEl.textContent = "Escolha um poder!";
      } else {
        skillStatusEl.textContent = "Junte 3 para ativar";
      }
    }
  
    if (skillEffectLabel) {
      const labels = {
        shield: "🛡️ TRANSFORMAÇÃO: ESCUDO ENERGÉTICO!",
        speed: "⚡ TRANSFORMAÇÃO: MOTO TURBO!",
        magnet: "🧲 TRANSFORMAÇÃO: CAMPO MAGNÉTICO!"
      };
      skillEffectLabel.textContent = activeSkill ? labels[activeSkill] :
        (skillReady ? "✨ Escolha uma habilidade!" : `🍓 Frutinhas: ${fruitsCollected}/3`);
      skillEffectLabel.classList.toggle("active", Boolean(activeSkill));
    }
  }

  function collectFruit(fruit) {
    if (fruit.collected || !running || skillReady) return;
    fruit.collected = true;
    fruitsCollected = Math.min(3, fruitsCollected + 1);
    if (fruitsCollected >= 3) skillReady = true;
    updateFruitHud();
    playSound("coin");
  }

  function spawnAcai() {
    acais.push({
      x: road.x + 35 + Math.random() * (road.width - 70),
      y: -30,
      radius: 17,
      phase: Math.random() * Math.PI * 2
    });
  }

  function collectAcai() {
    acaiCollected++;
    playSound("coin");
    if (acaiCollected >= 3) {
      acaiCollected = 0;
      if (lives < MAX_LIVES) {
        lives++;
        updateLivesDisplay();
        if (skillStatusEl) skillStatusEl.textContent = "🫐 3 açaís coletados: +1 vida!";
      } else if (skillStatusEl) {
        skillStatusEl.textContent = "🫐 Você já tem o máximo de 5 vidas!";
      }
    }
    updateFruitHud();
  }

  function activateSkill(kind) {
    if (!running || !skillReady) return;
    skillReady = false;
    fruitsCollected = 0;
    activeSkill = kind;
    skillTimer = 5;
    if (kind === "shield") {
      invulnerableTimer = Math.max(invulnerableTimer, skillTimer);
      if (skillStatusEl) skillStatusEl.textContent = "🛡️ Escudo ativo por 5 segundos!";
    } else if (kind === "speed") {
      if (skillStatusEl) skillStatusEl.textContent = "⚡ Supervelocidade por 5 segundos!";
    } else if (kind === "magnet") {
      if (skillStatusEl) skillStatusEl.textContent = "🧲 Ímã de moedas ativo por 5 segundos!";
    }
    updateFruitHud();
    playSound("coin");
  }

  function spawnFruit() {
    const kinds = ["🍓", "🍊", "🍌"];
    fruits.push({
      x: road.x + 35 + Math.random() * (road.width - 70),
      y: -28,
      radius: 15,
      kind: kinds[Math.floor(Math.random() * kinds.length)],
      collected: false
    });
  }

  function update(dt) {
    if (!running) return;
    fruitSpawnTimer -= dt;
    acaiSpawnTimer -= dt;
    if (acaiSpawnTimer <= 0) {
      spawnAcai();
      acaiSpawnTimer = 5.5 + Math.random() * 3.5;
    }
    for (let i = acais.length - 1; i >= 0; i--) {
      const acai = acais[i];
      acai.y += speed * dt;
      if (acai.y > H + 35) { acais.splice(i, 1); continue; }
      if (Math.hypot(acai.x - player.x, acai.y - player.y) < 48) {
        collectAcai();
        acais.splice(i, 1);
      }
    }
    fruitSpawnTimer -= dt;
    if (fruitSpawnTimer <= 0 && !skillReady) {
      spawnFruit();
      fruitSpawnTimer = 3.8 + Math.random() * 1.8;
    }
    for (let i = fruits.length - 1; i >= 0; i--) {
      const fruit = fruits[i];
      fruit.y += speed * dt;
      if (fruit.y > H + 35) { fruits.splice(i, 1); continue; }
      const dx = fruit.x - player.x;
      const dy = fruit.y - player.y;
      if (Math.hypot(dx, dy) < 48) {
        collectFruit(fruit);
        fruits.splice(i, 1);
      }
    }

    elapsed += dt;
    invulnerableTimer = Math.max(0, invulnerableTimer - dt);
    skillTimer = Math.max(0, skillTimer - dt);
    if (skillTimer <= 0) activeSkill = null;
    const baseSpeed = Math.min(530, 260 + elapsed * 5.2);
    speed = activeSkill === "speed" ? Math.min(650, baseSpeed * 1.65) : baseSpeed;
    if (activeSkill === "magnet") {
      coins.forEach(c => {
        if (!c.collected) {
          const dx = player.x - c.x, dy = player.y - c.y;
          if (Math.hypot(dx, dy) < 190) {
            const distance = Math.max(1, Math.hypot(dx, dy));
            c.x += (dx / distance) * 260 * dt;
            c.y += (dy / distance) * 260 * dt;
          }
        }
      });
    }
    updateFruitHud();
    roadOffset = (roadOffset + speed * dt) % 100;
    score += dt * (8 + speed / 65) * (activeSkill === "speed" ? 1.5 : 1);
    spawnTimer -= dt; coinTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(.48, 1.12 - elapsed * .006) + Math.random() * .42;
    }
    if (coinTimer <= 0) {
      spawnCoinLine();
      coinTimer = 2.7 + Math.random() * 2.0;
    }
    const move = 255 * dt;
    if (keys.left) player.x -= move;
    if (keys.right) player.x += move;
    player.x = Math.max(road.x + 42, Math.min(road.x + road.width - 42, player.x));
    player.tilt = keys.left ? -.13 : keys.right ? .13 : player.tilt * .8;

    obstacles.forEach(o => {
      o.y += speed * dt;
      if (!o.passed && o.y > player.y + 50) { o.passed = true; score += 10; }
      if (hitTest(o)) loseLife();
    });
    obstacles = obstacles.filter(o => o.y < H + 70);

    coins.forEach(c => {
      c.y += speed * dt;
      if (!c.collected && Math.abs(c.x - player.x) < 38 && Math.abs(c.y - player.y) < 48) collectCoin(c);
    });
    coins = coins.filter(c => c.y < H + 40 && !c.collected);

    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; p.life -= dt; });
    particles = particles.filter(p => p.life > 0);
    scoreEl.textContent = Math.floor(score);
    speedEl.textContent = (speed / 260).toFixed(1) + "x";
  }

  function render(time) {
    const t = time / 1000;
    drawBackground();
    coins.forEach(c => drawCoin(c, t));
    obstacles.forEach(drawObstacle);
    for (const fruit of fruits) {
      ctx.save();
      ctx.font = "25px system-ui, Apple Color Emoji, Segoe UI Emoji";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#b9ff4d";
      ctx.shadowBlur = 12;
      ctx.fillText(fruit.kind, fruit.x, fruit.y);
      ctx.restore();
    }

    for (const acai of acais) {
      const bob = Math.sin(t * 5 + acai.phase) * 3;
      ctx.save();
      ctx.translate(acai.x, acai.y + bob);
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 18;
      ctx.font = "29px system-ui, Apple Color Emoji, Segoe UI Emoji";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🫐", 0, 0);
      ctx.restore();
    }

    // Efeitos visuais exclusivos para cada habilidade ativa.
    if (running && activeSkill === "shield") {
      // Escudo energético: bolha pulsante, brilho e pequenos arcos móveis.
      const pulse = 1 + Math.sin(t * 8) * 0.035;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(pulse, pulse);
      const glow = ctx.createRadialGradient(0, 0, 22, 0, 0, 82);
      glow.addColorStop(0, "rgba(80,220,255,0.02)");
      glow.addColorStop(0.72, "rgba(80,220,255,0.10)");
      glow.addColorStop(1, "rgba(80,220,255,0.01)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(0, 0, 61, 82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8fe8ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#58dfff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 77, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 2;
      ctx.lineDashOffset = -t * 42;
      ctx.strokeStyle = "#e1fbff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 63, 84, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (running && activeSkill === "speed") {
      // Labaredas estilizadas atrás das duas rodas, tremulando com a velocidade.
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.tilt);
      const flameFlicker = Math.sin(t * 32) * 4;
      [-27, 27].forEach((wheelX, index) => {
        const wheelY = 45 + index * 24;
        const length = 24 + flameFlicker + (index * 3);
        const flame = ctx.createLinearGradient(wheelX, wheelY, wheelX, wheelY + length + 10);
        flame.addColorStop(0, "#fff6a0");
        flame.addColorStop(0.35, "#ffb52e");
        flame.addColorStop(1, "rgba(255,65,20,0)");
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(wheelX - 9, wheelY - 2);
        ctx.quadraticCurveTo(wheelX - 13, wheelY + length * .45, wheelX + flameFlicker, wheelY + length + 8);
        ctx.quadraticCurveTo(wheelX + 13, wheelY + length * .45, wheelX + 9, wheelY - 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffdf6e";
        ctx.lineWidth = 2;
        ctx.globalAlpha = .8;
        ctx.beginPath();
        ctx.moveTo(wheelX, wheelY);
        ctx.lineTo(wheelX + Math.sin(t * 20 + index) * 4, wheelY + length);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      ctx.restore();
    }

    if (running && activeSkill === "magnet") {
      // Campo magnético animado com polos e ondas em rotação.
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(t * 1.7);
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 73 + ring * 12, 43 + ring * 10, ring * .24, 0, Math.PI * 1.55);
        ctx.strokeStyle = ring === 0 ? "#fff0a3" : "#ffc24799";
        ctx.lineWidth = ring === 0 ? 3 : 2;
        ctx.setLineDash(ring === 1 ? [5, 7] : []);
        ctx.lineDashOffset = -t * (25 + ring * 10);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.rotate(-t * 3.4);
      ctx.font = "bold 17px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffe28a";
      ctx.shadowColor = "#ffb52e";
      ctx.shadowBlur = 12;
      ctx.fillText("N", -68, -4);
      ctx.fillText("S", 68, 4);
      ctx.restore();
    }
    // Transformação visual durante o uso de uma habilidade.
    if (running && activeSkill) {
      const transformPulse = 1 + Math.sin(t * 13) * 0.06;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(transformPulse, transformPulse);

      if (activeSkill === "shield") {
        // Runas de energia em volta da moto.
        for (let i = 0; i < 6; i++) {
          const angle = t * 2.3 + (Math.PI * 2 * i / 6);
          const px = Math.cos(angle) * 67;
          const py = Math.sin(angle) * 84;
          ctx.fillStyle = i % 2 ? "#e5fbff" : "#65e5ff";
          ctx.shadowColor = "#65e5ff";
          ctx.shadowBlur = 13;
          ctx.beginPath();
          ctx.moveTo(px, py - 5);
          ctx.lineTo(px + 4, py);
          ctx.lineTo(px, py + 5);
          ctx.lineTo(px - 4, py);
          ctx.closePath();
          ctx.fill();
        }
      } else if (activeSkill === "speed") {
        // Raios rápidos e faíscas ao redor do piloto.
        ctx.strokeStyle = "#ffdb59";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ff6a20";
        ctx.shadowBlur = 14;
        for (let i = 0; i < 5; i++) {
          const yy = -52 + i * 24 + Math.sin(t * 20 + i) * 5;
          const startX = -54 - (i % 2) * 12;
          ctx.beginPath();
          ctx.moveTo(startX, yy);
          ctx.lineTo(startX - 11, yy + 5);
          ctx.lineTo(startX - 3, yy + 11);
          ctx.lineTo(startX - 16, yy + 19);
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          const angle = t * 7 + i * Math.PI / 2;
          ctx.fillStyle = "#fff2a8";
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * 49, Math.sin(angle) * 57, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (activeSkill === "magnet") {
        // Faíscas magnéticas orbitando a moto.
        for (let i = 0; i < 8; i++) {
          const angle = -t * 2.8 + i * Math.PI / 4;
          const rx = 62 + Math.sin(t * 6 + i) * 5;
          const ry = 75 + Math.cos(t * 5 + i) * 6;
          const px = Math.cos(angle) * rx;
          const py = Math.sin(angle) * ry;
          ctx.fillStyle = i % 2 ? "#fff0a3" : "#ffc247";
          ctx.shadowColor = "#ffb52e";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(px, py, 3 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawOriginalMoto(player.x, player.y, player.tilt, t);
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = "#ffd84d"; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (running) {
      ctx.strokeStyle = "#ffffff50"; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const x = 20 + i * 13, y = (t * speed * 1.8 + i * 127) % H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 20); ctx.stroke();
      }
    }
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, .035);
    lastTime = timestamp; update(dt); render(timestamp); requestAnimationFrame(loop);
  }

  function updateLivesDisplay() {
    if (!livesEl) return;
    livesEl.textContent = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, MAX_LIVES - lives));
    livesEl.setAttribute("aria-label", `${lives} de ${MAX_LIVES} vidas restantes`);
  }

  function startGame() {
    fruitsCollected = 0; skillReady = false; skillTimer = 0; activeSkill = null; fruits.length = 0;
    acaiCollected = 0; acais.length = 0; acaiSpawnTimer = 4.5;
    selectedSkill = "shield";
    fruitSpawnTimer = 2.5; updateFruitHud();
    lives = 3; invulnerableTimer = 0; updateLivesDisplay();
    initAudio();
    if (musicOn) startMusic();
    score = 0; coinsCollected = 0; speed = 260; elapsed = 0; roadOffset = 0; spawnTimer = .6; coinTimer = 1.6;
    obstacles = []; coins = []; particles = []; player.x = 240; player.tilt = 0;
    running = true; overlay.classList.add("hidden"); updateFruitHud();
    scoreEl.textContent = "0"; coinsEl.textContent = "0"; speedEl.textContent = "1.0x";
    playSound("start");
  }

  function endGame() {
    if (!running) return;
    running = false; updateFruitHud(); playSound("hit");
    const finalScore = Math.floor(score);
    if (finalScore > best) {
      best = finalScore;
      try { localStorage.setItem("jacareMotoBest", String(best)); } catch (_) {}
      bestEl.textContent = best;
    }
    overlayEmoji.textContent = "💥"; overlayTitle.textContent = "Eita! Bateu o jacaré!";
    overlayText.textContent = `Você fez ${finalScore} pontos e pegou ${coinsCollected} moedas. Vamos tentar de novo?`;
    startBtn.textContent = "JOGAR NOVAMENTE"; overlay.classList.remove("hidden");
  }

  function showIntro() {
    overlayEmoji.textContent = "🐊"; overlayTitle.textContent = "Prepare-se para acelerar!";
    overlayText.textContent = "Desvie dos obstáculos, pegue moedas douradas (+25 pontos cada) e tente bater seu recorde.";
    startBtn.textContent = "COMEÇAR A CORRIDA"; overlay.classList.remove("hidden");
  }

  function setKey(key, value) {
    if (key === "ArrowLeft" || key.toLowerCase() === "a") keys.left = value;
    if (key === "ArrowRight" || key.toLowerCase() === "d") keys.right = value;
  }
  window.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    setKey(e.key, true);
    if (e.key === "Enter" && !running) startGame();
  });
  window.addEventListener("keyup", e => setKey(e.key, false));
  window.addEventListener("blur", () => { keys.left = false; keys.right = false; });

  function bindHold(id, key) {
    const btn = document.getElementById(id);
    const down = e => { e.preventDefault(); keys[key] = true; };
    const up = e => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener("pointerdown", down); btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up); btn.addEventListener("pointerleave", up);
  }
  bindHold("left", "left"); bindHold("right", "right");
  startBtn.addEventListener("click", startGame);
  skillButtons.forEach(button => button.addEventListener("click", () => {
    if (!running || !skillReady) return;
    selectedSkill = button.dataset.skill;
    updateFruitHud();
  }));
  activateSkillBtn.addEventListener("click", () => activateSkill(selectedSkill));
  shopToggle.addEventListener("click", () => {
    const opening = shopPanel.hidden;
    shopPanel.hidden = !opening;
    shopToggle.textContent = opening ? "✕ FECHAR LOJA" : "🛒 LOJA";
    if (opening) {
      shopMessage.textContent = "Escolha um rastro. As compras ficam salvas neste navegador.";
      refreshShop();
      shopPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
  shopButtons.forEach(button => button.addEventListener("click", () => {
    const skin = button.dataset.skin;
    const cost = Number(button.dataset.cost || 0);
    if (ownedSkins.includes(skin)) {
      selectedSkin = skin;
      saveShopData(); refreshShop();
      shopMessage.textContent = skin === "green" ? "Rastro Radical equipado. Bora acelerar!" :
        skin === "gold" ? "Rastro Dourado equipado. Brilhe na pista!" : "Rastro Neon equipado. Estilo elétrico!";
      return;
    }
    if (walletCoins < cost) {
      shopMessage.textContent = `Você precisa de mais ${cost - walletCoins} moeda(s) para desbloquear este rastro.`;
      return;
    }
    walletCoins -= cost;
    ownedSkins.push(skin);
    selectedSkin = skin;
    saveShopData(); refreshShop();
    shopMessage.textContent = "Rastro desbloqueado e equipado! Seu novo efeito já está ativo.";
  }));

  bikeButtons.forEach(button => button.addEventListener("click", () => {
    const bike = button.dataset.bike;
    const cost = Number(button.dataset.cost || 0);
    if (ownedBikes.includes(bike)) {
      selectedBike = bike;
      saveShopData(); refreshShop();
      shopMessage.textContent = bike === "classic" ? "Jacaré Clássico equipado. Visual original restaurado!" :
        bike === "sunset" ? "Jacaré Solar equipado. Cor quente selecionada!" : "Jacaré Glacial equipado. Visual frio selecionado!";
      return;
    }
    if (walletCoins < cost) {
      shopMessage.textContent = `Faltam ${cost - walletCoins} moeda(s) para desbloquear esta moto.`;
      return;
    }
    walletCoins -= cost;
    ownedBikes.push(bike);
    selectedBike = bike;
    saveShopData(); refreshShop();
    shopMessage.textContent = "Novo acabamento desbloqueado e equipado!";
  }));
  refreshShop();
  soundToggle.addEventListener("click", () => {
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? "🔊 Efeitos ligados" : "🔇 Efeitos desligados";
    soundToggle.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) { initAudio(); tone(660, .08, "sine", .035); }
  });

  musicToggle.addEventListener("click", () => {
    musicOn = !musicOn;
    musicToggle.textContent = musicOn ? "🎵 Música ligada" : "🔇 Música desligada";
    musicToggle.setAttribute("aria-pressed", String(musicOn));
    if (musicOn) {
      startMusic();
    } else {
      stopMusic();
    }
  });

  canvas.addEventListener("pointerdown", e => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * W;
    keys.left = x < W / 2; keys.right = x >= W / 2;
  });
  canvas.addEventListener("pointerup", () => { keys.left = false; keys.right = false; });
  canvas.addEventListener("pointercancel", () => { keys.left = false; keys.right = false; });

  showIntro(); updateFruitHud(); render(0); requestAnimationFrame(loop);
})();

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const motoSprite = new Image();
  motoSprite.src = "assets/moto-original.png";
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const overlay = document.getElementById("overlay");
  const overlayEmoji = document.getElementById("overlayEmoji");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("start");
  const soundToggle = document.getElementById("soundToggle");

  const W = canvas.width,
    H = canvas.height;
  const road = { x: 70, width: 340 };
  const lanes = [126, 240, 354];
  let best = 0;
  try {
    best = Number(localStorage.getItem("jacareMotoBest") || 0);
  } catch {
    best = 0;
  }
  let score = 0,
    coinsCollected = 0,
    speed = 260,
    elapsed = 0,
    roadOffset = 0,
    spawnTimer = 0,
    coinTimer = 0;
  let running = false,
    lastTime = 0,
    soundOn = true,
    audioCtx = null;
  let obstacles = [],
    coins = [],
    particles = [];
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
    } catch (_) {
      /* O jogo continua funcionando sem áudio. */
    }
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
    if (endFreq)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFreq),
        now + duration,
      );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playSound(kind) {
    if (!soundOn) return;
    if (kind === "start") {
      tone(440, 0.09, "triangle", 0.035);
      setTimeout(() => tone(660, 0.12, "triangle", 0.04), 90);
    }
    if (kind === "coin") {
      tone(880, 0.08, "sine", 0.06);
      setTimeout(() => tone(1320, 0.12, "sine", 0.045), 65);
    }
    if (kind === "hit") {
      tone(190, 0.22, "sawtooth", 0.07, 65);
      setTimeout(() => tone(90, 0.24, "triangle", 0.04, 40), 80);
    }
  }

  function roundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawBackground() {
    ctx.fillStyle = "#4c914a";
    ctx.fillRect(0, 0, W, H);
    for (let y = -40 + (roadOffset % 80); y < H; y += 80) {
      ctx.fillStyle = "#5ca653";
      ctx.fillRect(10, y, 38, 23);
      ctx.fillRect(432, y + 34, 30, 20);
      ctx.fillStyle = "#3c7b3b";
      ctx.fillRect(30, y + 12, 12, 4);
      ctx.fillRect(438, y + 47, 10, 4);
    }
    ctx.fillStyle = "#d6d4b2";
    ctx.fillRect(road.x - 9, 0, road.width + 18, H);
    ctx.fillStyle = "#343b3d";
    ctx.fillRect(road.x, 0, road.width, H);
    for (let y = -55 + (roadOffset % 55); y < H; y += 55) {
      ctx.fillStyle = "#3e4547";
      ctx.fillRect(road.x + 16, y, road.width - 32, 2);
    }
    ctx.fillStyle = "#f4f0c9";
    for (const x of [road.x + road.width / 3, road.x + (road.width * 2) / 3]) {
      for (let y = -70 + (roadOffset % 100); y < H; y += 100)
        ctx.fillRect(x - 3, y, 6, 48);
    }
    for (let i = 0; i < 7; i++) {
      const y = ((i * 119 + roadOffset * 0.7) % (H + 50)) - 30;
      ctx.fillStyle = "#2d6635";
      ctx.beginPath();
      ctx.arc(56, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(424, y + 40, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGator(x, y, tilt, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = "#172a18aa";
    ctx.beginPath();
    ctx.ellipse(0, 8, 40, 66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#267b3e";
    ctx.strokeStyle = "#14542d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 37);
    ctx.quadraticCurveTo(-30, 56, -18, 76);
    ctx.quadraticCurveTo(-5, 64, 5, 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#80c64b";
      ctx.beginPath();
      ctx.moveTo(-17 + i * 3, 47 + i * 5);
      ctx.lineTo(-10 + i * 3, 43 + i * 5);
      ctx.lineTo(-10 + i * 3, 49 + i * 5);
      ctx.closePath();
      ctx.fill();
    }
    const swing = Math.sin(time * 17) * 8;
    const legs = [
      { x: -22, y: 23, a: swing },
      { x: 22, y: 23, a: -swing },
      { x: -21, y: -20, a: -swing },
      { x: 21, y: -20, a: swing },
    ];
    legs.forEach((leg) => {
      ctx.save();
      ctx.translate(leg.x, leg.y);
      ctx.rotate((leg.a * Math.PI) / 180);
      roundedRect(-7, -2, 15, 28, 7, "#2f9148", "#14542d");
      ctx.fillStyle = "#b8e56a";
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.ellipse(-4 + c * 5, 23, 2.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.fillStyle = "#278744";
    ctx.strokeStyle = "#14542d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 53, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b9d66a";
    ctx.beginPath();
    ctx.ellipse(0, 4, 19, 39, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "#86ad4b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, -18 + i * 7);
      ctx.quadraticCurveTo(0, -13 + i * 7, 14, -18 + i * 7);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const yy = -42 + i * 10;
      ctx.fillStyle = "#a3dc56";
      ctx.beginPath();
      ctx.moveTo(-5, yy + 4);
      ctx.lineTo(0, yy - 5);
      ctx.lineTo(5, yy + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#32984a";
    ctx.strokeStyle = "#14542d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -48, 26, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-22, -66, 44, 32, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b9df72";
    ctx.beginPath();
    ctx.roundRect(-18, -48, 36, 11, 5);
    ctx.fill();
    ctx.fillStyle = "#123e24";
    ctx.beginPath();
    ctx.arc(-10, -59, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -59, 2.4, 0, Math.PI * 2);
    ctx.fill();
    [-15, 15].forEach((ex) => {
      ctx.fillStyle = "#b9e75c";
      ctx.beginPath();
      ctx.arc(ex, -72, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, -73, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#17251a";
      ctx.beginPath();
      ctx.arc(ex + 1, -73, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#fff8d8";
    for (let i = 0; i < 5; i++) {
      const dx = -13 + i * 6.5;
      ctx.beginPath();
      ctx.moveTo(dx, -39);
      ctx.lineTo(dx + 3, -39);
      ctx.lineTo(dx + 1.5, -34);
      ctx.closePath();
      ctx.fill();
    }
    drawRider(0, -14, "#e44d3e", "#ffdb9b", "#283b54", false);
    drawRider(0, 17, "#4b8ee8", "#f2c59a", "#e9f0f4", true);
    ctx.restore();
  }

  function drawRider(x, y, jacket, skin, helmet, passenger) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = jacket;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7, 3);
    ctx.lineTo(-16, 12);
    ctx.lineTo(-10, 17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, 3);
    ctx.lineTo(16, 12);
    ctx.lineTo(10, 17);
    ctx.stroke();
    ctx.fillStyle = jacket;
    ctx.strokeStyle = "#24352a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = jacket;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(-15, -12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -4);
    ctx.lineTo(15, -12);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = helmet;
    ctx.beginPath();
    ctx.arc(0, -16, 9, Math.PI, Math.PI * 2);
    ctx.lineTo(9, -14);
    ctx.quadraticCurveTo(0, -8, -9, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#bfe8f3";
    ctx.beginPath();
    ctx.ellipse(0, -14, 7, 3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (passenger) {
      roundedRect(-8, -1, 16, 13, 4, "#f0b63f", "#8b6121");
    }
    ctx.restore();
  }

  // Usa a imagem original enviada pelo usuário: jacaré-moto com os dois pilotos.
  function drawOriginalMoto(x, y, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const spriteW = 125;
    const spriteH = spriteW * (408 / 300);
    if (motoSprite.complete && motoSprite.naturalWidth > 0) {
      ctx.drawImage(motoSprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
    } else {
      // Fallback simples caso a imagem ainda esteja carregando.
      drawGator(0, 0, 0, performance.now() / 1000);
    }
    ctx.restore();
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.type === "cone") {
      ctx.fillStyle = "#e95c32";
      ctx.strokeStyle = "#87351e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(16, 17);
      ctx.lineTo(-16, 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff2d5";
      ctx.fillRect(-11, 1, 22, 5);
      roundedRect(-20, 15, 40, 7, 3, "#f3d9a3", "#9b7b49");
    } else if (o.type === "rock") {
      ctx.fillStyle = "#92999a";
      ctx.strokeStyle = "#50585a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-23, 13);
      ctx.lineTo(-18, -9);
      ctx.lineTo(-3, -19);
      ctx.lineTo(17, -13);
      ctx.lineTo(24, 6);
      ctx.lineTo(10, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b9c0bf";
      ctx.beginPath();
      ctx.moveTo(-12, -7);
      ctx.lineTo(-2, -14);
      ctx.lineTo(6, -9);
      ctx.closePath();
      ctx.fill();
    } else {
      roundedRect(-24, -36, 48, 72, 10, o.color || "#d84a45", "#772d2b");
      roundedRect(-17, -21, 34, 22, 6, "#a8d5dc", "#35545b");
      roundedRect(-17, 8, 34, 16, 5, "#516e76", "#293e43");
      ctx.fillStyle = "#f6edb4";
      ctx.fillRect(-19, -32, 9, 4);
      ctx.fillRect(10, -32, 9, 4);
      ctx.fillStyle = "#23292a";
      ctx.fillRect(-28, -22, 5, 15);
      ctx.fillRect(23, -22, 5, 15);
      ctx.fillRect(-28, 15, 5, 15);
      ctx.fillRect(23, 15, 5, 15);
    }
    ctx.restore();
  }

  function drawCoin(c, time) {
    const spin = Math.abs(Math.cos(time * 7 + c.phase));
    const rx = Math.max(3, 11 * spin);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.globalAlpha = c.collected ? 0 : 1;
    ctx.fillStyle = "#8b5a0b";
    ctx.beginPath();
    ctx.ellipse(2, 3, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createLinearGradient(-12, -10, 12, 12);
    grad.addColorStop(0, "#fff3a0");
    grad.addColorStop(0.45, "#ffd13d");
    grad.addColorStop(1, "#e58a00");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#fff0a0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (spin > 0.45) {
      ctx.fillStyle = "#9a5c00";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
    }
    ctx.restore();
  }

  function spawnObstacle() {
    const type =
      Math.random() < 0.32 ? "cone" : Math.random() < 0.48 ? "rock" : "car";
    const lane = Math.floor(Math.random() * lanes.length);
    const colors = ["#d84a45", "#e6b43b", "#527fda", "#c7d3d4"];
    obstacles.push({
      x: lanes[lane],
      y: -60,
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
      passed: false,
    });
  }

  function spawnCoinLine() {
    const lane = Math.floor(Math.random() * lanes.length);
    const count = Math.random() < 0.55 ? 3 : 5;
    for (let i = 0; i < count; i++)
      coins.push({
        x: lanes[lane],
        y: -35 - i * 48,
        phase: Math.random() * Math.PI * 2,
        collected: false,
      });
  }

  function hitTest(o) {
    const dx = Math.abs(o.x - player.x),
      dy = Math.abs(o.y - player.y);
    const ow = o.type === "car" ? 25 : 21,
      oh = o.type === "car" ? 36 : 20;
    return dx < 34 + ow && dy < 58 + oh;
  }

  function collectCoin(c) {
    c.collected = true;
    coinsCollected++;
    score += 25;
    coinsEl.textContent = coinsCollected;
    scoreEl.textContent = Math.floor(score);
    playSound("coin");
    for (let i = 0; i < 8; i++)
      particles.push({
        x: c.x,
        y: c.y,
        vx: (Math.random() - 0.5) * 100,
        vy: -Math.random() * 100,
        life: 0.45,
        maxLife: 0.45,
      });
  }

  function update(dt) {
    if (!running) return;
    elapsed += dt;
    speed = Math.min(530, 260 + elapsed * 5.2);
    roadOffset = (roadOffset + speed * dt) % 100;
    score += dt * (8 + speed / 65);
    spawnTimer -= dt;
    coinTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer =
        Math.max(0.48, 1.12 - elapsed * 0.006) + Math.random() * 0.42;
    }
    if (coinTimer <= 0) {
      spawnCoinLine();
      coinTimer = 2.7 + Math.random() * 2.0;
    }
    const move = 255 * dt;
    if (keys.left) player.x -= move;
    if (keys.right) player.x += move;
    player.x = Math.max(
      road.x + 42,
      Math.min(road.x + road.width - 42, player.x),
    );
    player.tilt = keys.left ? -0.13 : keys.right ? 0.13 : player.tilt * 0.8;

    obstacles.forEach((o) => {
      o.y += speed * dt;
      if (!o.passed && o.y > player.y + 50) {
        o.passed = true;
        score += 10;
      }
      if (hitTest(o)) endGame();
    });
    obstacles = obstacles.filter((o) => o.y < H + 70);

    coins.forEach((c) => {
      c.y += speed * dt;
      if (
        !c.collected &&
        Math.abs(c.x - player.x) < 38 &&
        Math.abs(c.y - player.y) < 48
      )
        collectCoin(c);
    });
    coins = coins.filter((c) => c.y < H + 40 && !c.collected);

    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
    });
    particles = particles.filter((p) => p.life > 0);
    scoreEl.textContent = Math.floor(score);
    speedEl.textContent = (speed / 260).toFixed(1) + "x";
  }

  function render(time) {
    const t = time / 1000;
    drawBackground();
    coins.forEach((c) => drawCoin(c, t));
    obstacles.forEach(drawObstacle);
    drawOriginalMoto(player.x, player.y, player.tilt);
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (running) {
      ctx.strokeStyle = "#ffffff50";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const x = 20 + i * 13,
          y = (t * speed * 1.8 + i * 127) % H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 20);
        ctx.stroke();
      }
    }
  }

  function loop(timestamp) {
    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.035);
    lastTime = timestamp;
    update(dt);
    render(timestamp);
    requestAnimationFrame(loop);
  }

  function startGame() {
    initAudio();
    score = 0;
    coinsCollected = 0;
    speed = 260;
    elapsed = 0;
    roadOffset = 0;
    spawnTimer = 0.6;
    coinTimer = 1.6;
    obstacles = [];
    coins = [];
    particles = [];
    player.x = 240;
    player.tilt = 0;
    running = true;
    overlay.classList.add("hidden");
    scoreEl.textContent = "0";
    coinsEl.textContent = "0";
    speedEl.textContent = "1.0x";
    playSound("start");
  }

  function endGame() {
    if (!running) return;
    running = false;
    playSound("hit");
    const finalScore = Math.floor(score);
    if (finalScore > best) {
      best = finalScore;
      localStorage.setItem("jacareMotoBest", String(best));
      bestEl.textContent = best;
    }
    overlayEmoji.textContent = "💥";
    overlayTitle.textContent = "Eita! Bateu o jacaré!";
    overlayText.textContent = `Você fez ${finalScore} pontos e pegou ${coinsCollected} moedas. Vamos tentar de novo?`;
    startBtn.textContent = "JOGAR NOVAMENTE";
    overlay.classList.remove("hidden");
  }

  function showIntro() {
    overlayEmoji.textContent = "🐊";
    overlayTitle.textContent = "Prepare-se para acelerar!";
    overlayText.textContent =
      "Desvie dos obstáculos, pegue moedas douradas (+25 pontos cada) e tente bater seu recorde.";
    startBtn.textContent = "COMEÇAR A CORRIDA";
    overlay.classList.remove("hidden");
  }

  function setKey(key, value) {
    if (key === "ArrowLeft" || key.toLowerCase() === "a") keys.left = value;
    if (key === "ArrowRight" || key.toLowerCase() === "d") keys.right = value;
  }
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    setKey(e.key, true);
    if (e.key === "Enter" && !running) startGame();
  });
  window.addEventListener("keyup", (e) => setKey(e.key, false));
  window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
  });

  function bindHold(id, key) {
    const btn = document.getElementById(id);
    const down = (e) => {
      e.preventDefault();
      keys[key] = true;
    };
    const up = (e) => {
      e.preventDefault();
      keys[key] = false;
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  }
  bindHold("left", "left");
  bindHold("right", "right");
  startBtn.addEventListener("click", startGame);
  soundToggle.addEventListener("click", () => {
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? "🔊 Som ligado" : "🔇 Som desligado";
    soundToggle.setAttribute("aria-pressed", String(!soundOn));
    if (soundOn) {
      initAudio();
      tone(660, 0.08, "sine", 0.035);
    }
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect(),
      x = ((e.clientX - rect.left) / rect.width) * W;
    keys.left = x < W / 2;
    keys.right = x >= W / 2;
  });
  canvas.addEventListener("pointerup", () => {
    keys.left = false;
    keys.right = false;
  });
  canvas.addEventListener("pointercancel", () => {
    keys.left = false;
    keys.right = false;
  });

  showIntro();
  render(0);
  requestAnimationFrame(loop);
})();

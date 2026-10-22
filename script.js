(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const playerSprite = new Image();
  playerSprite.src = "jacare-piloto-garupa.png";
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const overlay = document.getElementById("overlay");
  const overlayEmoji = document.getElementById("overlayEmoji");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");

  const W = canvas.width, H = canvas.height;
  const road = { x: 70, width: 340 };
  const lanes = [126, 240, 354];
  let best = Number(localStorage.getItem("jacareMotoBest") || 0);
  let score = 0, speed = 260, elapsed = 0, roadOffset = 0, spawnTimer = 0;
  let running = false, gameOver = false, lastTime = 0;
  let obstacles = [];
  const keys = { left: false, right: false };
  const player = { x: 240, y: 555, width: 90, height: 140, tilt: 0 };
  bestEl.textContent = best;

  function roundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawBackground(dt) {
    ctx.fillStyle = "#4c914a";
    ctx.fillRect(0, 0, W, H);
    // Grama e pequenos tufos laterais
    for (let y = -40 + (roadOffset % 80); y < H; y += 80) {
      ctx.fillStyle = "#5ca653";
      ctx.fillRect(10, y, 38, 23);
      ctx.fillRect(432, y + 34, 30, 20);
      ctx.fillStyle = "#3c7b3b";
      ctx.fillRect(30, y + 12, 12, 4);
      ctx.fillRect(438, y + 47, 10, 4);
    }
    // Acostamento e estrada
    ctx.fillStyle = "#d6d4b2";
    ctx.fillRect(road.x - 9, 0, road.width + 18, H);
    ctx.fillStyle = "#343b3d";
    ctx.fillRect(road.x, 0, road.width, H);
    // textura da pista
    for (let y = -55 + (roadOffset % 55); y < H; y += 55) {
      ctx.fillStyle = "#3e4547";
      ctx.fillRect(road.x + 16, y, road.width - 32, 2);
    }
    // linhas de faixa
    ctx.fillStyle = "#f4f0c9";
    for (const x of [road.x + road.width / 3, road.x + road.width * 2 / 3]) {
      for (let y = -70 + (roadOffset % 100); y < H; y += 100) {
        ctx.fillRect(x - 3, y, 6, 48);
      }
    }
    // arbustos / pedrinhas decorativas
    for (let i = 0; i < 7; i++) {
      const y = (i * 119 + roadOffset * 0.7) % (H + 50) - 30;
      ctx.fillStyle = "#2d6635";
      ctx.beginPath(); ctx.arc(56, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(424, y + 40, 11, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawGator(x, y, tilt, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // Sombra no chão
    ctx.fillStyle = "#172a18aa";
    ctx.beginPath(); ctx.ellipse(0, 8, 40, 66, 0, 0, Math.PI * 2); ctx.fill();

    // Cauda comprida, com ponta afilada
    ctx.fillStyle = "#267b3e";
    ctx.strokeStyle = "#14542d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 37); ctx.quadraticCurveTo(-30, 56, -18, 76);
    ctx.quadraticCurveTo(-5, 64, 5, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
    // placas na cauda
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#80c64b";
      ctx.beginPath(); ctx.moveTo(-17 + i * 3, 47 + i * 5); ctx.lineTo(-10 + i * 3, 43 + i * 5); ctx.lineTo(-10 + i * 3, 49 + i * 5); ctx.closePath(); ctx.fill();
    }

    // Quatro patas em movimento, alternadas
    const swing = Math.sin(time * 17) * 8;
    const legs = [
      {x:-22, y:23, a:swing}, {x:22, y:23, a:-swing},
      {x:-21, y:-20, a:-swing}, {x:21, y:-20, a:swing}
    ];
    legs.forEach((leg, i) => {
      ctx.save(); ctx.translate(leg.x, leg.y); ctx.rotate(leg.a * Math.PI / 180);
      ctx.fillStyle = "#25813e"; ctx.strokeStyle = "#14542d"; ctx.lineWidth = 2;
      roundedRect(-7, -2, 15, 28, 7, "#2f9148", "#14542d");
      ctx.fillStyle = "#b8e56a";
      for (let c = 0; c < 3; c++) {
        ctx.beginPath(); ctx.ellipse(-4 + c * 5, 23, 2.5, 4, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });

    // Corpo
    ctx.fillStyle = "#278744"; ctx.strokeStyle = "#14542d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 31, 53, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // barriga
    ctx.fillStyle = "#b9d66a";
    ctx.beginPath(); ctx.ellipse(0, 4, 19, 39, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "#86ad4b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-14, -18 + i * 7); ctx.quadraticCurveTo(0, -13 + i * 7, 14, -18 + i * 7); ctx.stroke();
    }
    // escamas dorsais
    for (let i = 0; i < 8; i++) {
      const yy = -42 + i * 10;
      ctx.fillStyle = "#a3dc56";
      ctx.beginPath(); ctx.moveTo(-5, yy + 4); ctx.lineTo(0, yy - 5); ctx.lineTo(5, yy + 4); ctx.closePath(); ctx.fill();
    }

    // Cabeça e focinho
    ctx.fillStyle = "#32984a"; ctx.strokeStyle = "#14542d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -48, 26, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-22, -66, 44, 32, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b9df72";
    ctx.beginPath(); ctx.roundRect(-18, -48, 36, 11, 5); ctx.fill();
    // narinas
    ctx.fillStyle = "#123e24";
    ctx.beginPath(); ctx.arc(-10, -59, 2.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -59, 2.4, 0, Math.PI*2); ctx.fill();
    // olhos expressivos
    [-15, 15].forEach(ex => {
      ctx.fillStyle = "#b9e75c"; ctx.beginPath(); ctx.arc(ex, -72, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, -73, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#17251a"; ctx.beginPath(); ctx.arc(ex + 1, -73, 2.5, 0, Math.PI*2); ctx.fill();
    });
    // dentes
    ctx.fillStyle = "#fff8d8";
    for (let i = 0; i < 5; i++) {
      const dx = -13 + i * 6.5;
      ctx.beginPath(); ctx.moveTo(dx, -39); ctx.lineTo(dx + 3, -39); ctx.lineTo(dx + 1.5, -34); ctx.closePath(); ctx.fill();
    }

    // Piloto e garupa sentados no dorso: cabeças e capacetes
    drawRider(0, -14, "#e44d3e", "#ffdb9b", "#283b54", false);
    drawRider(0, 17, "#4b8ee8", "#f2c59a", "#e9f0f4", true);

    ctx.restore();
  }

  function drawRider(x, y, jacket, skin, helmet, passenger) {
    ctx.save(); ctx.translate(x, y);
    // pernas / braços
    ctx.strokeStyle = jacket; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-16, 12); ctx.lineTo(-10, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(16, 12); ctx.lineTo(10, 17); ctx.stroke();
    // tronco
    ctx.fillStyle = jacket; ctx.strokeStyle = "#24352a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // braços apoiados
    ctx.strokeStyle = jacket; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-15, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(15, -12); ctx.stroke();
    // cabeça e capacete
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -14, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(0, -16, 9, Math.PI, Math.PI*2); ctx.lineTo(9, -14); ctx.quadraticCurveTo(0, -8, -9, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#bfe8f3"; ctx.beginPath(); ctx.ellipse(0, -14, 7, 3, 0, Math.PI, Math.PI*2); ctx.fill();
    if (passenger) {
      // mochilinha do garupa
      ctx.fillStyle = "#f0b63f"; roundedRect(-8, -1, 16, 13, 4, "#f0b63f", "#8b6121");
    }
    ctx.restore();
  }

  function drawObstacle(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    if (o.type === "cone") {
      ctx.fillStyle = "#e95c32"; ctx.strokeStyle = "#87351e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16, 17); ctx.lineTo(-16, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff2d5"; ctx.fillRect(-11, 1, 22, 5);
      roundedRect(-20, 15, 40, 7, 3, "#f3d9a3", "#9b7b49");
    } else if (o.type === "rock") {
      ctx.fillStyle = "#92999a"; ctx.strokeStyle = "#50585a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-23, 13); ctx.lineTo(-18, -9); ctx.lineTo(-3, -19); ctx.lineTo(17, -13); ctx.lineTo(24, 6); ctx.lineTo(10, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#b9c0bf"; ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-2, -14); ctx.lineTo(6, -9); ctx.closePath(); ctx.fill();
    } else {
      // carro visto de cima
      roundedRect(-24, -36, 48, 72, 10, o.color || "#d84a45", "#772d2b");
      roundedRect(-17, -21, 34, 22, 6, "#a8d5dc", "#35545b");
      roundedRect(-17, 8, 34, 16, 5, "#516e76", "#293e43");
      ctx.fillStyle = "#f6edb4"; ctx.fillRect(-19, -32, 9, 4); ctx.fillRect(10, -32, 9, 4);
      ctx.fillStyle = "#23292a"; ctx.fillRect(-28, -22, 5, 15); ctx.fillRect(23, -22, 5, 15); ctx.fillRect(-28, 15, 5, 15); ctx.fillRect(23, 15, 5, 15);
    }
    ctx.restore();
  }

  function spawnObstacle() {
    const type = Math.random() < 0.32 ? "cone" : Math.random() < 0.48 ? "rock" : "car";
    const lane = Math.floor(Math.random() * lanes.length);
    const colors = ["#d84a45", "#e6b43b", "#527fda", "#c7d3d4"];
    obstacles.push({ x: lanes[lane], y: -60, type, color: colors[Math.floor(Math.random()*colors.length)], passed: false });
  }

  function hitTest(o) {
    const dx = Math.abs(o.x - player.x);
    const dy = Math.abs(o.y - player.y);
    const ow = o.type === "car" ? 25 : 21;
    const oh = o.type === "car" ? 36 : 20;
    return dx < 43 + ow && dy < 49 + oh;
  }

  function update(dt) {
    if (!running) return;
    elapsed += dt;
    speed = Math.min(530, 260 + elapsed * 5.2);
    roadOffset = (roadOffset + speed * dt) % 100;
    score += dt * (8 + speed / 65);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(0.48, 1.12 - elapsed * 0.006) + Math.random() * 0.42;
    }
    const move = 255 * dt;
    if (keys.left) player.x -= move;
    if (keys.right) player.x += move;
    player.x = Math.max(road.x + 42, Math.min(road.x + road.width - 42, player.x));
    player.tilt = keys.left ? -0.13 : keys.right ? 0.13 : player.tilt * 0.8;

    obstacles.forEach(o => {
      o.y += speed * dt;
      if (!o.passed && o.y > player.y + 50) { o.passed = true; score += 10; }
      if (hitTest(o)) endGame();
    });
    obstacles = obstacles.filter(o => o.y < H + 70);
    scoreEl.textContent = Math.floor(score);
    speedEl.textContent = (speed / 260).toFixed(1) + "x";
  }

  function render(time) {
    const t = time / 1000;
    drawBackground(0);
    obstacles.forEach(drawObstacle);
    if (playerSprite.complete && playerSprite.naturalWidth > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.tilt);
      // Sprite detalhado do jacaré com piloto e garupa, visto de cima.
      const spriteW = 166;
      const spriteH = spriteW * (playerSprite.naturalHeight / playerSprite.naturalWidth);
      ctx.drawImage(playerSprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
      ctx.restore();
    } else {
      drawGator(player.x, player.y, player.tilt, t);
    }
    // pequena indicação de velocidade
    if (running) {
      ctx.strokeStyle = "#ffffff50"; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const x = 20 + i * 13;
        const y = (t * speed * 1.8 + i * 127) % H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 20); ctx.stroke();
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
    score = 0; speed = 260; elapsed = 0; roadOffset = 0; spawnTimer = 0.6;
    obstacles = []; player.x = 240; player.tilt = 0;
    running = true; gameOver = false;
    overlay.classList.add("hidden");
    scoreEl.textContent = "0"; speedEl.textContent = "1.0x";
  }

  function endGame() {
    if (!running) return;
    running = false; gameOver = true;
    const finalScore = Math.floor(score);
    if (finalScore > best) {
      best = finalScore;
      localStorage.setItem("jacareMotoBest", String(best));
      bestEl.textContent = best;
    }
    overlayEmoji.textContent = "💥";
    overlayTitle.textContent = "Eita! Bateu o jacaré!";
    overlayText.textContent = `Você fez ${finalScore} pontos. O piloto e o garupa precisam de outra tentativa!`;
    startBtn.textContent = "JOGAR NOVAMENTE";
    overlay.classList.remove("hidden");
  }

  function showIntro() {
    overlayEmoji.textContent = "🐊";
    overlayTitle.textContent = "Prepare-se para acelerar!";
    overlayText.textContent = "Desvie dos obstáculos com seu jacaré motorizado. Piloto e garupa estão prontos?";
    startBtn.textContent = "COMEÇAR A CORRIDA";
    overlay.classList.remove("hidden");
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
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  }
  bindHold("leftBtn", "left");
  bindHold("rightBtn", "right");
  startBtn.addEventListener("click", startGame);

  // Permite usar toque na própria tela para virar, além dos botões.
  canvas.addEventListener("pointerdown", e => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * W;
    keys.left = x < W / 2;
    keys.right = x >= W / 2;
  });
  canvas.addEventListener("pointerup", () => { keys.left = false; keys.right = false; });
  canvas.addEventListener("pointercancel", () => { keys.left = false; keys.right = false; });

  showIntro();
  render(0);
  requestAnimationFrame(loop);
})();
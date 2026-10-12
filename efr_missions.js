/* EFR field missions: transient raid objectives integrated through existing runtime hooks. */
(() => {
  "use strict";

  const G = () => window.EFRGame;
  const modal = document.getElementById("efrMissionModal");
  let observedWorld = null;
  let raidState = null;

  function missionTitle(mission) {
    if (!mission) return "探索中ミッション";
    return mission.kind === "kill"
      ? `指定エリア内の敵を${mission.targetCount}体倒せ`
      : `指定エリアを${mission.duration}秒守れ`;
  }

  function missionDescription(mission) {
    if (mission?.kind === "kill") {
      return `青い円で示されたエリア内で敵を${mission.targetCount}体倒してください。敵が倒れた位置がエリア外の場合、進捗には含まれません。`;
    }
    return `青い円形エリアを${mission?.duration || 60}秒間守ってください。敵1体の当たり判定がエリアと連続10秒間重なると任務失敗です。敵がエリア外へ出ると、その敵の侵入時間はリセットされます。`;
  }

  function missionRewardCredits() {
    const core = window.EFRBaseCore;
    const rarityMap =
      window.EFRContentExpansion?.catalog?.materialRarities ||
      window.EFRCombat?.materialRarities || {};
    const materialName = Number(rarityMap["革"]) === 2
      ? "革"
      : Object.keys(rarityMap).find(name => Number(rarityMap[name]) === 2);
    const item = {
      name: materialName || "革",
      kind: "material",
      amount: 1
    };
    const basicValue = Number(core?.itemBasicValue?.(item) || 0);
    if (!(basicValue > 0)) return 114;
    const sellPrice = Number(core?.itemSellPrice?.(item) || 0);
    const buyRate = Number(core?.economyBuyRate?.() || 1.5);
    const purchasePrice = Math.max(
      sellPrice + 1,
      Math.ceil(basicValue * buyRate)
    );
    return Math.max(1, purchasePrice) * 3;
  }

  function randomFromSeed(seedValue) {
    let seed = (Number(seedValue) >>> 0) || 1;
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function findOfferPoint(game) {
    const world = game?.world;
    const player = game?.player;
    if (!world || !player) return null;
    const width = Number(world.walls?.[0]?.w || 1920);
    const height = Number(world.walls?.[2]?.h || 1080);
    const buildings = Array.isArray(world.buildings) ? world.buildings : [];
    const isOpen = (x, y, margin = 38) => {
      if (x < 18 + margin || x > width - 18 - margin) return false;
      if (y < 18 + margin || y > height - 18 - margin) return false;
      return !buildings.some(building =>
        x >= building.x - margin &&
        x <= building.x + building.w + margin &&
        y >= building.y - margin &&
        y <= building.y + building.h + margin
      );
    };

    const candidates = [];
    for (let dx = -250; dx <= 250; dx += 10) {
      for (let dy = -130; dy <= 130; dy += 10) {
        const distance = Math.hypot(dx, dy);
        if (distance < 100 || distance > 270) continue;
        const x = player.x + dx;
        const y = player.y + dy;
        if (isOpen(x, y)) candidates.push({ x, y, distance });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    if (candidates.length) return { x: candidates[0].x, y: candidates[0].y };

    let fallback = null;
    let fallbackDistance = Infinity;
    for (let y = 55; y < height - 55; y += 24) {
      for (let x = 55; x < width - 55; x += 24) {
        if (!isOpen(x, y, 30)) continue;
        const distance = Math.hypot(x - player.x, y - player.y);
        if (distance >= 90 && distance < fallbackDistance) {
          fallback = { x, y };
          fallbackDistance = distance;
        }
      }
    }
    return fallback || {
      x: Math.max(55, Math.min(width - 55, player.x + 110)),
      y: Math.max(55, Math.min(height - 55, player.y))
    };
  }

  function ensureWorldState() {
    const game = G();
    if (!game?.running || !game.world) return null;
    if (observedWorld === game.world && raidState) return raidState;

    observedWorld = game.world;
    const random = randomFromSeed(game.world.seed);
    const position = findOfferPoint(game);
    const kind = random() < 0.5 ? "kill" : "defend";
    const enemyRadius = Math.max(
      1,
      Number(game.enemies?.find(enemy => Number(enemy.r) > 0)?.r || 15)
    );
    const offer = position ? {
      x: position.x,
      y: position.y,
      kind,
      targetCount: 3,
      duration: 60,
      zoneRadius: kind === "defend" ? enemyRadius * 2 : 150
    } : null;
    raidState = {
      world: game.world,
      offer,
      active: null,
      accepted: false,
      finished: false,
      reward: missionRewardCredits()
    };
    return raidState;
  }

  function getOffer() {
    return ensureWorldState()?.offer || null;
  }

  function isModalOpen() {
    return !!modal && !modal.classList.contains("hidden");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? "");
  }

  function openModal() {
    const state = ensureWorldState();
    if (!state?.offer || !modal || !G()?.running) return false;
    setText("efrMissionTitle", missionTitle(state.offer));
    setText("efrMissionDescription", missionDescription(state.offer));
    setText("efrMissionReward", `${state.reward.toLocaleString("ja-JP")} クレジット`);
    setText(
      "efrMissionNote",
      "報酬はクレジットのみです。任務に失敗しても探索自体は続行され、報酬は任務達成時だけ支給されます。"
    );
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("interactionBar")?.classList.add("hidden");
    modal.querySelector(".efrMissionWindow")?.focus?.();
    return true;
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    G()?.refreshInteraction?.();
  }

  function acceptOffer() {
    const game = G();
    const state = ensureWorldState();
    const offer = state?.offer;
    if (!game?.running || !state || !offer || state.active || state.finished) return false;
    const deadState = new Map();
    for (const enemy of game.enemies || []) deadState.set(enemy, !!enemy.dead);
    state.active = {
      kind: offer.kind,
      x: offer.x,
      y: offer.y,
      targetCount: offer.targetCount,
      duration: offer.duration,
      zoneRadius: offer.zoneRadius,
      elapsed: 0,
      killCount: 0,
      deadState,
      overlapTimers: new Map(),
      reward: state.reward
    };
    state.offer = null;
    state.accepted = true;
    closeModal();
    game.logMessage?.(`任務を受注しました：${missionTitle(state.active)}`);
    game.refreshInteraction?.();
    return true;
  }

  function finishMission(success, reason = "") {
    const game = G();
    const state = raidState;
    const mission = state?.active;
    if (!game || !state || !mission) return;

    if (success) {
      const paid = window.EFRBaseCore?.addCurrency?.(mission.reward) === true;
      if (!paid) {
        state.active = null;
        state.finished = true;
        game.logMessage?.("任務は達成しましたが、クレジット報酬を加算できませんでした。");
        return;
      }
      state.active = null;
      state.finished = true;
      game.logMessage?.(`任務達成：${missionTitle(mission)}（+${mission.reward.toLocaleString("ja-JP")} クレジット）`);
      return;
    }

    state.active = null;
    state.finished = true;
    game.logMessage?.(`任務失敗：${reason || "条件を達成できませんでした"}。探索は続行できます。`);
  }

  function processMission(dt) {
    const game = G();
    const state = ensureWorldState();
    const mission = state?.active;
    if (!game?.running || !mission || isModalOpen()) return;
    const frameTime = Math.max(0, Math.min(0.1, Number(dt) || 0));

    if (mission.kind === "kill") {
      for (const enemy of game.enemies || []) {
        if (!mission.deadState.has(enemy)) {
          mission.deadState.set(enemy, !!enemy.dead);
          continue;
        }
        const wasDead = mission.deadState.get(enemy);
        const isDead = !!enemy.dead;
        mission.deadState.set(enemy, isDead);
        if (wasDead || !isDead) continue;
        if (Math.hypot(enemy.x - mission.x, enemy.y - mission.y) <= mission.zoneRadius) {
          mission.killCount += 1;
        }
      }
      if (mission.killCount >= mission.targetCount) {
        finishMission(true);
      }
      return;
    }

    for (const enemy of game.enemies || []) {
      if (enemy.dead) {
        mission.overlapTimers.delete(enemy);
        continue;
      }
      const overlaps = Math.hypot(
        Number(enemy.x) - mission.x,
        Number(enemy.y) - mission.y
      ) <= mission.zoneRadius + Math.max(0, Number(enemy.r) || 0);
      if (!overlaps) {
        mission.overlapTimers.delete(enemy);
        continue;
      }
      const overlapTime = (mission.overlapTimers.get(enemy) || 0) + frameTime;
      mission.overlapTimers.set(enemy, overlapTime);
      if (overlapTime >= 10) {
        finishMission(false, "敵1体が防衛エリアと10秒間連続で重なりました");
        return;
      }
    }

    mission.elapsed = Math.min(mission.duration, mission.elapsed + frameTime);
    if (mission.elapsed >= mission.duration) finishMission(true);
  }

  function drawMission() {
    const game = G();
    const state = ensureWorldState();
    if (!game?.running || !state) return;
    const ctx = game.ctx;
    if (!ctx) return;

    if (state.offer) {
      const offer = state.offer;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
      ctx.save();
      ctx.shadowColor = "rgba(39,121,231,.6)";
      ctx.shadowBlur = 8 + 7 * pulse;
      ctx.fillStyle = "#2879e7";
      ctx.beginPath();
      ctx.arc(offer.x, offer.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 21px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", offer.x, offer.y - 1);
      ctx.restore();
      return;
    }

    const mission = state.active;
    if (!mission) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mission.x, mission.y, mission.zoneRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(40,121,231,.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(111,177,255,.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    const progress = mission.kind === "kill"
      ? `撃破 ${mission.killCount}/${mission.targetCount}`
      : `防衛 ${Math.floor(mission.elapsed)}/${mission.duration}秒`;
    const label = mission.kind === "kill" ? "任務エリア" : "防衛エリア";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const labelY = mission.y - mission.zoneRadius - 14;
    ctx.fillStyle = "rgba(9,15,25,.84)";
    ctx.fillRect(mission.x - 58, labelY - 21, 116, 38);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, mission.x, labelY - 9);
    ctx.fillStyle = "#b9d9ff";
    ctx.fillText(progress, mission.x, labelY + 7);
    ctx.restore();
  }

  if (modal) {
    modal.addEventListener("click", event => {
      const actionElement = event.target?.closest?.("[data-mission-action]");
      const action = actionElement?.dataset?.missionAction;
      if (action === "close") {
        event.preventDefault();
        closeModal();
      } else if (action === "accept") {
        event.preventDefault();
        acceptOffer();
      }
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isModalOpen()) {
      event.preventDefault();
      closeModal();
    }
  });

  const hooks = window.EFRHooks || {};
  const previousUpdate = hooks.update;
  const previousDraw = hooks.draw;
  hooks.update = function (dt) {
    if (typeof previousUpdate === "function") previousUpdate.call(this, dt);
    processMission(dt);
  };
  hooks.draw = function () {
    if (typeof previousDraw === "function") previousDraw.apply(this, arguments);
    drawMission();
  };
  window.EFRHooks = hooks;

  window.EFRMissions = {
    getOffer,
    openModal,
    closeModal,
    acceptOffer,
    isModalOpen,
    missionRewardCredits
  };
})();

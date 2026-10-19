/* EFR field missions: transient raid objectives integrated through existing runtime hooks. */
(() => {
  "use strict";

  const G = () => window.EFRGame;
  const modal = document.getElementById("efrMissionModal");
  let observedWorld = null;
  let raidState = null;
  let selectedOfferId = null;

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


  function findOfferPoint(game, existingOffers = [], random = Math.random) {
    const world = game?.world;
    const player = game?.player;
    if (!world || !player) return null;

    const width = Number(world.walls?.[0]?.w || 1920);
    const height = Number(world.walls?.[2]?.h || 1080);
    const buildings = Array.isArray(world.buildings) ? world.buildings : [];

    const isOpen = (x, y, margin = 38) => {
      if (x < 18 + margin || x > width - 18 - margin) return false;
      if (y < 18 + margin || y > height - 18 - margin) return false;

      if (buildings.some(building =>
        x >= building.x - margin &&
        x <= building.x + building.w + margin &&
        y >= building.y - margin &&
        y <= building.y + building.h + margin
      )) return false;

      if ((Array.isArray(world.trees) ? world.trees : []).some(tree =>
        !tree.cut &&
        Math.hypot(x - Number(tree.x), y - Number(tree.y)) <
          Math.max(0, Number(tree.r) || 0) + 24
      )) return false;

      return existingOffers.every(offer =>
        Math.hypot(x - offer.x, y - offer.y) >= 350
      );
    };

    const candidates = [];
    for (let dx = -340; dx <= 340; dx += 20) {
      for (let dy = -320; dy <= 320; dy += 20) {
        const distance = Math.hypot(dx, dy);
        if (distance < 100 || distance > 360) continue;

        const x = player.x + dx;
        const y = player.y + dy;
        if (isOpen(x, y)) candidates.push({ x, y });
      }
    }

    if (candidates.length) {
      return candidates[Math.floor(random() * candidates.length)];
    }

    let fallback = null;
    let fallbackDistance = Infinity;

    for (let y = 55; y < height - 55; y += 28) {
      for (let x = 55; x < width - 55; x += 28) {
        if (!isOpen(x, y, 30)) continue;

        const distance = Math.hypot(x - player.x, y - player.y);
        if (distance >= 100 && distance < fallbackDistance) {
          fallback = { x, y };
          fallbackDistance = distance;
        }
      }
    }

    return fallback;
  }

  function findExtractionPoint(game, offer) {
    const world = game?.world;
    const player = game?.player;
    if (!world || !player) return null;

    const width = Number(world.walls?.[0]?.w || 1920);
    const height = Number(world.walls?.[2]?.h || 1080);
    const buildings = Array.isArray(world.buildings) ? world.buildings : [];
    const random = randomFromSeed((Number(world.seed) >>> 0) ^ 0x6d2b79f5);
    const start = { x: Number(player.x) || 60, y: Number(player.y) || 270 };
    const fixedExit = { x: width - 70 + 17.5, y: height / 2 };

    const isOpen = (x, y, margin = 52) => {
      if (x < 18 + margin || x > width - 18 - margin) return false;
      if (y < 18 + margin || y > height - 18 - margin) return false;
      return !buildings.some(building =>
        x >= building.x - margin &&
        x <= building.x + building.w + margin &&
        y >= building.y - margin &&
        y <= building.y + building.h + margin
      );
    };

    const preferred = [];
    const fallback = [];

    for (let y = 72; y < height - 72; y += 24) {
      for (let x = 72; x < width - 72; x += 24) {
        if (!isOpen(x, y)) continue;

        const fromStart = Math.hypot(x - start.x, y - start.y);
        const fromFixedExit = Math.hypot(x - fixedExit.x, y - fixedExit.y);
        const fromOffer = Array.isArray(offer)
          ? (offer.length
              ? Math.min(...offer.map(anchor =>
                  Math.hypot(x - anchor.x, y - anchor.y)))
              : Infinity)
          : offer
            ? Math.hypot(x - offer.x, y - offer.y)
            : Infinity;
        const point = { x, y };

        if (fromStart >= 190 && fromFixedExit >= 130) {
          fallback.push(point);
        }
        if (
          fromStart >= 280 &&
          fromFixedExit >= 190 &&
          fromOffer >= 170
        ) {
          preferred.push(point);
        }
      }
    }

    const candidates = preferred.length ? preferred : fallback;
    if (!candidates.length) return null;
    return candidates[Math.floor(random() * candidates.length)];
  }


  function ensureWorldState() {
    const game = G();
    if (!game?.running || !game.world) return null;
    if (observedWorld === game.world && raidState) return raidState;

    observedWorld = game.world;
    const random = randomFromSeed(game.world.seed);
    const desiredCount = 2 + Math.floor(random() * 2);
    const offers = [];

    const enemyRadius = Math.max(
      1,
      Number(game.enemies?.find(enemy => Number(enemy.r) > 0)?.r || 15)
    );

    for (let index = 0; index < Math.min(3, desiredCount); index++) {
      const position = findOfferPoint(game, offers, random);
      if (!position) break;

      const kind = random() < 0.5 ? "kill" : "defend";
      offers.push({
        id: "mission-" + (index + 1),
        x: position.x,
        y: position.y,
        kind,
        targetCount: 3,
        duration: 60,
        zoneRadius: kind === "defend" ? enemyRadius * 2 : 150,
        reward: missionRewardCredits()
      });
    }

    const extraction = findExtractionPoint(game, offers);
    const feeRandom = randomFromSeed(
      (Number(game.world.seed) >>> 0) ^ 0x31a52d7b
    );

    raidState = {
      world: game.world,
      offers,
      activeMissions: [],
      countedKillEnemies: new WeakSet(),
      extraction,
      extractionCost: 40 + Math.floor(feeRandom() * 21),
      pendingCredits: 0,
      extractionSpent: 0,
      settled: false
    };

    return raidState;
  }


  function getOffer() {
    return ensureWorldState()?.offers?.[0] || null;
  }

  function getOffers() {
    return ensureWorldState()?.offers || [];
  }

  function getExtractionPoint() {
    const state = ensureWorldState();
    if (!state?.extraction) return null;
    return {
      x: state.extraction.x,
      y: state.extraction.y,
      fee: state.extractionCost
    };
  }

  function getRaidCredits() {
    const state = ensureWorldState();
    return Math.max(0, Math.floor(Number(state?.pendingCredits) || 0));
  }

  function settleRaidCredits(success) {
    const game = G();
    let state = raidState;

    if ((!state || state.world !== game?.world) && game?.running) {
      state = ensureWorldState();
    }
    if (!state || state.world !== game?.world || state.settled) {
      return { banked: 0, forfeited: 0, spent: 0, failedToBank: false };
    }

    state.settled = true;
    const pending = Math.max(0, Math.floor(Number(state.pendingCredits) || 0));
    const spent = Math.max(0, Math.floor(Number(state.extractionSpent) || 0));
    let banked = 0;
    let forfeited = 0;
    let failedToBank = false;

    if (success && pending > 0) {
      if (window.EFRBaseCore?.addCurrency?.(pending) === true) {
        banked = pending;
      } else {
        failedToBank = true;
        game?.logMessage?.("仮クレジットを拠点通貨へ確定できませんでした。");
      }
    } else if (!success) {
      forfeited = pending;
    }

    state.pendingCredits = 0;
    state.extractionSpent = 0;
    return { banked, forfeited, spent, failedToBank };
  }

  function extractAtPoint() {
    const game = G();
    const state = ensureWorldState();
    const point = state?.extraction;

    if (!game?.running || !state || !point || state.settled) return false;

    const player = game.player;
    if (
      !player ||
      Math.hypot(player.x - point.x, player.y - point.y) > 55
    ) return false;

    const fee = state.extractionCost;
    const current = Math.max(0, Math.floor(Number(state.pendingCredits) || 0));

    if (current < fee) {
      game.logMessage?.(
        `仮クレジットが不足しています（必要 ${fee}、現在 ${current}）。任務を達成すると獲得できます。`
      );
      return false;
    }

    state.pendingCredits = current - fee;
    state.extractionSpent = fee;
    game.finish?.(
      true,
      `有料脱出地点から脱出しました。脱出費用として仮クレジット${fee}を消費しました。`
    );
    return true;
  }

  function isModalOpen() {
    return !!modal && !modal.classList.contains("hidden");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? "");
  }


  function openModal(offerId = null) {
    const state = ensureWorldState();
    if (!state?.offers?.length || !modal || !G()?.running) return false;

    const player = G()?.player;
    const offer = state.offers.find(entry => entry.id === String(offerId || "")) ||
      [...state.offers].sort((a, b) =>
        Math.hypot(player.x - a.x, player.y - a.y) -
        Math.hypot(player.x - b.x, player.y - b.y)
      )[0];

    if (!offer) return false;

    selectedOfferId = offer.id;
    setText("efrMissionTitle", missionTitle(offer));
    setText("efrMissionDescription", missionDescription(offer));
    setText(
      "efrMissionReward",
      `${Number(offer.reward || missionRewardCredits()).toLocaleString("ja-JP")} クレジット`
    );
    setText(
      "efrMissionNote",
      "報酬は達成ごとに仮クレジットへ加算されます。脱出成功時に残額が拠点通貨へ加算され、探索失敗では失われます。"
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
    selectedOfferId = null;
    G()?.refreshInteraction?.();
  }


  function acceptOffer(offerId = selectedOfferId) {
    const game = G();
    const state = ensureWorldState();
    if (!game?.running || !state || state.settled) return false;

    const offer = state.offers.find(
      entry => entry.id === String(offerId || "")
    );
    if (!offer) return false;

    const deadState = new Map();
    for (const enemy of game.enemies || []) {
      deadState.set(enemy, !!enemy.dead);
    }

    state.activeMissions.push({
      id: offer.id,
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
      reward: offer.reward
    });

    state.offers = state.offers.filter(entry => entry.id !== offer.id);
    closeModal();
    game.logMessage?.(`任務を受注しました：${missionTitle(offer)}`);
    game.refreshInteraction?.();
    return true;
  }


  function finishMission(mission, success, reason = "") {
    const game = G();
    const state = raidState;
    if (!game || !state || !mission) return;

    const index = state.activeMissions.indexOf(mission);
    if (index < 0) return;
    state.activeMissions.splice(index, 1);

    if (success) {
      state.pendingCredits = Math.max(
        0,
        Math.floor(Number(state.pendingCredits) || 0)
      ) + Math.max(0, Math.floor(Number(mission.reward) || 0));

      game.logMessage?.(
        `任務達成：${missionTitle(mission)}（+${mission.reward.toLocaleString("ja-JP")} 仮クレジット／脱出時に確定）`
      );
    } else {
      game.logMessage?.(
        `任務失敗：${reason || "条件を達成できませんでした"}。探索は続行できます。`
      );
    }

    game.refreshInteraction?.();
  }

  function processMission(dt) {
    const game = G();
    const state = ensureWorldState();
    if (!game?.running || !state || isModalOpen()) return;

    const frameTime = Math.max(0, Math.min(0.1, Number(dt) || 0));

    for (const mission of [...state.activeMissions]) {
      if (mission.kind === "kill") {
        for (const enemy of game.enemies || []) {
          let diedSinceAcceptance = false;

          if (!mission.deadState.has(enemy)) {
            const isDead = !!enemy.dead;
            mission.deadState.set(enemy, isDead);
            diedSinceAcceptance = isDead;
          } else {
            const wasDead = mission.deadState.get(enemy);
            const isDead = !!enemy.dead;
            mission.deadState.set(enemy, isDead);
            diedSinceAcceptance = !wasDead && isDead;
          }

          if (!diedSinceAcceptance) continue;

          if (
            Math.hypot(enemy.x - mission.x, enemy.y - mission.y) <= mission.zoneRadius &&
            !state.countedKillEnemies.has(enemy)
          ) {
            state.countedKillEnemies.add(enemy);
            mission.killCount += 1;
          }
        }

        if (mission.killCount >= mission.targetCount) {
          finishMission(mission, true);
        }
        continue;
      }

      let failed = false;
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
          finishMission(
            mission,
            false,
            "敵1体が防衛エリアと10秒間連続で重なりました"
          );
          failed = true;
          break;
        }
      }

      if (failed || !state.activeMissions.includes(mission)) continue;

      mission.elapsed = Math.min(mission.duration, mission.elapsed + frameTime);
      if (mission.elapsed >= mission.duration) finishMission(mission, true);
    }
  }

  function drawExtractionPoint(ctx, state) {
    const point = state?.extraction;
    if (!point) return;

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.save();
    ctx.shadowColor = "rgba(255,176,72,.72)";
    ctx.shadowBlur = 8 + 8 * pulse;
    ctx.fillStyle = "#65431f";
    ctx.beginPath();
    ctx.roundRect(point.x - 21, point.y - 21, 42, 42, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffd18b";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff4dc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("EVAC", point.x, point.y - 2);
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#ffe0a6";
    ctx.fillText(String(state.extractionCost) + " C", point.x, point.y + 10);
    ctx.restore();
  }


  function drawMission() {
    const game = G();
    const state = ensureWorldState();
    if (!game?.running || !state) return;

    const ctx = game.ctx;
    if (!ctx) return;

    const creditsElement = document.getElementById("efrRaidCredits");
    if (creditsElement) {
      creditsElement.textContent = String(
        Math.max(0, Math.floor(Number(state.pendingCredits) || 0))
      );
    }

    drawExtractionPoint(ctx, state);

    for (const offer of state.offers) {
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
    }

    for (const mission of state.activeMissions) {
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
    getOffers,
    getExtractionPoint,
    getRaidCredits,
    settleRaidCredits,
    extractAtPoint,
    openModal,
    closeModal,
    acceptOffer,
    isModalOpen,
    missionRewardCredits
  };
})();

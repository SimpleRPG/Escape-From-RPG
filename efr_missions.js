/* EFR field missions: transient raid objectives integrated through existing runtime hooks. */
(() => {
  "use strict";

  const G = () => window.EFRGame;
  const modal = document.getElementById("efrMissionModal");
  let observedWorld = null;
  let raidState = null;
  let selectedOfferId = null;

  // 条件つき脱出地点（2026-11-22）：野外の開けた場所に3つ、条件は1つずつ。
  const COND_EXIT_KINDS = ["light", "night", "signal"];
  const LIGHT_EXIT_MAX_WEIGHT = 15;
  const SIGNAL_DEFENSE_SECONDS = 60;
  const SIGNAL_ZONE_RADIUS = 170;
  const COND_EXIT_STYLE = {
    light: { label: "軽装", bg: "#1d3a54", edge: "#8ec9ff", hint: "rgba(142,201,255,.9)" },
    night: { label: "夜間", bg: "#33254d", edge: "#c9a6ff", hint: "rgba(201,166,255,.9)" },
    signal: { label: "合図", bg: "#54301d", edge: "#ffb08a", hint: "rgba(255,176,138,.9)" }
  };

  function missionTitle(mission) {
    if (!mission) return "探索中ミッション";
    if (mission.kind === "kill") return `指定エリア内の敵を${mission.targetCount}体倒せ`;
    if (mission.kind === "collect") return `アイテムを${mission.targetCount}個集めよ`;
    if (mission.kind === "reach") return `指定エリアへ到達せよ`;
    return `指定エリアを${mission.duration}秒守れ`;
  }

  function missionDescription(mission) {
    if (mission?.kind === "kill") {
      return `受注すると、この場所とは別の開けた場所に青い任務エリアが現れ、敵が集まります。エリア内で敵を${mission.targetCount}体倒してください。敵が倒れた位置がエリア外の場合、進捗には含まれません。`;
    }
    if (mission?.kind === "collect") {
      return `探索でアイテムを${mission.targetCount}個集めてください。拾ったアイテムの合計が進捗になります。`;
    }
    if (mission?.kind === "reach") {
      return `青い任務エリアまで移動してください。エリアに入ると任務完了です。`;
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
        Math.hypot(x - offer.x, y - offer.y) >= 500
      );
    };

    // マップ全域の開けた場所から引く。開始地点の周りに固まらないよう、
    // 開始地点から300以上離れた場所だけを候補にする。
    const start = world.start
      ? {
          x: Number(world.start.x) || player.x,
          y: Number(world.start.y) || player.y
        }
      : { x: player.x, y: player.y };

    for (let attempt = 0; attempt < 240; attempt++) {
      const x = 56 + random() * (width - 112);
      const y = 56 + random() * (height - 112);
      if (Math.hypot(x - start.x, y - start.y) < 300) continue;
      if (isOpen(x, y)) return { x, y };
    }

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
    // 有料脱出地点は辺とは関係なく、建物外のどこかに出る。出現位置の
    // すぐそば（100px以内）には出ない。開始地点はワールドに記録された
    // 今回の出現位置を使う（なければプレイヤーの現在位置）。
    const start = game.world?.start
      ? { x: Number(game.world.start.x) || 60, y: Number(game.world.start.y) || 270 }
      : { x: Number(player.x) || 60, y: Number(player.y) || 270 };

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
        const fromOffer = Array.isArray(offer)
          ? (offer.length
              ? Math.min(...offer.map(anchor =>
                  Math.hypot(x - anchor.x, y - anchor.y)))
              : Infinity)
          : offer
            ? Math.hypot(x - offer.x, y - offer.y)
            : Infinity;
        const point = { x, y };

        if (fromStart >= 100) {
          fallback.push(point);
        }
        if (fromStart >= 280 && fromOffer >= 170) {
          preferred.push(point);
        }
      }
    }

    const candidates = preferred.length ? preferred : fallback;
    if (!candidates.length) return null;
    return candidates[Math.floor(random() * candidates.length)];
  }


  function findConditionalExitPoints(game, offers, extraction) {
    const world = game?.world;
    if (!world) return [];
    const width = Number(world.walls?.[0]?.w || 1920);
    const height = Number(world.walls?.[2]?.h || 1080);
    const buildings = Array.isArray(world.buildings) ? world.buildings : [];
    const random = randomFromSeed(
      (Number(world.seed) >>> 0) ^ 0x51ab3c9d
    );
    const start = world.start
      ? { x: Number(world.start.x) || 60, y: Number(world.start.y) || 270 }
      : { x: Number(game.player?.x) || 60, y: Number(game.player?.y) || 270 };

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

    const points = [];
    for (const kind of COND_EXIT_KINDS) {
      let best = null;
      for (let attempt = 0; attempt < 800 && !best; attempt++) {
        const relax = attempt >= 400 ? 0.5 : 1;
        const x = 70 + random() * (width - 140);
        const y = 70 + random() * (height - 140);
        if (!isOpen(x, y)) continue;
        if (Math.hypot(x - start.x, y - start.y) < 480 * relax + 200) continue;
        if (points.some(p => Math.hypot(x - p.x, y - p.y) < 550 * relax)) continue;
        if (extraction && Math.hypot(x - extraction.x, y - extraction.y) < 380 * relax) continue;
        if ((offers || []).some(o => Math.hypot(x - o.x, y - o.y) < 200)) continue;
        best = { x, y };
      }
      if (best) {
        points.push({
          id: "cond-" + kind,
          kind,
          x: best.x,
          y: best.y,
          phase: "idle",
          elapsed: 0
        });
      }
    }
    return points;
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

      const kind = ["kill", "defend", "collect", "reach"][Math.floor(random() * 4)];
      offers.push({
        id: "mission-" + (index + 1),
        x: position.x,
        y: position.y,
        kind,
        targetCount: kind === "collect" ? 5 : 3,
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
      conditionalExits: findConditionalExitPoints(game, offers, extraction),
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
    document.getElementById("interactBtn")?.classList.add("hidden");
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


  // キル任務のエリアは、受注した場所とは別の開けた場所に作る。
  // 半径150のエリアが建物に埋もれないよう、広めの余白で探す。
  function findKillTargetPoint(game, from) {
    const world = game?.world;
    if (!world) return null;

    const width = Number(world.walls?.[0]?.w || 1920);
    const height = Number(world.walls?.[2]?.h || 1080);
    const buildings = Array.isArray(world.buildings) ? world.buildings : [];

    const isOpen = (x, y, margin) => {
      if (x < 18 + margin || x > width - 18 - margin) return false;
      if (y < 18 + margin || y > height - 18 - margin) return false;

      return !buildings.some(building =>
        x >= building.x - margin &&
        x <= building.x + building.w + margin &&
        y >= building.y - margin &&
        y <= building.y + building.h + margin
      );
    };

    for (let attempt = 0; attempt < 240; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 450 + Math.random() * 750;
      const x = from.x + Math.cos(angle) * distance;
      const y = from.y + Math.sin(angle) * distance;
      if (isOpen(x, y, 95)) return { x, y };
    }

    for (let attempt = 0; attempt < 240; attempt++) {
      const x = 120 + Math.random() * (width - 240);
      const y = 120 + Math.random() * (height - 240);
      if (Math.hypot(x - from.x, y - from.y) < 300) continue;
      if (isOpen(x, y, 60)) return { x, y };
    }

    return null;
  }

  // キル任務のエリア付近に敵を湧かせ、「敵がいなくて達成できない」を無くす。
  function spawnKillTargetEnemies(game, point, count) {
    if (!Array.isArray(game?.enemies)) return;

    for (let i = 0; i < count; i++) {
      let x = point.x;
      let y = point.y;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 85;
        x = point.x + Math.cos(angle) * distance;
        y = point.y + Math.sin(angle) * distance;
        if (
          typeof game.blocked !== "function" ||
          !game.blocked({ x, y, r: 15 })
        ) break;
      }

      game.enemies.push({
        x,
        y,
        r: 15,
        hp: 55 + Math.floor(Math.random() * 35),
        maxHp: 90,
        speed: 42 + Math.random() * 18,
        buildingId: null,
        visualType: Math.random() > .72 ? "arcane" : "human",
        facingX: 1,
        facingY: 0,
        alerted: false,
        lastSeenX: null,
        lastSeenY: null,
        searchTimer: 0,
        alertX: null,
        alertY: null,
        alertConfidence: 0,
        alertTimer: 0,
        alertRole: null,
        alertSource: null,
        alertShareTimer: 0,
        missionSpawned: true
      });
    }
  }

  function spawnSignalEnemies(game, point) {
    if (!Array.isArray(game?.enemies)) return;

    for (let i = 0; i < 5; i++) {
      let x = point.x;
      let y = point.y;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 230 + Math.random() * 70;
        x = point.x + Math.cos(angle) * distance;
        y = point.y + Math.sin(angle) * distance;
        if (
          typeof game.blocked !== "function" ||
          !game.blocked({ x, y, r: 15 })
        ) break;
      }

      game.enemies.push({
        x,
        y,
        r: 15,
        hp: 55 + Math.floor(Math.random() * 35),
        maxHp: 90,
        speed: 42 + Math.random() * 18,
        buildingId: null,
        visualType: Math.random() > .72 ? "arcane" : "human",
        facingX: 1,
        facingY: 0,
        alerted: true,
        lastSeenX: point.x,
        lastSeenY: point.y,
        searchTimer: 0,
        alertX: point.x,
        alertY: point.y,
        alertConfidence: 1,
        alertTimer: 6,
        alertRole: null,
        alertSource: null,
        alertShareTimer: 0,
        missionSpawned: true
      });
    }
  }

  function getConditionalExits() {
    const state = ensureWorldState();
    if (!state?.conditionalExits) return [];
    const game = G();
    return state.conditionalExits.map(point => ({
      id: point.id,
      kind: point.kind,
      x: point.x,
      y: point.y,
      phase: point.phase,
      remaining: point.phase === "defending"
        ? Math.max(0, Math.ceil(SIGNAL_DEFENSE_SECONDS - point.elapsed))
        : 0,
      weightLimit: LIGHT_EXIT_MAX_WEIGHT,
      weight: typeof game?.carriedWeight === "function"
        ? game.carriedWeight()
        : null,
      isNight: typeof game?.raidIsNight === "function"
        ? !!game.raidIsNight()
        : false
    }));
  }

  function interactConditionalExit(id) {
    const game = G();
    const state = ensureWorldState();
    const point = state?.conditionalExits?.find(
      entry => entry.id === String(id || "")
    );

    if (!game?.running || !state || !point || state.settled) return false;

    const player = game.player;
    if (
      !player ||
      Math.hypot(player.x - point.x, player.y - point.y) > 55
    ) return false;

    if (point.kind === "light") {
      const weight = typeof game.carriedWeight === "function"
        ? game.carriedWeight()
        : 0;
      if (weight > LIGHT_EXIT_MAX_WEIGHT) {
        game.logMessage?.(
          `重すぎてこの脱出地点は使えません（現在 ${weight.toFixed(1)}kg / 上限 ${LIGHT_EXIT_MAX_WEIGHT}kg）。`
        );
        return false;
      }
      game.finish?.(
        true,
        `軽装専用の脱出地点から脱出しました（総重量 ${weight.toFixed(1)}kg）。`
      );
      return true;
    }

    if (point.kind === "night") {
      if (typeof game.raidIsNight !== "function" || !game.raidIsNight()) {
        game.logMessage?.("この脱出地点は夜間のみ使えます。");
        return false;
      }
      game.finish?.(true, "夜間専用の脱出地点から脱出しました。");
      return true;
    }

    // signal
    if (point.phase === "ready") {
      game.finish?.(true, "合図に応えた迎えで脱出しました。");
      return true;
    }
    if (point.phase === "defending") {
      game.logMessage?.(
        `迎えはまだ来ていません（あと約${Math.max(0, Math.ceil(SIGNAL_DEFENSE_SECONDS - point.elapsed))}秒）。`
      );
      return false;
    }
    point.phase = "defending";
    point.elapsed = 0;
    spawnSignalEnemies(game, point);
    game.logMessage?.(
      `合図を上げました。${SIGNAL_DEFENSE_SECONDS}秒間、この場所の近くで迎えを待ってください。`
    );
    game.refreshInteraction?.();
    return true;
  }

  function processConditionalExits(dt) {
    const game = G();
    const state = raidState;
    if (!game?.running || !state?.conditionalExits) return;
    const player = game.player;
    if (!player) return;

    for (const point of state.conditionalExits) {
      if (point.kind !== "signal" || point.phase !== "defending") continue;
      const inside = Math.hypot(player.x - point.x, player.y - point.y) <=
        SIGNAL_ZONE_RADIUS;
      if (!inside) continue;
      point.elapsed = Math.min(
        SIGNAL_DEFENSE_SECONDS,
        point.elapsed + dt
      );
      if (point.elapsed >= SIGNAL_DEFENSE_SECONDS) {
        point.phase = "ready";
        game.logMessage?.(
          "迎えが到着しました。合図の脱出地点から脱出できます。"
        );
        game.refreshInteraction?.();
      }
    }
  }

  function acceptOffer(offerId = selectedOfferId) {
    const game = G();
    const state = ensureWorldState();
    if (!game?.running || !state || state.settled) return false;

    const offer = state.offers.find(
      entry => entry.id === String(offerId || "")
    );
    if (!offer) return false;

    // キル任務は受注地点と別の場所にエリアを作り、そこへ敵を湧かせる。
    let missionX = offer.x;
    let missionY = offer.y;

    if (offer.kind === "kill") {
      const target = findKillTargetPoint(game, offer);
      if (target) {
        missionX = target.x;
        missionY = target.y;
        spawnKillTargetEnemies(
          game,
          target,
          (Number(offer.targetCount) || 3) + 1
        );
      }
    }

    const deadState = new Map();
    for (const enemy of game.enemies || []) {
      deadState.set(enemy, !!enemy.dead);
    }

    state.activeMissions.push({
      id: offer.id,
      kind: offer.kind,
      x: missionX,
      y: missionY,
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
      if (mission.kind === "collect") {
        const total = (game.player?.loot || []).reduce(
          (sum, item) => sum + Math.max(1, Math.floor(Number(item?.amount) || 1)),
          0
        );
        if (mission.collectBaseline == null) mission.collectBaseline = total;
        mission.collectCount = Math.max(
          mission.collectCount || 0,
          total - mission.collectBaseline
        );
        if (mission.collectCount >= mission.targetCount) {
          finishMission(mission, true);
        }
        continue;
      }

      if (mission.kind === "reach") {
        const player = game.player;
        if (
          player &&
          Math.hypot(player.x - mission.x, player.y - mission.y) <= mission.zoneRadius
        ) {
          finishMission(mission, true);
        }
        continue;
      }

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

    processConditionalExits(frameTime);
  }

  function condExitStatusText(point, game) {
    if (point.kind === "light") return LIGHT_EXIT_MAX_WEIGHT + "kg以下";
    if (point.kind === "night") {
      return typeof game?.raidIsNight === "function" && game.raidIsNight()
        ? "使用可能"
        : "夜間のみ";
    }
    if (point.phase === "ready") return "脱出可能";
    if (point.phase === "defending") {
      return "あと" + Math.max(
        0, Math.ceil(SIGNAL_DEFENSE_SECONDS - point.elapsed)
      ) + "秒";
    }
    return "合図が必要";
  }

  function drawConditionalExits(ctx, state, game) {
    for (const point of state.conditionalExits || []) {
      const style = COND_EXIT_STYLE[point.kind];
      if (!style) continue;

      if (point.kind === "signal" && point.phase === "defending") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, SIGNAL_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,140,80,.07)";
        ctx.fill();
        ctx.strokeStyle = style.hint;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
      ctx.save();
      /* グローは拡大した半透明の下敷きで近似する（shadowBlur は
         モバイルGPUで高コストなため毎フレーム描画では使わない）。 */
      ctx.globalAlpha = 0.10 + 0.08 * pulse;
      ctx.fillStyle = style.hint;
      ctx.beginPath();
      ctx.roundRect(point.x - 26, point.y - 26, 52, 52, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = style.bg;
      ctx.beginPath();
      ctx.roundRect(point.x - 21, point.y - 21, 42, 42, 7);
      ctx.fill();
      ctx.strokeStyle = style.edge;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff4dc";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(style.label, point.x, point.y - 3);
      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = style.edge;
      ctx.fillText(condExitStatusText(point, game), point.x, point.y + 10);
      ctx.restore();
    }
  }

  function drawExtractionPoint(ctx, state) {
    const point = state?.extraction;
    if (!point) return;

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.save();
    /* グローは拡大した半透明の下敷きで近似する（shadowBlur不使用）。 */
    ctx.fillStyle = `rgba(255,176,72,${0.10 + 0.08 * pulse})`;
    ctx.beginPath();
    ctx.roundRect(point.x - 26, point.y - 26, 52, 52, 10);
    ctx.fill();
    ctx.fillStyle = "#65431f";
    ctx.beginPath();
    ctx.roundRect(point.x - 21, point.y - 21, 42, 42, 7);
    ctx.fill();
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
    drawConditionalExits(ctx, state, game);

    for (const offer of state.offers) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
      ctx.save();
      /* グローは拡大した半透明の円の下敷きで近似する（shadowBlur不使用）。 */
      ctx.fillStyle = `rgba(39,121,231,${0.14 + 0.10 * pulse})`;
      ctx.beginPath();
      ctx.arc(offer.x, offer.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2879e7";
      ctx.beginPath();
      ctx.arc(offer.x, offer.y, 16, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.arc(mission.x, mission.y, Math.max(0, mission.zoneRadius), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(40,121,231,.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(111,177,255,.95)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      const progress = mission.kind === "kill"
        ? `撃破 ${mission.killCount}/${mission.targetCount}`
        : mission.kind === "collect"
          ? `収集 ${mission.collectCount || 0}/${mission.targetCount}`
          : mission.kind === "reach"
            ? "到達で完了"
            : `防衛 ${Math.floor(mission.elapsed)}/${mission.duration}秒`;
      const label = mission.kind === "defend" ? "防衛エリア" : "任務エリア";

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

  // 途中再開用：進行中ミッションと仮クレジットを plain data で出し入れする。
  // countedKillEnemies は WeakSet で列挙できないが、数え直しの防止は
  // 各ミッションの deadState（死亡状態の記録）が担うため、空で戻してよい。
  function snapshotRaidState() {
    const game = G();
    if (!raidState || !game) return null;

    const enemyIndex = enemy => (game.enemies || []).indexOf(enemy);

    return {
      offers: JSON.parse(JSON.stringify(raidState.offers || [])),
      extraction: raidState.extraction
        ? JSON.parse(JSON.stringify(raidState.extraction))
        : null,
      extractionCost: raidState.extractionCost,
      conditionalExits: JSON.parse(
        JSON.stringify(raidState.conditionalExits || [])
      ),
      activeMissions: (raidState.activeMissions || []).map(mission => ({
        id: mission.id,
        kind: mission.kind,
        x: mission.x,
        y: mission.y,
        targetCount: mission.targetCount,
        duration: mission.duration,
        zoneRadius: mission.zoneRadius,
        elapsed: mission.elapsed,
        killCount: mission.killCount,
        reward: mission.reward,
        deadStateIdx: [...(mission.deadState || new Map())]
          .map(([enemy, dead]) => [enemyIndex(enemy), !!dead])
          .filter(([index]) => index >= 0)
      })),
      pendingCredits: raidState.pendingCredits,
      extractionSpent: raidState.extractionSpent,
      settled: !!raidState.settled
    };
  }

  function restoreRaidState(data) {
    const game = G();
    if (!data || !game?.running || !game.world) return false;

    const state = ensureWorldState();
    if (!state) return false;

    if (Array.isArray(data.offers)) {
      state.offers = JSON.parse(JSON.stringify(data.offers));
    }
    if (data.extraction) {
      state.extraction = JSON.parse(JSON.stringify(data.extraction));
    }
    if (Number.isFinite(data.extractionCost)) {
      state.extractionCost = data.extractionCost;
    }
    if (Array.isArray(data.conditionalExits)) {
      state.conditionalExits = JSON.parse(
        JSON.stringify(data.conditionalExits)
      );
    }
    state.activeMissions = (data.activeMissions || []).map(mission => ({
      id: mission.id,
      kind: mission.kind,
      x: mission.x,
      y: mission.y,
      targetCount: mission.targetCount,
      duration: mission.duration,
      zoneRadius: mission.zoneRadius,
      elapsed: Number(mission.elapsed) || 0,
      killCount: Number(mission.killCount) || 0,
      reward: mission.reward,
      deadState: new Map(
        (mission.deadStateIdx || [])
          .map(([index, dead]) => [game.enemies?.[index], !!dead])
          .filter(([enemy]) => !!enemy)
      ),
      overlapTimers: new Map()
    }));
    state.countedKillEnemies = new WeakSet();
    state.pendingCredits = Math.max(
      0,
      Math.floor(Number(data.pendingCredits) || 0)
    );
    state.extractionSpent = Math.max(
      0,
      Math.floor(Number(data.extractionSpent) || 0)
    );
    state.settled = !!data.settled;
    return true;
  }

  window.EFRMissions = {
    getOffer,
    getOffers,
    getExtractionPoint,
    getConditionalExits,
    interactConditionalExit,
    getRaidCredits,
    settleRaidCredits,
    extractAtPoint,
    openModal,
    closeModal,
    acceptOffer,
    isModalOpen,
    missionRewardCredits,
    snapshotRaidState,
    restoreRaidState
  };
})();

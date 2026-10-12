/* EFR contamination zones: expedition-only environmental hazards and biological mutations. */
(() => {
  "use strict";

  const getGame = () => window.EFRGame;
  const ZONE_TYPES = Object.freeze([
    {
      type: "toxic",
      label: "毒性汚染",
      radius: 138,
      fill: "rgba(106,205,75,0.17)",
      stroke: "#9fe879",
      text: "#dcffc7"
    },
    {
      type: "energy",
      label: "エネルギー汚染",
      radius: 145,
      fill: "rgba(66,163,255,0.17)",
      stroke: "#8bd4ff",
      text: "#d6f2ff"
    },
    {
      type: "biological",
      label: "生物汚染",
      radius: 150,
      fill: "rgba(177,89,221,0.17)",
      stroke: "#e4a2ff",
      text: "#f5d9ff"
    }
  ]);

  let observedWorld = null;
  let runtimeState = null;

  function randomFromSeed(value) {
    let seed = (Number(value) >>> 0) || 1;
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function findZonePosition(zone, zones, reserved, buildings, random, width, height) {
    const minX = zone.radius + 30;
    const maxX = width - zone.radius - 30;
    const minY = zone.radius + 30;
    const maxY = height - zone.radius - 30;
    if (maxX <= minX || maxY <= minY) return null;

    const candidates = [];
    for (let y = minY; y <= maxY; y += 52) {
      for (let x = minX; x <= maxX; x += 52) {
        candidates.push({
          x: Math.max(minX, Math.min(maxX, x + (random() - 0.5) * 26)),
          y: Math.max(minY, Math.min(maxY, y + (random() - 0.5) * 26))
        });
      }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const valid = (point, relaxMissionAnchors, relaxZoneSpacing) => {
      for (const building of buildings) {
        const closestX = Math.max(building.x, Math.min(point.x, building.x + building.w));
        const closestY = Math.max(building.y, Math.min(point.y, building.y + building.h));
        if (Math.hypot(point.x - closestX, point.y - closestY) < zone.radius + 24) {
          return false;
        }
      }

      for (const anchor of reserved) {
        if (
          relaxMissionAnchors &&
          (anchor.kind === "mission" || anchor.kind === "paidExit")
        ) {
          continue;
        }
        if (Math.hypot(point.x - anchor.x, point.y - anchor.y) < anchor.distance) {
          return false;
        }
      }

      if (!relaxZoneSpacing) {
        for (const other of zones) {
          if (
            Math.hypot(point.x - other.x, point.y - other.y) <
            zone.radius + other.radius + 90
          ) {
            return false;
          }
        }
      }
      return true;
    };

    for (const point of candidates) {
      if (valid(point, false, false)) return point;
    }
    for (const point of candidates) {
      if (valid(point, true, false)) return point;
    }
    for (const point of candidates) {
      if (valid(point, true, true)) return point;
    }
    return null;
  }

  function placeZones(game, random, offer, extraction) {
    const walls = Array.isArray(game?.world?.walls) ? game.world.walls : [];
    const width = Number(walls[0]?.w) || 0;
    const height = Number(walls[2]?.h) || 0;
    if (!(width > 0 && height > 0)) return [];

    const buildings = Array.isArray(game.world.buildings) ? game.world.buildings : [];
    const reserved = [
      { x: 60, y: 270, distance: 350, kind: "start" },
      { x: width - 52.5, y: height / 2, distance: 290, kind: "fixedExit" }
    ];
    if (offer && Number.isFinite(Number(offer.x)) && Number.isFinite(Number(offer.y))) {
      reserved.push({
        x: Number(offer.x),
        y: Number(offer.y),
        distance: 250,
        kind: "mission"
      });
    }
    if (
      extraction &&
      Number.isFinite(Number(extraction.x)) &&
      Number.isFinite(Number(extraction.y))
    ) {
      reserved.push({
        x: Number(extraction.x),
        y: Number(extraction.y),
        distance: 260,
        kind: "paidExit"
      });
    }

    const zones = [];
    for (const definition of ZONE_TYPES) {
      const position = findZonePosition(
        definition,
        zones,
        reserved,
        buildings,
        random,
        width,
        height
      );
      if (!position) return [];
      zones.push({ ...definition, x: position.x, y: position.y });
    }
    return zones;
  }

  function ensureState() {
    const game = getGame();
    if (!game?.running || !game.world) return null;
    if (observedWorld === game.world && runtimeState) return runtimeState;

    observedWorld = game.world;
    const seed = ((Number(game.world.seed) >>> 0) ^ 0x4f1bbcdc) >>> 0;
    const random = randomFromSeed(seed);
    const offer = window.EFRMissions?.getOffer?.() || null;
    const extraction = window.EFRMissions?.getExtractionPoint?.() || null;
    const zones = placeZones(game, random, offer, extraction);
    if (zones.length !== ZONE_TYPES.length) {
      runtimeState = null;
      return null;
    }

    runtimeState = {
      world: game.world,
      zones,
      playerZone: null,
      toxicTimer: 0,
      biologicalEnemySpawned: false,
      biologicalMutationAnnounced: false
    };
    return runtimeState;
  }

  function mutateEnemy(enemy, game) {
    if (!enemy || enemy.dead || enemy.efrContaminationMutant) return false;
    const oldHp = Math.max(1, Number(enemy.hp) || 1);
    const oldMaxHp = Math.max(oldHp, Number(enemy.maxHp) || oldHp);
    enemy.maxHp = Math.max(1, Math.ceil(oldMaxHp * 1.35));
    enemy.hp = Math.min(enemy.maxHp, Math.max(1, Math.ceil(oldHp * 1.35)));
    enemy.speed = Math.max(1, Number(enemy.speed) || 45) * 1.15;
    enemy.visualType = "arcane";
    enemy.efrContaminationMutant = true;
    enemy.efrContaminationType = "biological";

    const state = runtimeState;
    if (state && !state.biologicalMutationAnnounced) {
      state.biologicalMutationAnnounced = true;
      game.logMessage?.("生物汚染で敵が変異しました。耐久力と移動速度が上昇しています。");
    }
    return true;
  }

  function spawnBiologicalMutant(game, state, zone) {
    if (state.biologicalEnemySpawned || !zone) return false;
    const enemies = game.enemies;
    const template = Array.isArray(enemies)
      ? enemies.find(enemy => enemy && !enemy.dead && !enemy.efrContaminationMutant)
      : null;
    if (!template) return false;

    const baseMaxHp = Math.max(1, Number(template.maxHp) || Number(template.hp) || 90);
    const maxHp = Math.ceil(baseMaxHp * 1.35);
    const mutant = {
      ...template,
      x: zone.x,
      y: zone.y,
      r: Math.max(12, Number(template.r) || 15),
      hp: maxHp,
      maxHp,
      speed: Math.max(1, Number(template.speed) || 48) * 1.15,
      buildingId: null,
      visualType: "arcane",
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
      aiming: false,
      aimTimer: 0,
      aimTargetX: null,
      aimTargetY: null,
      dead: false,
      loot: null,
      revealedLootCount: 0,
      efrContaminationMutant: true,
      efrContaminationType: "biological"
    };
    enemies.push(mutant);
    state.biologicalEnemySpawned = true;
    game.logMessage?.("生物汚染区域に変異個体が出現しました。");
    return true;
  }

  function updateContamination(dt) {
    const game = getGame();
    const state = ensureState();
    if (!game?.running || !state || !game.player) return;

    const player = game.player;
    const frameTime = Math.max(0, Math.min(0.1, Number(dt) || 0));
    const zone = state.zones.find(item =>
      Math.hypot(player.x - item.x, player.y - item.y) <= item.radius
    ) || null;
    const nextType = zone?.type || null;

    if (state.playerZone !== nextType) {
      if (nextType === "toxic") {
        game.logMessage?.("毒性汚染区域：滞在中は1.5秒ごとに4ダメージを受けます。");
      } else if (nextType === "energy") {
        game.logMessage?.("エネルギー汚染区域：滞在中は照準が大きく散開します。");
      } else if (nextType === "biological") {
        game.logMessage?.("生物汚染区域：変異した敵と希少素材に注意してください。");
      } else if (state.playerZone) {
        game.logMessage?.("汚染区域から離れました。");
      }
      state.playerZone = nextType;
    }

    if (zone?.type === "toxic") {
      state.toxicTimer += frameTime;
      while (state.toxicTimer >= 1.5 && Number(player.hp) > 0) {
        state.toxicTimer -= 1.5;
        game.applyDamage?.(player, 4);
      }
    } else {
      state.toxicTimer = 0;
    }

    if (zone?.type === "energy") {
      const aim = window.EFRCombat?.aim;
      if (aim) {
        aim.spreadState = Math.max(0, Number(aim.spreadState) || 0, 0.38);
        aim.accuracy = 1 - Math.min(1, aim.spreadState);
      }
    }

    const biologicalZone = state.zones.find(item => item.type === "biological");
    if (biologicalZone) {
      spawnBiologicalMutant(game, state, biologicalZone);
      for (const enemy of game.enemies || []) {
        if (
          enemy.dead ||
          enemy.efrContaminationMutant ||
          Math.hypot(enemy.x - biologicalZone.x, enemy.y - biologicalZone.y) >
            biologicalZone.radius
        ) {
          continue;
        }
        mutateEnemy(enemy, game);
      }
    }
  }

  function drawGround(ctx) {
    const game = getGame();
    const state = ensureState();
    if (!ctx || !game?.running || !state) return;

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.002);
    for (const zone of state.zones) {
      ctx.save();
      ctx.globalAlpha = 0.80 + pulse * 0.12;
      ctx.fillStyle = zone.fill;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.82 + pulse * 0.15;
      ctx.strokeStyle = zone.stroke;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.96;
      ctx.fillStyle = zone.text;
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(zone.label, zone.x, zone.y);
      ctx.restore();
    }
  }

  function drawMutantEffects() {
    const game = getGame();
    if (!game?.running || !game.ctx) return;
    const ctx = game.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);

    for (const enemy of game.enemies || []) {
      if (!enemy.efrContaminationMutant) continue;
      if (
        !enemy.dead &&
        typeof game.playerCanSeeEnemy === "function" &&
        !game.playerCanSeeEnemy(enemy)
      ) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = enemy.dead ? 0.55 : 0.58 + pulse * 0.22;
      ctx.strokeStyle = "#dca4ff";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(
        enemy.x,
        enemy.y,
        (Number(enemy.r) || 15) + 6 + pulse * 3,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  function decorateCorpse(corpse) {
    if (
      !corpse?.efrContaminationMutant ||
      corpse.efrContaminationBonusGranted ||
      !Array.isArray(corpse.loot)
    ) {
      return false;
    }

    const catalog = window.EFRContentExpansion?.catalog || window.EFRCombat;
    const pool = catalog?.materialLootPool?.() || catalog?.materials || [];
    const rarityOf = name => Number(
      catalog?.materialRarity?.(name) ||
      catalog?.materialRarities?.[name] ||
      0
    );
    const candidates = [...new Set(pool)].filter(name =>
      typeof name === "string" && name.length > 0 && rarityOf(name) >= 3
    );
    if (!candidates.length) return false;

    const name = candidates[Math.floor(Math.random() * candidates.length)];
    corpse.loot.push({
      name,
      kind: "material",
      amount: 1,
      rarity: rarityOf(name),
      value: 0,
      slots: 1,
      gridW: 1,
      gridH: 1,
      weight: 1
    });
    corpse.efrContaminationBonusGranted = true;
    return true;
  }

  const hooks = window.EFRHooks || {};
  const previousUpdate = hooks.update;
  const previousDraw = hooks.draw;

  hooks.update = function (dt) {
    if (typeof previousUpdate === "function") previousUpdate.call(this, dt);
    updateContamination(dt);
  };
  hooks.draw = function () {
    if (typeof previousDraw === "function") previousDraw.apply(this, arguments);
    drawMutantEffects();
  };
  window.EFRHooks = hooks;

  window.EFRContamination = {
    drawGround,
    decorateCorpse
  };
})();
(function () {
  "use strict";

  /*
   * マップのドット絵描画（assets/map/svg、manifest準拠）。
   * 基準：1ドット = 4/3 ワールド単位、タイル16ドット、建物の壁面25ドット。
   * 動物のドット絵（16x16 SVGマスター）と同じ形式のSVGを、
   * ペット描画と同じくImageとして読み込んでキャッシュする。
   * 画像がまだ読み込めていない要素は false を返し、
   * 呼び出し側（game.js）が従来のベクター描画にフォールバックする。
   */

  const DOT = 4 / 3;
  const FACE_DOTS = 25;
  const FACE_H = FACE_DOTS * DOT;
  const BASE = "assets/map/svg/";

  const cache = new Map();

  function img(path) {
    let entry = cache.get(path);
    if (entry) return entry;

    entry = { image: null, ready: false, failed: false };
    cache.set(path, entry);

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      entry.image = image;
      entry.ready = true;
    };
    image.onerror = () => {
      entry.failed = true;
    };
    image.src = path;
    return entry;
  }

  function ready(path) {
    const entry = img(path);
    return entry.ready ? entry.image : null;
  }

  function hash2(a, b, salt = 0) {
    const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }

  function drawImg(ctx, path, x, y, wDots, hDots) {
    const image = ready(path);
    if (!image) return false;

    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, wDots * DOT, hDots * DOT);
    ctx.imageSmoothingEnabled = prev;
    return true;
  }

  // 画像の自然サイズ（=ドット数）で中心合わせ
  function drawImgC(ctx, path, cx, cy) {
    const image = ready(path);
    if (!image) return false;

    const wDots = image.naturalWidth || 16;
    const hDots = image.naturalHeight || 16;
    return drawImg(ctx, path, cx - (wDots * DOT) / 2, cy - (hDots * DOT) / 2, wDots, hDots);
  }

  // 領域をタイルで埋める（ワールド格子に吸着、バリアントは座標ハッシュで決定）
  function tileArea(ctx, variants, x, y, w, h, twDots, thDots, salt) {
    for (const p of variants) if (!ready(p)) return false;

    const tw = twDots * DOT;
    const th = thDots * DOT;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const gx = Math.floor(x / tw);
    const gy = Math.floor(y / th);
    for (let ty = gy; ty * th < y + h; ty++) {
      for (let tx = gx; tx * tw < x + w; tx++) {
        const idx =
          Math.floor(hash2(tx, ty, salt) * variants.length) % variants.length;
        drawImg(ctx, variants[idx], tx * tw, ty * th, twDots, thDots);
      }
    }

    ctx.restore();
    return true;
  }

  function stripX(ctx, path, x, y, w, segWDots, segHDots) {
    if (!ready(path)) return false;

    const sw = segWDots * DOT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, segHDots * DOT);
    ctx.clip();

    const g = Math.floor(x / sw);
    for (let tx = g; tx * sw < x + w; tx++) {
      drawImg(ctx, path, tx * sw, y, segWDots, segHDots);
    }

    ctx.restore();
    return true;
  }

  function stripY(ctx, path, x, y, h, segWDots, segHDots) {
    if (!ready(path)) return false;

    const sh = segHDots * DOT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, segWDots * DOT, h);
    ctx.clip();

    const g = Math.floor(y / sh);
    for (let ty = g; ty * sh < y + h; ty++) {
      drawImg(ctx, path, x, ty * sh, segWDots, segHDots);
    }

    ctx.restore();
    return true;
  }

  /* ---------------- 地面 ---------------- */

  const GRASS = [0, 1, 2, 3].map(i => `${BASE}ground/grass_${i}.svg`);
  const DECALS = {
    tuft: [0, 1, 2].map(i => `${BASE}ground/decal_tuft_${i}.svg`),
    flower: [0, 1, 2].map(i => `${BASE}ground/decal_flower_${i}.svg`),
    stone: [0, 1].map(i => `${BASE}ground/decal_stone_${i}.svg`),
    dirtpatch: [0, 1, 2].map(i => `${BASE}ground/decal_dirtpatch_${i}.svg`)
  };

  function drawGround(ctx, vx, vy, vw, vh) {
    if (!tileArea(ctx, GRASS, vx, vy, vw, vh, 16, 16, 7)) return false;

    // 地面の小物は80pxセルごとのハッシュで散らす（従来の装飾と同じ密度感）
    const cell = 80;
    for (let cy = Math.floor(vy / cell); cy * cell < vy + vh; cy++) {
      for (let cx = Math.floor(vx / cell); cx * cell < vx + vw; cx++) {
        const n = hash2(cx, cy, 21);
        const px = cx * cell + 12 + n * 52;
        const py = cy * cell + 18 + hash2(cx, cy, 22) * 42;
        const pick = arr => arr[Math.floor(hash2(cx, cy, 23) * arr.length) % arr.length];

        if (n < 0.16) drawImgC(ctx, pick(DECALS.tuft), px, py);
        else if (n < 0.24) drawImgC(ctx, pick(DECALS.flower), px, py);
        else if (n < 0.32) drawImgC(ctx, pick(DECALS.stone), px, py);
        else if (n < 0.375) drawImgC(ctx, pick(DECALS.dirtpatch), px, py);
      }
    }
    return true;
  }

  /* ---------------- 外周壁 ---------------- */

  function drawPerimeter(ctx, walls) {
    const hPath = `${BASE}wall/perimeter_h.svg`;
    const vPath = `${BASE}wall/perimeter_v.svg`;
    const cPath = `${BASE}wall/perimeter_corner.svg`;
    if (!ready(hPath) || !ready(vPath)) return false;

    for (const wall of walls || []) {
      if (wall.w >= wall.h) {
        stripX(ctx, hPath, wall.x, wall.y, wall.w, 16, 14);
      } else {
        stripY(ctx, vPath, wall.x, wall.y, wall.h, 14, 16);
      }
    }

    // 四隅
    if (walls && walls.length >= 4) {
      const maxX = Math.max(...walls.map(w => w.x + w.w));
      const maxY = Math.max(...walls.map(w => w.y + w.h));
      drawImg(ctx, cPath, 0, 0, 14, 14);
      drawImg(ctx, cPath, maxX - 14 * DOT, 0, 14, 14);
      drawImg(ctx, cPath, 0, maxY - 14 * DOT, 14, 14);
      drawImg(ctx, cPath, maxX - 14 * DOT, maxY - 14 * DOT, 14, 14);
    }
    return true;
  }

  /* ---------------- 建物 ---------------- */

  const STYLE_DIR = {
    modern: `${BASE}building/modern/`,
    hybrid: `${BASE}building/hybrid/`,
    fantasy: `${BASE}building/fantasy/`
  };

  const THEME_STYLE = {
    "倉庫": "modern", "事務所": "modern", "施設": "modern",
    "工場": "modern", "格納庫": "modern", "管理棟": "modern",
    "研究棟": "hybrid", "診療所": "hybrid", "整備室": "hybrid",
    "民家": "fantasy", "住宅": "fantasy", "店舗": "fantasy"
  };

  const WINDOWS = {
    modern: ["window_intact.svg", "window_broken.svg", "window_boarded.svg"],
    hybrid: ["window_glow.svg", "window_glow_dim.svg", "window_plain.svg"],
    fantasy: ["window_rune_teal.svg", "window_rune_purple.svg", "window_slit.svg"],
    locked: ["window_a.svg", "window_b.svg"]
  };

  const PROP_DIR = `${BASE}building/props/`;
  const THEME_PROP = {
    "倉庫": "prop_warehouse.svg", "民家": "prop_house.svg",
    "事務所": "prop_office.svg", "整備室": "prop_garage.svg",
    "施設": "prop_facility.svg", "工場": "prop_factory.svg",
    "研究棟": "prop_lab.svg", "店舗": "prop_shop.svg",
    "住宅": "prop_home.svg", "格納庫": "prop_hangar.svg",
    "診療所": "prop_clinic.svg", "管理棟": "prop_admin.svg"
  };

  function styleOf(building) {
    return THEME_STYLE[building?.name] || "modern";
  }

  function drawNamePlate(ctx, building) {
    ctx.save();
    ctx.font = "bold 12px sans-serif";
    const tw = ctx.measureText(String(building.name || "")).width;
    ctx.fillStyle = "rgba(10,12,10,.55)";
    ctx.fillRect(building.x + 8, building.y + 8, tw + 10, 16);
    ctx.fillStyle = "#e8e2d2";
    ctx.fillText(String(building.name || ""), building.x + 13, building.y + 20);
    ctx.restore();
  }

  function drawBuildingExterior(ctx, building, dir, kind) {
    const roofVariants =
      kind === "locked"
        ? [`${dir}roof_fill_0.svg`]
        : [`${dir}roof_fill_0.svg`, `${dir}roof_fill_1.svg`];
    const faceVariants = [`${dir}face_fill_0.svg`, `${dir}face_fill_1.svg`];

    if (!ready(roofVariants[0]) || !ready(faceVariants[0])) return false;

    const b = building;
    const roofH = b.h - FACE_H;
    const faceY = b.y + roofH;
    const door = b.door || {};
    const doorSide = door.w >= door.h ? "bottom" : "right";
    const doorCx = door.x + door.w / 2;
    const doorCy = door.y + door.h / 2;

    // 影（四角いハードシャドウ）
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);

    // 屋根と南面
    tileArea(ctx, roofVariants, b.x, b.y, b.w, roofH, 16, 16, b.id + 1);
    tileArea(ctx, faceVariants, b.x, faceY, b.w, FACE_H, 16, 25, b.id + 51);

    // 屋根の縁と隅
    stripX(ctx, `${dir}roof_edge_top.svg`, b.x, b.y, b.w, 16, 4);
    stripY(ctx, `${dir}roof_edge_left.svg`, b.x, b.y, roofH, 4, 16);
    stripY(ctx, `${dir}roof_edge_right.svg`, b.x + b.w - 4 * DOT, b.y, roofH, 4, 16);
    stripX(ctx, `${dir}roof_edge_bottom.svg`, b.x, faceY - 3 * DOT, b.w, 16, 3);
    drawImg(ctx, `${dir}roof_corner_tl.svg`, b.x, b.y, 4, 4);
    drawImg(ctx, `${dir}roof_corner_tr.svg`, b.x + b.w - 4 * DOT, b.y, 4, 4);

    // 壁面の左右端
    drawImg(ctx, `${dir}face_edge_left.svg`, b.x, faceY, 4, 25);
    drawImg(ctx, `${dir}face_edge_right.svg`, b.x + b.w - 4 * DOT, faceY, 4, 25);

    // 屋根の小物（テーマ別／施錠区画は専用プロップ）
    const propPath =
      kind === "locked"
        ? `${dir}roof_prop_a.svg`
        : PROP_DIR + (THEME_PROP[b.name] || "");
    if (THEME_PROP[b.name] || kind === "locked") {
      drawImgC(
        ctx, propPath,
        b.x + b.w * (0.32 + 0.36 * hash2(b.id, 3, 31)),
        b.y + roofH * 0.4
      );
    }

    // 旧描画で id%3 の建物にあったルーン円の置き換え
    if (kind !== "locked" && b.id % 3 === 0) {
      const rune =
        PROP_DIR +
        (hash2(b.id, 5, 37) < 0.5 ? "rune_teal_" : "rune_purple_") +
        (Math.abs(b.id) % 5) + ".svg";
      drawImgC(ctx, rune, b.x + b.w - 16 * DOT, b.y + 13 * DOT);
    }

    // 壁面アクセント（テーマ別）
    let shutterDrawn = false;
    if (kind !== "locked") {
      if (b.name === "診療所") {
        drawImgC(ctx, `${PROP_DIR}accent_clinic_cross.svg`, b.x + 15 * DOT, faceY + FACE_H / 2);
      } else if (b.name === "整備室" || b.name === "格納庫") {
        const shutter =
          PROP_DIR + (b.name === "整備室" ? "accent_garage_shutter.svg" : "accent_hangar_shutter.svg");
        const sx = doorSide === "bottom" ? doorCx : b.x + b.w / 2;
        if (drawImgC(ctx, shutter, sx, faceY + FACE_H / 2) && doorSide === "bottom") {
          shutterDrawn = true;
        }
      } else if (b.name === "工場") {
        stripX(ctx, `${PROP_DIR}accent_hazard_stripe.svg`, b.x + 6, faceY + 2, b.w - 12, 20, 4);
      } else if (b.name === "店舗") {
        stripX(ctx, `${PROP_DIR}accent_shop_awning.svg`, b.x + 4, faceY, b.w - 8, 8, 7);
      }
    }

    // 窓（扉とシャッターの範囲は避ける）
    const winSet = WINDOWS[kind === "locked" ? "locked" : styleOf(b)];
    const winDir = dir;
    for (let sx = b.x + 16 * DOT; sx < b.x + b.w - 12 * DOT; sx += 34 * DOT) {
      const cx = sx + 7 * DOT;
      if (doorSide === "bottom" && Math.abs(cx - doorCx) < 26 * DOT) continue;
      if (shutterDrawn && Math.abs(cx - doorCx) < 30 * DOT) continue;
      if (hash2(Math.round(sx), b.id, 41) < 0.22) continue;
      const wv = winSet[Math.floor(hash2(Math.round(sx), b.id, 43) * winSet.length) % winSet.length];
      drawImgC(ctx, winDir + wv, cx, faceY + FACE_H / 2 - 1);
    }

    // 扉（manifestのアンカー準拠：door_bottomはrow24が建物最下行、
    // door_rightはcol3が建物最右列、縦中心は扉の中心）
    if (!shutterDrawn) {
      if (doorSide === "bottom") {
        drawImg(ctx, `${dir}door_bottom.svg`, doorCx - 14 * DOT, b.y + b.h - 24 * DOT, 28, 32);
      } else {
        drawImg(ctx, `${dir}door_right.svg`, b.x + b.w - 3 * DOT, doorCy - 18 * DOT, 16, 36);
      }
    }

    // 施錠区画：紋章と鍵アイコン
    if (kind === "locked") {
      drawImgC(ctx, `${dir}emblem.svg`, b.x + b.w / 2, faceY + FACE_H / 2);
      if (doorSide === "bottom") {
        drawImgC(ctx, `${BASE}ui/lock.svg`, doorCx, b.y + b.h - 6 * DOT);
      } else {
        drawImgC(ctx, `${BASE}ui/lock.svg`, b.x + b.w + 7 * DOT, doorCy);
      }
    }

    // 足元の瓦礫
    if (hash2(b.id, 9, 47) < 0.5) {
      const rubble = `${dir}rubble_${Math.floor(hash2(b.id, 10, 47) * 2) % 2}.svg`;
      drawImgC(ctx, rubble, b.x + b.w * (0.2 + 0.6 * hash2(b.id, 11, 47)), b.y + b.h + 3);
    }

    drawNamePlate(ctx, b);
    return true;
  }

  function drawBuildingInterior(ctx, building, style) {
    const dir = STYLE_DIR[style];
    const floorVariants = [
      `${dir}interior_floor_0.svg`,
      `${dir}interior_floor_1.svg`
    ];
    if (!ready(floorVariants[0])) return false;

    const b = building;
    const door = b.door || {};
    const doorSide = door.w >= door.h ? "bottom" : "right";
    const wallT = 6 * DOT;

    tileArea(ctx, floorVariants, b.x, b.y, b.w, b.h, 16, 16, b.id + 77);

    stripX(ctx, `${dir}interior_wall_top.svg`, b.x, b.y, b.w, 16, 6);

    // 手前の壁（下扉の場所は開口部）
    if (doorSide === "bottom" && door.w) {
      const gapX = door.x - 4;
      const gapW = door.w + 8;
      stripX(ctx, `${dir}interior_wall_bottom.svg`, b.x, b.y + b.h - wallT, Math.max(0, gapX - b.x), 16, 6);
      stripX(ctx, `${dir}interior_wall_bottom.svg`, gapX + gapW, b.y + b.h - wallT, Math.max(0, b.x + b.w - (gapX + gapW)), 16, 6);
      stripX(ctx, `${dir}interior_gap_h.svg`, gapX, b.y + b.h - wallT, gapW, 16, 6);
    } else {
      stripX(ctx, `${dir}interior_wall_bottom.svg`, b.x, b.y + b.h - wallT, b.w, 16, 6);
    }

    stripY(ctx, `${dir}interior_wall_left.svg`, b.x, b.y, b.h, 6, 16);

    // 右の壁（右扉の場所は開口部）
    if (doorSide === "right" && door.h) {
      const gapY = door.y - 4;
      const gapH = door.h + 8;
      stripY(ctx, `${dir}interior_wall_right.svg`, b.x + b.w - wallT, b.y, Math.max(0, gapY - b.y), 6, 16);
      stripY(ctx, `${dir}interior_wall_right.svg`, b.x + b.w - wallT, gapY + gapH, Math.max(0, b.y + b.h - (gapY + gapH)), 6, 16);
      stripY(ctx, `${dir}interior_gap_v.svg`, b.x + b.w - wallT, gapY, gapH, 6, 16);
    } else {
      stripY(ctx, `${dir}interior_wall_right.svg`, b.x + b.w - wallT, b.y, b.h, 6, 16);
    }

    drawImg(ctx, `${dir}interior_corner_tl.svg`, b.x, b.y, 6, 6);
    drawImg(ctx, `${dir}interior_corner_tr.svg`, b.x + b.w - wallT, b.y, 6, 6);
    drawImg(ctx, `${dir}interior_corner_bl.svg`, b.x, b.y + b.h - wallT, 6, 6);
    drawImg(ctx, `${dir}interior_corner_br.svg`, b.x + b.w - wallT, b.y + b.h - wallT, 6, 6);

    drawNamePlate(ctx, b);
    return true;
  }

  function drawBuilding(ctx, building, inside) {
    if (!building) return false;
    const style = styleOf(building);

    if (inside) return drawBuildingInterior(ctx, building, style);

    const locked =
      building.locked && building.keyType && !(building.door && building.door.unlocked);
    if (locked) {
      return drawBuildingExterior(
        ctx, building, `${BASE}building/locked/${building.keyType}/`, "locked"
      );
    }
    return drawBuildingExterior(ctx, building, STYLE_DIR[style], "style");
  }

  /* ---------------- コンテナ ---------------- */

  const CONTAINER_FILE = {
    "棚": "shelf", "机": "desk", "箱": "box", "ロッカー": "locker",
    "工具箱": "toolbox", "キャビネット": "cabinet", "車": "car"
  };

  // 呼び出し側で影とリングを描いた後、中心に原点が来ている前提で本体を描く
  function drawContainer(ctx, container) {
    const base = CONTAINER_FILE[String(container?.type || "")];
    if (!base) return false;

    const path = `${BASE}container/${base}${container.searched ? "_searched" : ""}.svg`;
    if (!ready(path)) return false;
    return drawImgC(ctx, path, 0, 0);
  }

  /* ---------------- 木 ---------------- */

  function drawTree(ctx, tree) {
    if (!tree) return false;

    const variant =
      hash2(Math.round(tree.x), Math.round(tree.y), 5) < 0.5
        ? "tree_leafy.svg"
        : "tree_pine.svg";
    const path = `${BASE}tree/${variant}`;
    const image = ready(path);
    if (!image) return false;

    const wDots = image.naturalWidth || 26;
    const hDots = image.naturalHeight || 28;

    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.fillRect(tree.x - (wDots * DOT) / 2 + 2, tree.y + 12, wDots * DOT - 4, 5);

    return drawImg(
      ctx, path,
      tree.x - (wDots * DOT) / 2,
      tree.y + 16 - hDots * DOT,
      wDots, hDots
    );
  }

  /* ---------------- キャラクター ---------------- */

  // キャラは動物と同じ見下ろし4方向スプライト。
  // 16ドット幅を28ワールド単位で描く（ペットの描画スケールに合わせる）。
  const CHAR_W = 28;
  const CHAR_H = 35; // 20ドット分
  const CHAR_BASE = "assets/char/svg/";

  function drawImgSized(ctx, path, x, y, wWorld, hWorld) {
    const image = ready(path);
    if (!image) return false;

    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, wWorld, hWorld);
    ctx.imageSmoothingEnabled = prev;
    return true;
  }

  function directionFor(fx, fy) {
    const x = Number(fx) || 0;
    const y = Number(fy) || 0;
    if (Math.abs(x) >= Math.abs(y)) return x >= 0 ? "right" : "left";
    return y >= 0 ? "down" : "up";
  }

  function drawCharShadow(ctx, x, y, w = 22) {
    ctx.fillStyle = "rgba(0,0,0,.30)";
    ctx.fillRect(x - w / 2, y + 11, w, 5);
  }

  // 武器は向きに合わせて回して持たせる（従来描画と同じ持ち位置）
  function drawWeapon(ctx, x, y, angle, kind) {
    const path = `${CHAR_BASE}weapon_${kind}.svg`;
    if (!ready(path)) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawImgSized(ctx, path, 3, -5.25, 28, 10.5);
    ctx.restore();
  }

  function drawPlayer(ctx, player, weaponKind) {
    const dir = directionFor(player.facingX, player.facingY);
    const path = `${CHAR_BASE}player_${dir}.svg`;
    if (!ready(path)) return false;

    drawCharShadow(ctx, player.x, player.y);
    drawImgSized(ctx, path, player.x - CHAR_W / 2, player.y + 16 - CHAR_H, CHAR_W, CHAR_H);

    if (weaponKind && weaponKind !== "none") {
      drawWeapon(
        ctx, player.x, player.y,
        Math.atan2(player.facingY || 0, player.facingX || 1),
        weaponKind
      );
    }
    return true;
  }

  function drawEnemy(ctx, enemy) {
    const x = enemy.x;
    const y = enemy.y;
    const angle = Math.atan2(enemy.facingY || 0, enemy.facingX || 1);

    drawCharShadow(ctx, x, y, enemy.visualType === "arcane" ? 24 : 22);

    if (enemy.efrPetMarked && !enemy.dead) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
      ctx.save();
      ctx.strokeStyle = `rgba(105,205,255,${0.70 + 0.25 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 22 + 3 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (enemy.dead) {
      const path = `${CHAR_BASE}corpse.svg`;
      if (!ready(path)) return false;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle - 0.35);
      drawImgSized(ctx, path, -14, -2, 28, 17.5);
      ctx.restore();
      return true;
    }

    const dir = directionFor(enemy.facingX, enemy.facingY);

    if (enemy.visualType === "arcane") {
      const glow = 0.5 + 0.5 * Math.sin(performance.now() * 0.005 + x * 0.03);
      ctx.save();
      ctx.fillStyle = `rgba(154,95,235,${0.10 + 0.08 * glow})`;
      ctx.beginPath();
      ctx.arc(x, y - 2, 17 + 2 * glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const path = `${CHAR_BASE}arcane_${dir}.svg`;
      if (!ready(path)) return false;
      drawImgSized(ctx, path, x - CHAR_W / 2, y + 16 - CHAR_H, CHAR_W, CHAR_H);
    } else {
      const role =
        enemy.role === "sniper" || enemy.role === "rifle" || enemy.role === "scout"
          ? enemy.role
          : "raider";
      const path = `${CHAR_BASE}enemy_${role}_${dir}.svg`;
      if (!ready(path)) return false;
      drawImgSized(ctx, path, x - CHAR_W / 2, y + 16 - CHAR_H, CHAR_W, CHAR_H);

      if (enemy.name !== "非武装の略奪者") {
        drawWeapon(ctx, x, y, angle, role === "scout" || role === "raider" ? "blade" : "gun");
      }
    }

    if (enemy.alerted) {
      ctx.save();
      ctx.strokeStyle = "#e4a24c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 21, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return true;
  }

  /* ---------------- 先読み ---------------- */

  function preload() {
    const paths = [
      ...GRASS,
      ...DECALS.tuft, ...DECALS.flower, ...DECALS.stone, ...DECALS.dirtpatch,
      `${BASE}wall/perimeter_h.svg`, `${BASE}wall/perimeter_v.svg`,
      `${BASE}wall/perimeter_corner.svg`, `${BASE}wall/decal_moss.svg`,
      `${BASE}ui/lock.svg`,
      `${BASE}tree/tree_leafy.svg`, `${BASE}tree/tree_pine.svg`
    ];

    for (const key of Object.keys(CONTAINER_FILE)) {
      paths.push(`${BASE}container/${CONTAINER_FILE[key]}.svg`);
      paths.push(`${BASE}container/${CONTAINER_FILE[key]}_searched.svg`);
    }

    const common = [
      "roof_fill_0.svg", "roof_fill_1.svg", "face_fill_0.svg", "face_fill_1.svg",
      "roof_edge_top.svg", "roof_edge_left.svg", "roof_edge_right.svg",
      "roof_edge_bottom.svg", "roof_corner_tl.svg", "roof_corner_tr.svg",
      "face_edge_left.svg", "face_edge_right.svg",
      "door_bottom.svg", "door_right.svg",
      "interior_floor_0.svg", "interior_floor_1.svg",
      "interior_wall_top.svg", "interior_wall_left.svg",
      "interior_wall_right.svg", "interior_wall_bottom.svg",
      "interior_corner_tl.svg", "interior_corner_tr.svg",
      "interior_corner_bl.svg", "interior_corner_br.svg",
      "interior_gap_h.svg", "interior_gap_v.svg",
      "rubble_0.svg", "rubble_1.svg"
    ];

    for (const style of Object.keys(STYLE_DIR)) {
      for (const f of common) paths.push(STYLE_DIR[style] + f);
      for (const w of WINDOWS[style]) paths.push(STYLE_DIR[style] + w);
    }

    for (const keyType of ["military", "research", "factory", "storage", "security", "special"]) {
      const dir = `${BASE}building/locked/${keyType}/`;
      for (const f of common) {
        if (f !== "roof_fill_1.svg" && !f.startsWith("interior_")) paths.push(dir + f);
      }
      paths.push(dir + "window_a.svg", dir + "window_b.svg",
        dir + "emblem.svg", dir + "roof_prop_a.svg");
    }

    for (const key of Object.keys(THEME_PROP)) {
      paths.push(PROP_DIR + THEME_PROP[key]);
    }
    paths.push(
      `${PROP_DIR}accent_clinic_cross.svg`,
      `${PROP_DIR}accent_garage_shutter.svg`,
      `${PROP_DIR}accent_hangar_shutter.svg`,
      `${PROP_DIR}accent_hazard_stripe.svg`,
      `${PROP_DIR}accent_shop_awning.svg`
    );
    for (let i = 0; i < 5; i++) {
      paths.push(`${PROP_DIR}rune_teal_${i}.svg`);
      paths.push(`${PROP_DIR}rune_purple_${i}.svg`);
    }

    // キャラクター一式
    for (const dirName of ["down", "up", "left", "right"]) {
      paths.push(`${CHAR_BASE}player_${dirName}.svg`);
      paths.push(`${CHAR_BASE}arcane_${dirName}.svg`);
      for (const role of ["sniper", "rifle", "scout", "raider"]) {
        paths.push(`${CHAR_BASE}enemy_${role}_${dirName}.svg`);
      }
    }
    paths.push(
      `${CHAR_BASE}corpse.svg`,
      `${CHAR_BASE}weapon_gun.svg`,
      `${CHAR_BASE}weapon_staff.svg`,
      `${CHAR_BASE}weapon_blade.svg`
    );

    for (const p of paths) img(p);
  }

  preload();

  window.EFRMapArt = {
    DOT,
    drawGround,
    drawPerimeter,
    drawBuilding,
    drawContainer,
    drawTree,
    drawPlayer,
    drawEnemy
  };
})();

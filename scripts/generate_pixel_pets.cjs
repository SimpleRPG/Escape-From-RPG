const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class PixelArt {
  constructor(w = 64, h = 64) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }

  set(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = color[0];
    this.data[i + 1] = color[1];
    this.data[i + 2] = color[2];
    this.data[i + 3] = color[3] !== undefined ? color[3] : 255;
  }

  get(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  rect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, color);
      }
    }
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0) {
          this.set(cx + dx, cy + dy, color);
        }
      }
    }
  }

  circle(cx, cy, r, color) {
    this.ellipse(cx, cy, r, r, color);
  }

  line(x0, y0, x1, y1, color, thickness = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;
    while (true) {
      if (thickness <= 1) {
        this.set(cx, cy, color);
      } else {
        const rad = Math.floor(thickness / 2);
        this.circle(cx, cy, rad, color);
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  polygon(points, color) {
    if (points.length < 3) return;
    let minY = this.h;
    let maxY = 0;
    for (const [_, y] of points) {
      if (y < minY) minY = Math.floor(y);
      if (y > maxY) maxY = Math.ceil(y);
    }
    minY = Math.max(0, minY);
    maxY = Math.min(this.h - 1, maxY);

    for (let y = minY; y <= maxY; y++) {
      const nodes = [];
      let j = points.length - 1;
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[j];
        if ((y0 < y && y1 >= y) || (y1 < y && y0 >= y)) {
          nodes.push(Math.round(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)));
        }
        j = i;
      }
      nodes.sort((a, b) => a - b);
      for (let k = 0; k < nodes.length; k += 2) {
        if (nodes[k + 1] !== undefined) {
          const startX = Math.max(0, nodes[k]);
          const endX = Math.min(this.w - 1, nodes[k + 1]);
          for (let x = startX; x <= endX; x++) {
            this.set(x, y, color);
          }
        }
      }
    }
  }

  // Draw 2x2 or 2x3 eye with white twinkle
  drawEye(x, y, eyeColor = [30, 24, 20], highlight = true) {
    this.rect(x, y, 2, 3, eyeColor);
    if (highlight) {
      this.set(x, y, [255, 255, 255]); // Twinkle top-left
    }
  }

  applyOutline(outlineColor = [28, 22, 20]) {
    const copy = new Uint8Array(this.data);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const idx = (y * this.w + x) * 4;
        if (copy[idx + 3] === 0) continue;

        let isBorder = false;
        const neighbors = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
          [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= this.w || ny < 0 || ny >= this.h) {
            isBorder = true;
            break;
          }
          const nidx = (ny * this.w + nx) * 4;
          if (copy[nidx + 3] === 0) {
            isBorder = true;
            break;
          }
        }

        if (isBorder) {
          this.set(x, y, outlineColor);
        }
      }
    }
  }

  toBuffer() {
    return sharp(Buffer.from(this.data), {
      raw: { width: this.w, height: this.h, channels: 4 }
    }).png({ palette: true }).toBuffer();
  }
}

// -------------------------------------------------------------
// Procedural Pixel Art Generator for 40 species
// -------------------------------------------------------------
function hexToRgb(hex) {
  const c = parseInt(hex.replace('#', ''), 16);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

function shadeColor(rgb, factor) {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] * factor))),
    Math.max(0, Math.min(255, Math.round(rgb[1] * factor))),
    Math.max(0, Math.min(255, Math.round(rgb[2] * factor)))
  ];
}

const GENERATORS = {
  cat: (p) => {
    const base = [169, 139, 183];
    const dark = shadeColor(base, 0.72);
    const light = [215, 195, 226];
    const chest = [240, 235, 245];
    const pink = [238, 150, 165];
    // Body & Hindquarters
    p.ellipse(30, 39, 14, 11, base);
    p.ellipse(32, 42, 13, 8, dark);
    // Chest / Belly
    p.ellipse(36, 40, 8, 8, chest);
    // Legs & Paws
    p.rect(20, 46, 5, 8, dark);
    p.rect(27, 47, 5, 7, base);
    p.rect(38, 47, 5, 7, base);
    p.rect(44, 46, 5, 8, dark);
    p.rect(19, 52, 6, 3, chest);
    p.rect(26, 52, 6, 3, chest);
    p.rect(37, 52, 6, 3, chest);
    p.rect(43, 52, 6, 3, chest);
    // Tail curving up
    p.line(18, 42, 13, 33, base, 3);
    p.line(13, 33, 16, 24, base, 3);
    p.circle(16, 23, 2, light);
    // Head
    p.circle(42, 28, 11, base);
    p.circle(43, 27, 9, light);
    // Ears
    p.polygon([[34, 21], [32, 12], [41, 18]], base);
    p.polygon([[44, 19], [51, 13], [51, 23]], base);
    p.polygon([[35, 20], [34, 15], [39, 19]], pink);
    p.polygon([[46, 20], [49, 16], [49, 22]], pink);
    // Muzzle & Nose
    p.ellipse(47, 31, 5, 4, chest);
    p.set(48, 30, pink);
    // Whiskers
    p.line(48, 32, 56, 31, [70, 60, 80]);
    p.line(48, 33, 55, 36, [70, 60, 80]);
    // Eyes (emerald green)
    p.drawEye(43, 25, [30, 140, 60]);
    p.drawEye(48, 25, [30, 140, 60]);
  },

  dog: (p) => {
    const base = [168, 111, 77];
    const dark = shadeColor(base, 0.7);
    const light = [205, 153, 118];
    const white = [245, 235, 225];
    // Body
    p.ellipse(31, 38, 15, 12, base);
    p.ellipse(32, 42, 14, 8, dark);
    // Chest
    p.ellipse(39, 39, 8, 9, white);
    // Legs
    p.rect(20, 46, 5, 8, dark);
    p.rect(27, 47, 5, 8, base);
    p.rect(38, 47, 5, 8, base);
    p.rect(44, 46, 5, 8, dark);
    p.rect(19, 52, 6, 3, white);
    p.rect(26, 52, 6, 3, white);
    p.rect(37, 52, 6, 3, white);
    p.rect(43, 52, 6, 3, white);
    // Tail wagging up
    p.line(18, 38, 11, 30, base, 3);
    p.circle(11, 30, 2, white);
    // Head & Snout
    p.circle(44, 27, 11, base);
    p.circle(45, 26, 9, light);
    p.ellipse(50, 31, 6, 5, white);
    p.rect(53, 29, 3, 2, [30, 20, 15]); // Nose
    // Floppy ears
    p.ellipse(37, 26, 4, 8, dark);
    p.ellipse(47, 24, 4, 7, dark);
    // Eyes
    p.drawEye(44, 24, [40, 25, 15]);
    p.drawEye(49, 24, [40, 25, 15]);
    // Collar (red)
    p.line(39, 36, 46, 37, [220, 40, 40], 2);
    p.set(43, 38, [240, 200, 30]); // Tag
  },

  golden: (p) => {
    const base = [218, 165, 85];
    const light = [242, 202, 132];
    const dark = shadeColor(base, 0.72);
    const cream = [252, 236, 200];
    p.ellipse(32, 38, 16, 12, base);
    p.ellipse(33, 42, 15, 8, dark);
    p.ellipse(40, 39, 9, 9, cream);
    p.rect(21, 46, 5, 8, dark);
    p.rect(28, 47, 5, 8, base);
    p.rect(39, 47, 5, 8, base);
    p.rect(45, 46, 5, 8, dark);
    // Big fluffy feathered tail
    p.polygon([[18, 40], [10, 32], [8, 22], [14, 24], [18, 35]], base);
    p.polygon([[10, 32], [7, 22], [12, 25]], light);
    // Head
    p.circle(45, 26, 11, base);
    p.circle(46, 25, 9, light);
    p.ellipse(51, 30, 6, 5, cream);
    p.rect(54, 28, 3, 2, [30, 22, 18]);
    // Large floppy golden ears
    p.ellipse(38, 26, 5, 9, dark);
    p.ellipse(47, 23, 4, 8, dark);
    p.drawEye(44, 23, [45, 28, 18]);
    p.drawEye(49, 23, [45, 28, 18]);
  },

  wolf: (p) => {
    const base = [111, 116, 124];
    const dark = [75, 80, 88];
    const light = [170, 175, 182];
    const white = [235, 238, 242];
    p.ellipse(32, 37, 16, 11, base);
    p.ellipse(33, 41, 15, 7, dark);
    p.ellipse(40, 38, 8, 8, white);
    p.rect(21, 45, 5, 9, dark);
    p.rect(28, 46, 5, 9, base);
    p.rect(39, 46, 5, 9, base);
    p.rect(45, 45, 5, 9, dark);
    // Bushy wolf tail downward
    p.line(18, 37, 11, 46, base, 4);
    p.circle(10, 48, 3, dark);
    // Head & sharp muzzle
    p.circle(44, 25, 10, base);
    p.polygon([[47, 24], [57, 28], [47, 32]], white);
    p.set(56, 28, [20, 20, 20]);
    // Sharp upright ears
    p.polygon([[37, 19], [38, 9], [43, 17]], dark);
    p.polygon([[44, 17], [48, 8], [50, 18]], dark);
    p.polygon([[39, 17], [39, 12], [42, 16]], light);
    // Fierce amber eyes
    p.drawEye(45, 22, [220, 160, 20]);
  },

  bear: (p) => {
    const base = [121, 86, 62];
    const dark = shadeColor(base, 0.7);
    const light = [165, 124, 94];
    const muzzle = [215, 180, 145];
    // Heavy round body
    p.ellipse(31, 37, 18, 14, base);
    p.ellipse(32, 42, 17, 9, dark);
    // Sturdy thick paws
    p.rect(18, 46, 7, 8, dark);
    p.rect(27, 47, 7, 8, base);
    p.rect(38, 47, 7, 8, base);
    p.rect(47, 46, 7, 8, dark);
    // Little round tail
    p.circle(13, 38, 3, dark);
    // Massive round head
    p.circle(46, 26, 12, base);
    p.circle(47, 25, 10, light);
    // Round ears
    p.circle(39, 16, 4, dark);
    p.circle(39, 16, 2, muzzle);
    p.circle(52, 17, 4, dark);
    p.circle(52, 17, 2, muzzle);
    // Muzzle & nose
    p.ellipse(51, 30, 6, 5, muzzle);
    p.rect(53, 28, 4, 3, [30, 20, 15]);
    // Moon chest mark
    p.ellipse(40, 37, 6, 5, muzzle);
    // Eyes
    p.drawEye(46, 23, [20, 15, 10]);
  },

  tiger: (p) => {
    const orange = [225, 125, 35];
    const dark = [40, 30, 25];
    const white = [250, 245, 240];
    p.ellipse(32, 37, 16, 11, orange);
    p.ellipse(38, 38, 8, 8, white);
    // Tiger stripes on body
    p.line(26, 30, 28, 44, dark, 2);
    p.line(32, 29, 34, 43, dark, 2);
    p.line(38, 30, 39, 41, dark, 2);
    // Paws
    p.rect(20, 45, 5, 8, orange);
    p.rect(27, 46, 5, 8, orange);
    p.rect(39, 46, 5, 8, orange);
    p.rect(45, 45, 5, 8, orange);
    // Striped tail
    p.line(18, 36, 11, 26, orange, 3);
    p.set(15, 32, dark); p.set(13, 29, dark); p.set(11, 26, dark);
    // Head & ears
    p.circle(45, 25, 11, orange);
    p.circle(40, 16, 4, dark); p.circle(40, 16, 2, white);
    p.circle(51, 16, 4, dark); p.circle(51, 16, 2, white);
    // Head stripes
    p.line(44, 16, 46, 21, dark, 2);
    p.line(40, 21, 42, 25, dark);
    p.ellipse(50, 29, 6, 4, white);
    p.rect(53, 27, 3, 2, [210, 90, 110]);
    p.drawEye(45, 23, [240, 190, 20]);
  },

  leopard: (p) => {
    const gold = [215, 160, 75];
    const dark = [45, 35, 25];
    const white = [250, 240, 220];
    p.ellipse(32, 37, 16, 11, gold);
    p.ellipse(38, 39, 8, 7, white);
    // Rosette spots
    for (const [sx, sy] of [[24, 34], [30, 32], [34, 40], [28, 41]]) {
      p.circle(sx, sy, 2, dark);
      p.set(sx, sy, gold);
    }
    p.rect(20, 45, 5, 8, gold);
    p.rect(27, 46, 5, 8, gold);
    p.rect(39, 46, 5, 8, gold);
    p.rect(45, 45, 5, 8, gold);
    p.line(18, 36, 10, 27, gold, 3);
    p.circle(45, 25, 11, gold);
    p.circle(39, 16, 3, dark);
    p.circle(50, 17, 3, dark);
    p.ellipse(50, 29, 5, 4, white);
    p.rect(52, 28, 3, 2, [30, 20, 15]);
    p.drawEye(45, 23, [90, 180, 120]);
  },

  bird: (p) => {
    const blue = [95, 140, 220];
    const light = [150, 185, 245];
    const yellow = [245, 180, 30];
    const belly = [245, 245, 255];
    p.ellipse(32, 36, 13, 10, blue);
    p.ellipse(34, 38, 9, 7, belly);
    // Wing
    p.polygon([[24, 33], [36, 33], [28, 44]], light);
    // Tail
    p.polygon([[21, 37], [10, 42], [11, 46], [23, 40]], blue);
    // Legs
    p.line(30, 46, 30, 52, yellow);
    p.line(36, 46, 36, 52, yellow);
    // Head & Beak
    p.circle(41, 26, 9, blue);
    p.circle(42, 25, 7, light);
    p.polygon([[47, 26], [55, 29], [47, 32]], yellow);
    p.drawEye(43, 24, [20, 20, 20]);
  },

  eagle: (p) => {
    const brown = [110, 75, 45];
    const white = [250, 250, 255];
    const yellow = [245, 185, 20];
    p.ellipse(31, 37, 15, 11, brown);
    p.polygon([[22, 33], [37, 33], [26, 45]], [80, 55, 30]);
    p.polygon([[19, 39], [10, 44], [12, 48], [22, 42]], white);
    p.line(29, 47, 28, 53, yellow, 2);
    p.line(36, 47, 36, 53, yellow, 2);
    // White raptor head
    p.circle(43, 25, 10, white);
    // Hooked yellow beak
    p.polygon([[48, 24], [57, 28], [55, 34], [48, 30]], yellow);
    p.drawEye(44, 23, [240, 200, 20]);
  },

  owl: (p) => {
    const brown = [125, 105, 90];
    const belly = [235, 225, 205];
    const gold = [245, 195, 25];
    // Plump upright body
    p.ellipse(32, 36, 14, 15, brown);
    p.ellipse(32, 38, 10, 11, belly);
    // Feather specks
    p.set(30, 36, brown); p.set(34, 38, brown); p.set(31, 41, brown);
    // Wings at sides
    p.ellipse(21, 37, 4, 11, [95, 80, 70]);
    p.ellipse(43, 37, 4, 11, [95, 80, 70]);
    // Large round owl eyes
    p.circle(27, 22, 6, gold);
    p.circle(37, 22, 6, gold);
    p.drawEye(27, 22, [20, 20, 20]);
    p.drawEye(37, 22, [20, 20, 20]);
    // Beak
    p.polygon([[31, 25], [33, 29], [31, 29]], [220, 140, 30]);
    // Ear tufts
    p.polygon([[22, 17], [20, 9], [26, 16]], brown);
    p.polygon([[38, 16], [44, 9], [42, 17]], brown);
    // Talons
    p.rect(26, 50, 4, 3, gold);
    p.rect(34, 50, 4, 3, gold);
  },

  crow: (p) => {
    const black = [42, 45, 52];
    const sheen = [70, 75, 95];
    p.ellipse(32, 36, 14, 10, black);
    p.polygon([[23, 33], [37, 33], [27, 44]], sheen);
    p.polygon([[20, 37], [8, 42], [9, 46], [22, 41]], black);
    p.line(29, 46, 29, 52, [50, 50, 50]);
    p.line(35, 46, 35, 52, [50, 50, 50]);
    p.circle(41, 26, 9, black);
    p.polygon([[47, 24], [58, 29], [47, 32]], [30, 32, 38]);
    p.drawEye(43, 24, [210, 220, 230]);
  },

  kite: (p) => {
    const brown = [154, 115, 84];
    const light = [205, 165, 125];
    const yellow = [240, 185, 30];
    p.ellipse(32, 36, 14, 10, brown);
    p.polygon([[23, 33], [37, 33], [27, 44]], light);
    // Characteristic forked tail
    p.polygon([[20, 37], [7, 40], [13, 44], [7, 48], [21, 41]], brown);
    p.line(29, 46, 29, 52, yellow);
    p.line(35, 46, 35, 52, yellow);
    p.circle(42, 26, 9, brown);
    p.polygon([[47, 25], [56, 28], [54, 32], [47, 30]], yellow);
    p.drawEye(44, 24, [40, 30, 20]);
  },

  fox: (p) => {
    const red = [215, 105, 40];
    const white = [250, 245, 240];
    const dark = [45, 35, 30];
    p.ellipse(32, 38, 14, 10, red);
    p.ellipse(39, 39, 7, 7, white);
    // Black socks
    p.rect(21, 46, 4, 8, dark);
    p.rect(27, 47, 4, 8, red);
    p.rect(38, 47, 4, 8, red);
    p.rect(44, 46, 4, 8, dark);
    // Huge bushy fox tail with white tip
    p.polygon([[18, 38], [8, 30], [5, 20], [12, 17], [18, 30]], red);
    p.polygon([[8, 30], [5, 20], [10, 18]], white);
    // Head & Snout
    p.circle(43, 26, 10, red);
    p.polygon([[45, 25], [55, 30], [45, 33]], white);
    p.set(54, 30, dark);
    // Large pointed ears with black back
    p.polygon([[36, 19], [36, 9], [42, 17]], dark);
    p.polygon([[44, 17], [48, 8], [50, 18]], dark);
    p.polygon([[38, 17], [38, 12], [41, 16]], white);
    p.drawEye(44, 23, [40, 25, 15]);
  },

  weasel: (p) => {
    const brown = [155, 134, 108];
    const cream = [245, 235, 215];
    // Long slender arched body
    p.ellipse(28, 40, 14, 7, brown);
    p.ellipse(38, 35, 10, 7, brown);
    p.ellipse(35, 38, 12, 5, cream);
    // Short legs
    p.rect(19, 45, 4, 6, brown);
    p.rect(26, 46, 4, 6, brown);
    p.rect(37, 45, 4, 6, brown);
    p.rect(43, 44, 4, 6, brown);
    // Long tail
    p.line(16, 42, 7, 36, brown, 3);
    p.circle(7, 36, 2, [60, 50, 40]);
    // Small rounded head
    p.circle(47, 28, 7, brown);
    p.ellipse(50, 30, 4, 3, cream);
    p.circle(44, 22, 2, brown);
    p.set(52, 29, [40, 30, 25]);
    p.drawEye(46, 26, [25, 20, 15]);
  },

  lynx: (p) => {
    const base = [165, 135, 105];
    const white = [245, 240, 230];
    const dark = [45, 35, 25];
    p.ellipse(32, 37, 15, 11, base);
    p.ellipse(38, 39, 8, 8, white);
    p.circle(28, 34, 1, dark); p.circle(34, 35, 1, dark);
    p.rect(21, 45, 5, 9, base);
    p.rect(28, 46, 5, 9, base);
    p.rect(39, 46, 5, 9, base);
    p.rect(45, 45, 5, 9, base);
    // Short bobtail with black tip
    p.line(18, 38, 13, 38, base, 3);
    p.circle(12, 38, 2, dark);
    p.circle(44, 25, 10, base);
    // Tufted ears with black tassels!
    p.polygon([[37, 18], [37, 8], [42, 16]], base);
    p.line(37, 8, 37, 4, dark, 2);
    p.polygon([[44, 16], [48, 8], [49, 17]], base);
    p.line(48, 8, 49, 4, dark, 2);
    p.ellipse(48, 29, 5, 4, white);
    p.drawEye(44, 23, [220, 180, 30]);
  },

  snake: (p) => {
    const green = [90, 160, 80];
    const light = [140, 210, 120];
    const belly = [230, 240, 190];
    // Coiled body
    p.ellipse(32, 45, 18, 7, green);
    p.ellipse(32, 46, 15, 4, belly);
    p.ellipse(34, 40, 12, 6, green);
    // Upright neck & head
    p.line(38, 40, 44, 28, green, 5);
    p.ellipse(46, 25, 7, 5, green);
    p.ellipse(46, 24, 5, 3, light);
    // Forked red tongue
    p.line(52, 26, 57, 26, [220, 30, 40]);
    p.set(58, 25, [220, 30, 40]);
    p.set(58, 27, [220, 30, 40]);
    // Slit eye
    p.set(45, 23, [230, 180, 20]);
    p.set(45, 24, [20, 20, 20]);
  },

  horse: (p) => {
    const brown = [145, 95, 60];
    const dark = [60, 35, 20];
    const light = [190, 135, 95];
    p.ellipse(30, 37, 17, 12, brown);
    // Powerful legs & hooves
    p.rect(19, 45, 4, 11, brown); p.rect(19, 54, 4, 3, dark);
    p.rect(26, 46, 4, 11, brown); p.rect(26, 55, 4, 3, dark);
    p.rect(38, 46, 4, 11, brown); p.rect(38, 55, 4, 3, dark);
    p.rect(44, 45, 4, 11, brown); p.rect(44, 54, 4, 3, dark);
    // Flowing tail
    p.polygon([[15, 35], [7, 45], [9, 52], [14, 44]], dark);
    // Arched neck & head
    p.polygon([[37, 36], [46, 20], [53, 23], [42, 40]], brown);
    p.ellipse(50, 21, 7, 5, brown);
    p.ellipse(54, 23, 4, 4, light);
    // Flowing black mane
    p.line(40, 30, 38, 36, dark, 3);
    p.line(44, 22, 42, 28, dark, 3);
    p.polygon([[47, 15], [48, 9], [51, 15]], brown);
    p.drawEye(49, 19, [20, 15, 10]);
  },

  pack: (p) => {
    GENERATORS.horse(p);
    // Saddle & Pack bags strapped on
    p.rect(27, 32, 12, 10, [180, 140, 80]); // Canvas sack
    p.line(26, 36, 40, 36, [70, 45, 25], 2); // Leather strap
    p.line(33, 31, 33, 43, [70, 45, 25], 2);
    p.rect(28, 34, 4, 5, [210, 170, 100]);
    p.rect(34, 34, 4, 5, [210, 170, 100]);
  },

  ox: (p) => {
    const base = [95, 85, 75];
    const dark = [50, 45, 40];
    const horn = [230, 225, 215];
    // Heavy stocky body
    p.ellipse(31, 37, 18, 13, base);
    p.rect(18, 46, 6, 9, dark); p.rect(18, 53, 6, 3, [30, 30, 30]);
    p.rect(26, 47, 6, 9, base); p.rect(26, 54, 6, 3, [30, 30, 30]);
    p.rect(38, 47, 6, 9, base); p.rect(38, 54, 6, 3, [30, 30, 30]);
    p.rect(46, 46, 6, 9, dark); p.rect(46, 53, 6, 3, [30, 30, 30]);
    p.line(14, 37, 11, 47, dark, 2); // Tail with brush
    p.circle(11, 48, 2, [30, 30, 30]);
    // Big head
    p.circle(46, 26, 11, base);
    p.ellipse(52, 29, 6, 5, [140, 130, 120]);
    p.rect(54, 28, 3, 2, [30, 25, 20]);
    // Curved horns
    p.line(43, 17, 38, 10, horn, 3);
    p.line(48, 17, 53, 10, horn, 3);
    p.drawEye(46, 23, [20, 20, 20]);
  },

  camel: (p) => {
    const sand = [195, 155, 95];
    const light = [225, 185, 125];
    const dark = [145, 110, 65];
    p.ellipse(30, 39, 17, 11, sand);
    // Two characteristic humps
    p.ellipse(24, 28, 6, 8, sand); p.ellipse(24, 27, 4, 6, light);
    p.ellipse(36, 28, 6, 8, sand); p.ellipse(36, 27, 4, 6, light);
    // Long stilt legs
    p.rect(18, 46, 4, 11, dark); p.rect(17, 55, 6, 3, dark);
    p.rect(25, 47, 4, 11, sand); p.rect(24, 56, 6, 3, dark);
    p.rect(37, 47, 4, 11, sand); p.rect(36, 56, 6, 3, dark);
    p.rect(44, 46, 4, 11, dark); p.rect(43, 55, 6, 3, dark);
    // Curved neck & head
    p.line(39, 38, 48, 25, sand, 5);
    p.ellipse(50, 22, 6, 5, sand);
    p.ellipse(54, 24, 4, 3, light);
    p.drawEye(49, 20, [30, 20, 10]);
  },

  alpaca: (p) => {
    const wool = [235, 225, 205];
    const shade = [195, 185, 165];
    const face = [170, 150, 130];
    // Super fluffy round body (cloud puffs)
    p.circle(24, 38, 9, wool);
    p.circle(32, 37, 10, wool);
    p.circle(38, 39, 9, wool);
    p.ellipse(31, 42, 14, 5, shade);
    // Slender legs
    p.rect(21, 46, 4, 9, shade);
    p.rect(27, 47, 4, 9, wool);
    p.rect(37, 47, 4, 9, wool);
    p.rect(43, 46, 4, 9, shade);
    // Long fluffy neck
    p.line(40, 36, 42, 18, wool, 8);
    // Cute fluffy head
    p.circle(44, 16, 7, wool);
    p.circle(44, 10, 4, wool); // Top knot
    p.ellipse(48, 17, 4, 3, face);
    // Pointy ears
    p.polygon([[40, 13], [37, 6], [43, 11]], wool);
    p.polygon([[45, 12], [47, 5], [49, 12]], wool);
    p.drawEye(44, 14, [30, 25, 20]);
  },

  raccoon: (p) => {
    const gray = [125, 120, 115];
    const dark = [40, 38, 36];
    const white = [245, 245, 245];
    p.ellipse(32, 38, 14, 10, gray);
    p.ellipse(38, 39, 7, 7, white);
    p.rect(21, 46, 4, 7, dark);
    p.rect(27, 47, 4, 7, gray);
    p.rect(38, 47, 4, 7, gray);
    p.rect(44, 46, 4, 7, dark);
    // Ringed tail
    p.line(18, 38, 7, 33, gray, 5);
    p.line(15, 36, 14, 35, dark, 5);
    p.line(10, 34, 9, 33, dark, 5);
    p.circle(43, 26, 10, gray);
    // Bandit black eye mask
    p.polygon([[36, 23], [52, 23], [52, 28], [36, 28]], dark);
    p.ellipse(50, 29, 4, 3, white);
    p.set(53, 28, [20, 20, 20]);
    // Rounded ears with white rim
    p.circle(37, 17, 3, white); p.circle(37, 17, 2, dark);
    p.circle(47, 17, 3, white); p.circle(47, 17, 2, dark);
    p.drawEye(41, 24, [240, 240, 240]);
  },

  boar: (p) => {
    const brown = [115, 85, 65];
    const dark = [65, 45, 35];
    const tusk = [250, 248, 240];
    p.ellipse(31, 38, 17, 12, brown);
    p.ellipse(31, 33, 14, 5, dark); // Bristly mane
    p.rect(19, 46, 5, 8, dark);
    p.rect(26, 47, 5, 8, brown);
    p.rect(38, 47, 5, 8, brown);
    p.rect(45, 46, 5, 8, dark);
    // Big head & sturdy snout
    p.circle(45, 27, 11, brown);
    p.ellipse(52, 30, 6, 5, dark);
    // Protruding tusks!
    p.polygon([[51, 32], [54, 27], [53, 33]], tusk);
    p.polygon([[38, 18], [38, 11], [43, 17]], dark);
    p.drawEye(44, 23, [220, 40, 30]); // Wild red eye
  },

  goat: (p) => {
    const cream = [215, 200, 175];
    const dark = [140, 125, 105];
    const horn = [90, 75, 60];
    p.ellipse(31, 38, 15, 11, cream);
    p.rect(20, 46, 4, 9, dark); p.rect(20, 53, 4, 2, [40, 40, 40]);
    p.rect(27, 47, 4, 9, cream); p.rect(27, 54, 4, 2, [40, 40, 40]);
    p.rect(38, 47, 4, 9, cream); p.rect(38, 54, 4, 2, [40, 40, 40]);
    p.rect(44, 46, 4, 9, dark); p.rect(44, 53, 4, 2, [40, 40, 40]);
    p.circle(44, 26, 10, cream);
    p.ellipse(49, 29, 5, 4, dark);
    // Beard
    p.polygon([[47, 33], [49, 40], [51, 33]], cream);
    // Backwards curved horns
    p.line(41, 18, 33, 9, horn, 3);
    p.line(45, 17, 39, 8, horn, 3);
    p.drawEye(44, 24, [220, 180, 40]);
  },

  monkey: (p) => {
    const brown = [140, 95, 65];
    const tan = [230, 190, 155];
    p.ellipse(32, 38, 13, 11, brown);
    p.ellipse(36, 39, 7, 7, tan);
    p.rect(21, 46, 4, 8, brown);
    p.rect(27, 47, 4, 8, brown);
    p.rect(38, 47, 4, 8, brown);
    p.rect(44, 46, 4, 8, brown);
    // Long curling prehensile tail
    p.line(19, 40, 10, 32, brown, 3);
    p.line(10, 32, 12, 22, brown, 3);
    p.circle(14, 21, 2, brown);
    // Head with big round ears
    p.circle(43, 26, 9, brown);
    p.circle(36, 24, 4, tan);
    p.circle(49, 24, 4, tan);
    p.ellipse(44, 27, 6, 5, tan);
    p.drawEye(42, 24, [30, 20, 10]);
    p.drawEye(46, 24, [30, 20, 10]);
  },

  deer: (p) => {
    const tan = [165, 120, 85];
    const light = [210, 165, 125];
    const white = [250, 245, 240];
    const antler = [235, 220, 195];
    p.ellipse(30, 38, 15, 10, tan);
    // White spots on flank
    p.circle(26, 36, 1, white); p.circle(32, 35, 1, white); p.circle(29, 39, 1, white);
    // Long graceful legs
    p.rect(19, 46, 3, 11, tan);
    p.rect(25, 47, 3, 11, tan);
    p.rect(37, 47, 3, 11, tan);
    p.rect(43, 46, 3, 11, tan);
    // Short white flash tail
    p.circle(16, 38, 3, white);
    // Slender neck & head
    p.line(36, 37, 43, 24, tan, 4);
    p.ellipse(45, 22, 6, 5, tan);
    p.ellipse(49, 23, 4, 3, white);
    p.set(51, 23, [20, 20, 20]);
    // Large deer ears
    p.polygon([[41, 17], [38, 11], [43, 15]], tan);
    // Branching antlers!
    p.line(43, 16, 42, 8, antler, 2);
    p.line(42, 11, 46, 7, antler, 2);
    p.drawEye(44, 20, [30, 20, 15]);
  },

  rabbit: (p) => {
    const white = [245, 240, 235];
    const shade = [210, 200, 190];
    const pink = [245, 165, 180];
    p.ellipse(30, 40, 14, 11, white);
    p.ellipse(30, 44, 13, 6, shade);
    // Paws & round fluff tail
    p.circle(16, 42, 4, white); // Powderpuff tail
    p.rect(24, 48, 6, 4, white);
    p.rect(34, 48, 6, 4, white);
    // Head
    p.circle(41, 32, 9, white);
    p.set(48, 33, pink); // Twitching nose
    // Long upright ears with pink interior
    p.ellipse(36, 17, 3, 9, white); p.ellipse(36, 17, 2, 7, pink);
    p.ellipse(43, 16, 3, 9, white); p.ellipse(43, 16, 2, 7, pink);
    p.drawEye(43, 30, [220, 40, 60]); // Cute ruby rabbit eye
  },

  sheep: (p) => {
    const wool = [240, 235, 225];
    const dark = [50, 45, 45];
    // Woolly cloud body puffs
    for (const [cx, cy, r] of [
      [24, 36, 8], [32, 33, 9], [39, 36, 8],
      [24, 42, 7], [32, 43, 8], [39, 42, 7]
    ]) {
      p.circle(cx, cy, r, wool);
    }
    // Black little legs
    p.rect(21, 47, 4, 8, dark);
    p.rect(27, 48, 4, 8, dark);
    p.rect(36, 48, 4, 8, dark);
    p.rect(42, 47, 4, 8, dark);
    // Black sheep face
    p.circle(46, 28, 7, dark);
    p.ellipse(50, 30, 4, 3, dark);
    p.circle(45, 22, 3, wool); // Wool puff on head
    // Drooping black ears
    p.ellipse(42, 26, 4, 2, dark);
    p.drawEye(46, 26, [240, 220, 80]);
  },

  capybara: (p) => {
    const brown = [145, 115, 85];
    const dark = [95, 75, 55];
    // Sturdy rounded rectangular body
    p.ellipse(31, 39, 17, 12, brown);
    p.ellipse(32, 43, 16, 7, dark);
    p.rect(19, 46, 5, 7, dark);
    p.rect(26, 47, 5, 7, brown);
    p.rect(38, 47, 5, 7, brown);
    p.rect(45, 46, 5, 7, dark);
    // Characteristic blunt rectangular head
    p.rect(41, 22, 14, 11, brown);
    p.circle(41, 27, 6, brown);
    p.circle(42, 19, 3, dark); // Tiny round ear
    p.rect(53, 26, 3, 4, dark); // Blunt nose
    // Sleepy relaxed zen eye
    p.line(47, 24, 50, 24, [30, 20, 15], 2);
  },

  otter: (p) => {
    const brown = [115, 90, 75];
    const cream = [240, 230, 210];
    p.ellipse(30, 39, 15, 9, brown);
    p.ellipse(36, 38, 8, 7, cream);
    p.rect(20, 45, 4, 6, brown);
    p.rect(26, 46, 4, 6, brown);
    p.rect(38, 46, 4, 6, brown);
    p.rect(44, 45, 4, 6, brown);
    // Thick tapering rudder tail
    p.polygon([[18, 41], [6, 45], [16, 45]], brown);
    // Rounded cute head with cream throat
    p.circle(45, 28, 8, brown);
    p.ellipse(47, 30, 5, 4, cream);
    p.circle(43, 22, 2, brown);
    p.set(50, 29, [30, 20, 20]);
    p.drawEye(45, 26, [30, 20, 15]);
  },

  cormorant: (p) => {
    const dark = [50, 60, 70];
    const throat = [240, 190, 40];
    p.ellipse(31, 37, 14, 10, dark);
    p.polygon([[22, 34], [35, 34], [25, 44]], [35, 45, 55]);
    p.polygon([[20, 39], [11, 45], [19, 43]], dark);
    p.line(29, 46, 29, 52, [40, 45, 50], 2);
    // Long snaky neck
    p.line(36, 37, 43, 23, dark, 4);
    p.circle(44, 22, 6, dark);
    // Hooked bill & throat pouch
    p.polygon([[47, 21], [58, 24], [57, 27], [47, 25]], [180, 170, 140]);
    p.polygon([[46, 25], [52, 26], [47, 29]], throat);
    p.drawEye(43, 20, [80, 220, 160]);
  },

  penguin: (p) => {
    const black = [35, 40, 48];
    const white = [250, 250, 255];
    const orange = [245, 140, 20];
    // Standing upright penguin body
    p.ellipse(32, 36, 12, 15, black);
    p.ellipse(34, 37, 8, 12, white);
    // Flipper wings
    p.polygon([[23, 29], [20, 42], [25, 38]], black);
    // Feet
    p.rect(26, 49, 6, 3, orange);
    p.rect(35, 49, 6, 3, orange);
    // Head & Beak
    p.circle(35, 21, 8, black);
    p.circle(38, 20, 4, [245, 200, 30]); // Yellow cheek flash
    p.polygon([[40, 21], [49, 23], [40, 25]], orange);
    p.drawEye(36, 19, [20, 20, 20]);
  },

  turtle: (p) => {
    const green = [90, 130, 75];
    const shell = [120, 95, 60];
    const scute = [75, 60, 35];
    // Domed patterned carapace
    p.ellipse(32, 37, 16, 11, shell);
    p.ellipse(32, 43, 15, 4, [170, 145, 95]);
    // Shell pattern scutes
    p.circle(32, 35, 4, scute);
    p.circle(24, 37, 3, scute);
    p.circle(40, 37, 3, scute);
    // Stumpy legs
    p.rect(20, 45, 6, 6, green);
    p.rect(38, 45, 6, 6, green);
    // Little tail
    p.polygon([[17, 41], [12, 42], [17, 44]], green);
    // Wrinkled head
    p.ellipse(47, 33, 7, 5, green);
    p.drawEye(47, 31, [30, 25, 20]);
  },

  crocodile: (p) => {
    const green = [80, 110, 70];
    const dark = [45, 65, 40];
    const yellow = [240, 210, 50];
    // Low scaly body
    p.ellipse(28, 42, 17, 7, green);
    // Back ridges
    for (let x = 16; x <= 36; x += 4) {
      p.polygon([[x, 36], [x + 2, 32], [x + 4, 36]], dark);
    }
    // Short splayed legs
    p.rect(16, 46, 5, 5, dark);
    p.rect(35, 46, 5, 5, dark);
    // Long powerful tail
    p.polygon([[15, 42], [3, 44], [15, 46]], green);
    // Long toothy snout
    p.polygon([[38, 38], [57, 40], [56, 45], [38, 45]], green);
    p.set(51, 45, [255, 255, 255]); // Sharp white tooth
    p.set(46, 45, [255, 255, 255]);
    // Cold reptilian eye
    p.set(42, 36, yellow); p.set(42, 37, [10, 10, 10]);
  },

  bat: (p) => {
    const purple = [75, 65, 95];
    const wing = [45, 40, 60];
    // Small body
    p.ellipse(32, 34, 7, 10, purple);
    // Wide leathery scalloped wings
    p.polygon([[27, 28], [7, 20], [12, 42], [26, 36]], wing);
    p.polygon([[37, 28], [57, 20], [52, 42], [38, 36]], wing);
    // Little feet
    p.rect(29, 43, 2, 4, purple);
    p.rect(33, 43, 2, 4, purple);
    // Head with huge pointy ears
    p.circle(32, 23, 6, purple);
    p.polygon([[27, 19], [25, 9], [30, 17]], purple);
    p.polygon([[34, 17], [39, 9], [37, 19]], purple);
    p.polygon([[27, 17], [26, 12], [29, 16]], [190, 120, 140]);
    p.drawEye(30, 23, [240, 40, 50]);
    p.drawEye(34, 23, [240, 40, 50]);
  },

  spider: (p) => {
    const dark = [55, 50, 60];
    const mark = [210, 40, 40];
    // Bulbous round abdomen & cephalothorax
    p.circle(28, 35, 9, dark);
    p.circle(41, 35, 6, dark);
    // Red hourglass mark
    p.polygon([[26, 32], [30, 32], [28, 35]], mark);
    p.polygon([[28, 35], [30, 38], [26, 38]], mark);
    // 8 spindly jointed legs
    for (const [x0, y0, xm, ym, x1, y1] of [
      [36, 33, 30, 20, 22, 17], [38, 33, 36, 18, 34, 15],
      [40, 33, 46, 18, 48, 15], [42, 33, 52, 20, 58, 17],
      [36, 37, 28, 46, 20, 52], [38, 37, 34, 48, 32, 53],
      [40, 37, 44, 48, 46, 53], [42, 37, 50, 46, 56, 52]
    ]) {
      p.line(x0, y0, xm, ym, dark, 2);
      p.line(xm, ym, x1, y1, dark, 2);
    }
    // Glistening red spider eyes
    p.set(45, 34, [240, 50, 50]);
    p.set(45, 36, [240, 50, 50]);
  },

  squirrel: (p) => {
    const rust = [185, 105, 55];
    const cream = [245, 235, 215];
    p.ellipse(31, 39, 11, 10, rust);
    p.ellipse(34, 40, 6, 7, cream);
    p.rect(26, 47, 5, 5, rust);
    p.rect(34, 47, 5, 5, rust);
    // Massive fluffy curving tail held high!
    p.polygon([[23, 40], [13, 32], [9, 16], [18, 12], [25, 22], [23, 32]], rust);
    p.polygon([[13, 32], [11, 18], [17, 14]], cream);
    // Head & Paws holding acorn
    p.circle(41, 30, 8, rust);
    p.circle(38, 22, 3, rust);
    p.circle(44, 22, 3, rust);
    // Cute acorn in hands!
    p.rect(42, 38, 4, 4, [110, 70, 40]);
    p.rect(41, 37, 6, 2, [70, 45, 25]);
    p.drawEye(43, 28, [30, 20, 15]);
  },

  badger: (p) => {
    const gray = [90, 85, 80];
    const dark = [40, 35, 35];
    const white = [245, 245, 245];
    p.ellipse(31, 39, 16, 11, gray);
    p.ellipse(31, 43, 15, 6, dark);
    p.rect(19, 46, 5, 7, dark);
    p.rect(26, 47, 5, 7, dark);
    p.rect(38, 47, 5, 7, dark);
    p.rect(45, 46, 5, 7, dark);
    // Head with bold black and white stripes!
    p.circle(45, 27, 9, white);
    p.line(40, 22, 48, 22, dark, 3);
    p.line(40, 27, 52, 27, dark, 3);
    p.circle(39, 18, 2, white);
    p.set(53, 29, [20, 20, 20]);
    p.drawEye(46, 25, [240, 240, 240]);
  },

  raccoonDog: (p) => {
    const tan = [150, 125, 95];
    const dark = [55, 45, 35];
    const cream = [235, 220, 195];
    p.ellipse(31, 38, 16, 12, tan);
    p.ellipse(36, 40, 9, 8, cream); // Round tanuki belly
    p.rect(20, 46, 5, 7, dark);
    p.rect(27, 47, 5, 7, tan);
    p.rect(38, 47, 5, 7, tan);
    p.rect(44, 46, 5, 7, dark);
    // Thick bushy tail
    p.line(18, 38, 8, 34, tan, 5);
    p.circle(8, 34, 3, dark);
    // Round face with dark mask patches
    p.circle(44, 27, 10, tan);
    p.ellipse(43, 26, 4, 3, dark);
    p.ellipse(49, 26, 4, 3, dark);
    p.circle(38, 18, 3, dark);
    p.circle(48, 18, 3, dark);
    p.ellipse(47, 30, 4, 3, cream);
    p.set(49, 29, [20, 20, 20]);
    p.drawEye(43, 25, [240, 240, 240]);
  }
};

async function generateHound(outDir) {
  const houndSrc = path.join(__dirname, '..', 'assets', 'pets', 'png', 'hound_animations_64x64.png');
  const buffer = await sharp(houndSrc)
    .extract({ left: 0, top: 0, width: 64, height: 64 })
    .png({ palette: true })
    .toBuffer();
  fs.writeFileSync(path.join(outDir, 'hound.png'), buffer);
  console.log('Crafted hound.png from official 64x64 pixel art master!');
}

async function generateSpecies(species, outDir) {
  const p = new PixelArt(64, 64);
  const gen = GENERATORS[species];
  if (!gen) {
    throw new Error(`No generator found for species: ${species}`);
  }
  gen(p);
  p.applyOutline([28, 22, 20]); // Clean retro outline

  const buf = await p.toBuffer();
  fs.writeFileSync(path.join(outDir, `${species}.png`), buf);
  console.log(`Crafted ${species}.png (64x64 authentic dot art, ${buf.length} bytes)`);
}

async function main() {
  const outDir = path.join(__dirname, '..', 'assets', 'pets', 'png');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const speciesList = [
    'hound', 'wolf', 'bear', 'tiger', 'leopard',
    'bird', 'eagle', 'owl', 'crow', 'kite',
    'cat', 'fox', 'weasel', 'lynx', 'snake',
    'pack', 'horse', 'ox', 'camel', 'alpaca',
    'dog', 'raccoon', 'boar', 'goat', 'monkey',
    'deer', 'rabbit', 'sheep', 'capybara', 'golden',
    'otter', 'cormorant', 'penguin', 'turtle', 'crocodile',
    'bat', 'spider', 'squirrel', 'badger', 'raccoonDog'
  ];

  console.log(`Generating 40 genuine 64x64 pixel art pets...`);
  for (const s of speciesList) {
    if (s === 'hound') {
      await generateHound(outDir);
    } else {
      await generateSpecies(s, outDir);
    }
  }

  console.log('All 40 pixel art pets successfully created!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import Phaser from 'phaser';
import { HEROES, type Hero } from './art.meta';
import { TILE, type LevelTheme } from './levels';

/** All artwork is drawn in code: original shapes and colors, no image files. */
type G = Phaser.GameObjects.Graphics;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function star(g: G, cx: number, cy: number, r: number, color: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Math.Vector2(cx + rr * Math.cos(a), cy + rr * Math.sin(a)));
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
}

const RAINBOW = [0xff686b, 0xffd54a, 0x49d17d, 0x38bdf8, 0x7357ff];


function drawHero(g: G, c: Hero, pose: 'idle' | 'run1' | 'run2' | 'jump') {
  const { w, h } = c;
  const head = Math.round(w * 0.42);
  const headY = head + 2;
  // legs
  g.fillStyle(0x101936, 1);
  const legW = Math.round(w * 0.22);
  const legH = Math.round(h * 0.22);
  const legY = h - legH;
  const off = pose === 'run1' ? 3 : pose === 'run2' ? -3 : 0;
  if (pose === 'jump') {
    g.fillRoundedRect(w * 0.22, legY - 4, legW, legH, 3);
    g.fillRoundedRect(w * 0.56, legY - 2, legW, legH, 3);
  } else {
    g.fillRoundedRect(w * 0.22 + off, legY, legW, legH, 3);
    g.fillRoundedRect(w * 0.56 - off, legY, legW, legH, 3);
  }
  // body
  g.fillStyle(c.shirt, 1);
  g.fillRoundedRect(w * 0.14, headY + head * 0.7, w * 0.72, h - legH - headY - head * 0.7 + 3, 7);
  // arms
  g.fillStyle(c.skin, 1);
  const armY = headY + head * 0.9;
  if (pose === 'jump') {
    g.fillRoundedRect(0, armY - 8, w * 0.16, h * 0.2, 3);
    g.fillRoundedRect(w * 0.84, armY - 8, w * 0.16, h * 0.2, 3);
  } else {
    g.fillRoundedRect(1, armY, w * 0.15, h * 0.22, 3);
    g.fillRoundedRect(w * 0.85 - 1, armY, w * 0.15, h * 0.22, 3);
  }
  // head
  g.fillStyle(c.skin, 1);
  g.fillCircle(w / 2, headY, head);
  g.fillStyle(c.hair, 1);
  g.slice(w / 2, headY, head + 1, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
  g.fillPath();
  if (c.puffs) {
    g.fillCircle(w / 2 - head, headY - head * 0.6, head * 0.45);
    g.fillCircle(w / 2 + head, headY - head * 0.6, head * 0.45);
  } else {
    g.fillCircle(w / 2 + head * 0.5, headY - head * 0.8, head * 0.35);
  }
  // face
  g.fillStyle(0x101936, 1);
  g.fillCircle(w / 2 - head * 0.38, headY + head * 0.1, Math.max(1.6, head * 0.14));
  g.fillCircle(w / 2 + head * 0.38, headY + head * 0.1, Math.max(1.6, head * 0.14));
  g.lineStyle(2, 0x101936, 1);
  g.beginPath();
  g.arc(w / 2, headY + head * 0.3, head * 0.35, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
  g.strokePath();
}

export { HEROES };

export function makeTextures(scene: Phaser.Scene, theme: LevelTheme) {
  for (const hero of Object.values(HEROES)) {
    for (const pose of ['idle', 'run1', 'run2', 'jump'] as const) {
      tex(scene, `${hero.key}-${pose}`, hero.w, hero.h, (g) => drawHero(g, hero, pose));
    }
  }
  const T = TILE;
  // Tiles are themed, so key them by theme colors.
  const k = (name: string) => `${name}-${theme.ground.toString(16)}`;
  tex(scene, k('ground'), T, T, (g) => {
    g.fillStyle(theme.ground, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x000000, 0.12);
    g.fillCircle(8, 12, 3);
    g.fillCircle(22, 22, 4);
    g.fillCircle(14, 27, 2);
  });
  tex(scene, k('groundtop'), T, T, (g) => {
    g.fillStyle(theme.ground, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(theme.groundTop, 1);
    g.fillRect(0, 0, T, 10);
    for (let x = 0; x < T; x += 8) g.fillTriangle(x, 10, x + 8, 10, x + 4, 15);
    g.fillStyle(0x000000, 0.12);
    g.fillCircle(10, 22, 3);
    g.fillCircle(24, 26, 2);
  });
  tex(scene, k('block'), T, T, (g) => {
    g.fillStyle(theme.block, 1);
    g.fillRoundedRect(1, 1, T - 2, T - 2, 6);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(4, 4, T - 8, 6, 3);
    g.lineStyle(2, 0x000000, 0.25);
    g.strokeRoundedRect(1, 1, T - 2, T - 2, 6);
  });
  tex(scene, 'breakable', T, T, (g) => {
    g.fillStyle(0xf4a261, 1);
    g.fillRoundedRect(1, 1, T - 2, T - 2, 5);
    g.lineStyle(2, 0x8d4f1f, 1);
    g.beginPath();
    g.moveTo(6, 8);
    g.lineTo(14, 16);
    g.lineTo(10, 24);
    g.moveTo(20, 4);
    g.lineTo(18, 14);
    g.lineTo(26, 20);
    g.strokePath();
    g.strokeRoundedRect(1, 1, T - 2, T - 2, 5);
  });
  tex(scene, 'surprise', T, T, (g) => {
    g.fillStyle(0x7357ff, 1);
    g.fillRoundedRect(1, 1, T - 2, T - 2, 7);
    star(g, T / 2, T / 2 + 1, 11, 0xffd54a);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRoundedRect(2, 2, T - 4, T - 4, 6);
  });
  tex(scene, 'used', T, T, (g) => {
    g.fillStyle(0x6b7280, 1);
    g.fillRoundedRect(1, 1, T - 2, T - 2, 7);
    g.fillStyle(0x9ca3af, 1);
    g.fillCircle(T / 2, T / 2, 4);
  });
  tex(scene, 'spring', T, T, (g) => {
    g.lineStyle(4, 0x9ca3af, 1);
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      g.moveTo(6, 30 - i * 5);
      g.lineTo(26, 28 - i * 5);
    }
    g.strokePath();
    g.fillStyle(0xff686b, 1);
    g.fillRoundedRect(2, 6, T - 4, 8, 4);
  });
  tex(scene, 'flag-off', T, 64, (g) => {
    g.fillStyle(0xe5e7eb, 1);
    g.fillRect(4, 2, 4, 62);
    g.fillStyle(0x9ca3af, 1);
    g.fillTriangle(8, 4, 30, 12, 8, 20);
  });
  tex(scene, 'flag-on', T, 64, (g) => {
    g.fillStyle(0xe5e7eb, 1);
    g.fillRect(4, 2, 4, 62);
    RAINBOW.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRect(8, 4 + i * 4, 22 - i * 3, 4);
    });
  });
  tex(scene, 'gate', 64, 96, (g) => {
    RAINBOW.forEach((c, i) => {
      g.lineStyle(7, c, 1);
      g.beginPath();
      g.arc(32, 60, 28 - i * 6, Math.PI, 0, false);
      g.strokePath();
    });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 60, 8, 36);
    g.fillRect(56, 60, 8, 36);
    star(g, 32, 50, 9, 0xffd54a);
  });
  tex(scene, 'star', 22, 22, (g) => star(g, 11, 11, 10, 0xffd54a));
  tex(scene, 'crystal', 24, 32, (g) => {
    const cols = [0xff686b, 0xffd54a, 0x49d17d, 0x38bdf8];
    g.fillStyle(0x7357ff, 1);
    g.fillPoints([new Phaser.Math.Vector2(12, 0), new Phaser.Math.Vector2(24, 12), new Phaser.Math.Vector2(12, 32), new Phaser.Math.Vector2(0, 12)], true);
    cols.forEach((c, i) => {
      g.fillStyle(c, 0.85);
      g.fillTriangle(12, 2 + i * 3, 20 - i * 2, 12, 12, 28 - i * 4);
    });
    g.fillStyle(0xffffff, 0.8);
    g.fillTriangle(12, 3, 6, 12, 10, 12);
  });
  const bug = (key: string, body: number, happy: boolean) =>
    tex(scene, key, 32, 26, (g) => {
      g.fillStyle(body, 1);
      g.fillEllipse(16, 15, 30, 22);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10, 12, 5);
      g.fillCircle(22, 12, 5);
      g.fillStyle(0x101936, 1);
      g.fillCircle(10, 13, 2.5);
      g.fillCircle(22, 13, 2.5);
      g.lineStyle(2, 0x101936, 1);
      g.beginPath();
      if (happy) {
        g.arc(16, 17, 5, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
      } else {
        g.moveTo(5, 5);
        g.lineTo(13, 8);
        g.moveTo(27, 5);
        g.lineTo(19, 8);
        g.moveTo(12, 21);
        g.lineTo(20, 21);
      }
      g.strokePath();
      g.fillStyle(0x101936, 1);
      g.fillEllipse(9, 25, 8, 3);
      g.fillEllipse(23, 25, 8, 3);
    });
  bug('bug', 0x64748b, false);
  bug('bug-happy', 0xf9a8d4, true);
  const puff = (key: string, body: number, happy: boolean) =>
    tex(scene, key, 36, 28, (g) => {
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(6, 10, 12, 16);
      g.fillEllipse(30, 10, 12, 16);
      g.fillStyle(body, 1);
      g.fillCircle(18, 15, 12);
      g.fillStyle(0x101936, 1);
      g.fillCircle(14, 13, 2);
      g.fillCircle(22, 13, 2);
      g.lineStyle(2, 0x101936, 1);
      g.beginPath();
      if (happy) g.arc(18, 17, 4, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
      else {
        g.moveTo(14, 20);
        g.lineTo(22, 20);
      }
      g.strokePath();
    });
  puff('puff', 0x8b5cf6, false);
  puff('puff-happy', 0xfde047, true);
  const cloud = (key: string, body: number, happy: boolean) =>
    tex(scene, key, 128, 84, (g) => {
      g.fillStyle(body, 1);
      g.fillCircle(36, 46, 28);
      g.fillCircle(64, 34, 32);
      g.fillCircle(94, 46, 28);
      g.fillRoundedRect(14, 44, 100, 34, 17);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(50, 44, 9);
      g.fillCircle(78, 44, 9);
      g.fillStyle(0x101936, 1);
      g.fillCircle(50, 46, 4);
      g.fillCircle(78, 46, 4);
      g.lineStyle(4, 0x101936, 1);
      g.beginPath();
      if (happy) g.arc(64, 56, 12, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
      else {
        g.arc(64, 70, 10, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
        // Sad (not angry) eyebrows.
        g.moveTo(40, 36);
        g.lineTo(56, 30);
        g.moveTo(88, 36);
        g.lineTo(72, 30);
      }
      g.strokePath();
      if (happy) RAINBOW.forEach((c, i) => {
        g.fillStyle(c, 1);
        g.fillRect(30 + i * 14, 76, 12, 8);
      });
    });
  cloud('cloud-boss', 0x94a3b8, false);
  cloud('cloud-happy', 0xe0f2fe, true);
  tex(scene, 'drop', 12, 16, (g) => {
    g.fillStyle(0x93c5fd, 1);
    g.fillTriangle(6, 0, 12, 10, 0, 10);
    g.fillCircle(6, 10, 6);
  });
  tex(scene, k('platform'), 96, 16, (g) => {
    g.fillStyle(theme.block, 1);
    g.fillRoundedRect(0, 0, 96, 16, 8);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(4, 2, 88, 4, 2);
  });
  const power = (key: string, color: number, draw: (g: G) => void) =>
    tex(scene, `pu-${key}`, 28, 28, (g) => {
      g.fillStyle(color, 1);
      g.fillCircle(14, 14, 13);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeCircle(14, 14, 13);
      draw(g);
    });
  power('shield', 0x7357ff, (g) => RAINBOW.forEach((c, i) => {
    g.lineStyle(2, c, 1);
    g.strokeCircle(14, 14, 9 - i * 1.5);
  }));
  power('boots', 0xff686b, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(9, 7, 7, 10);
    g.fillRoundedRect(9, 14, 13, 6, 3);
  });
  power('superjump', 0x49d17d, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(14, 5, 22, 14, 6, 14);
    g.fillRect(11, 14, 6, 9);
  });
  power('magnet', 0x38bdf8, (g) => {
    g.lineStyle(5, 0xffffff, 1);
    g.beginPath();
    g.arc(14, 13, 6, 0, Math.PI, false);
    g.strokePath();
    g.fillStyle(0xff686b, 1);
    g.fillRect(6, 7, 5, 6);
    g.fillRect(17, 7, 5, 6);
  });
  power('heart', 0xff686b, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 11, 5);
    g.fillCircle(18, 11, 5);
    g.fillTriangle(5, 13, 23, 13, 14, 23);
  });
  power('flight', 0xffd54a, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(9, 14, 10, 16);
    g.fillEllipse(19, 14, 10, 16);
  });
  tex(scene, 'heart', 20, 18, (g) => {
    g.fillStyle(0xff686b, 1);
    g.fillCircle(6, 6, 6);
    g.fillCircle(14, 6, 6);
    g.fillTriangle(0, 8, 20, 8, 10, 18);
  });
  tex(scene, 'heart-empty', 20, 18, (g) => {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(6, 6, 6);
    g.fillCircle(14, 6, 6);
    g.fillTriangle(0, 8, 20, 8, 10, 18);
  });
  tex(scene, 'spark', 8, 8, (g) => star(g, 4, 4, 4, 0xffffff));
  tex(scene, 'shield-ring', 64, 64, (g) => RAINBOW.forEach((c, i) => {
    g.lineStyle(3, c, 0.8);
    g.strokeCircle(32, 32, 30 - i * 3);
  }));
  // Backgrounds
  tex(scene, k('sky'), 64, 480, (g) => {
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(theme.skyTop),
        Phaser.Display.Color.ValueToColor(theme.skyBottom),
        steps - 1,
        i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (480 / steps) * i, 64, 480 / steps + 1);
    }
  });
  tex(scene, k('hills'), 1024, 260, (g) => {
    g.fillStyle(theme.hill, 1);
    for (let x = 0; x < 1024; x += 256) g.fillEllipse(x + 128, 260, 360, 300);
    g.fillStyle(theme.hillDark, 1);
    for (let x = -128; x < 1024; x += 256) g.fillEllipse(x + 128, 280, 300, 200);
  });
  tex(scene, k('decor'), 512, 140, (g) => {
    if (theme.decor === 'flowers') {
      for (let i = 0; i < 12; i++) {
        const x = 20 + i * 42;
        g.fillStyle(0x16a34a, 1);
        g.fillRect(x, 110, 3, 30);
        g.fillStyle(RAINBOW[i % RAINBOW.length], 1);
        for (let p = 0; p < 5; p++) g.fillCircle(x + 1 + Math.cos(p * 1.26) * 6, 108 + Math.sin(p * 1.26) * 6, 5);
        g.fillStyle(0xffd54a, 1);
        g.fillCircle(x + 1, 108, 4);
      }
    } else if (theme.decor === 'trees') {
      for (let i = 0; i < 4; i++) {
        const x = 64 + i * 128;
        g.fillStyle(0x7c4a2d, 1);
        g.fillRect(x - 8, 70, 16, 70);
        g.fillStyle(i % 2 ? 0x15803d : 0x16a34a, 1);
        g.fillCircle(x, 56, 44);
        g.fillCircle(x - 30, 76, 28);
        g.fillCircle(x + 30, 76, 28);
        g.fillStyle(0xfde047, 0.7);
        g.fillCircle(x - 14, 40, 3);
        g.fillCircle(x + 18, 66, 3);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const x = 30 + i * 64;
        const h = 40 + ((i * 37) % 70);
        g.fillStyle(RAINBOW[(i + 2) % RAINBOW.length], 0.75);
        g.fillPoints([new Phaser.Math.Vector2(x, 140), new Phaser.Math.Vector2(x + 12, 140 - h), new Phaser.Math.Vector2(x + 24, 140)], true);
        g.fillStyle(0xffffff, 0.4);
        g.fillTriangle(x + 6, 140, x + 12, 140 - h, x + 12, 140);
      }
    }
  });
  return { ground: k('ground'), groundTop: k('groundtop'), block: k('block'), platform: k('platform'), sky: k('sky'), hills: k('hills'), decor: k('decor') };
}

import Phaser from 'phaser';
import type { Difficulty } from '../../data/types';
import type { GameInput } from '../shared/input';
import { HEROES, makeTextures } from './art';
import { ROWS, TILE, levelObjects, type LevelData, type PowerUpKind } from './levels';
import {
  BOSS_HITS,
  DASH_MS,
  DASH_SPEED,
  DIFFICULTY_RULES,
  GENTLE,
  GRAVITY,
  HERO_STATS,
  HURT_GRACE_MS,
  POWER_UP_MS,
  POWER_UP_NAMES,
  SHIELD_MS,
  SPRING_VELOCITY,
  canDoubleJump,
  formatTime,
  pick,
  type FinishInput,
  type HeroId,
  type ResumePoint,
} from './rules';
import type { Sound } from './sfx';

export const VIEW_W = 960;
export const VIEW_H = ROWS * TILE;

export interface SceneConfig {
  level: LevelData;
  hero: HeroId;
  difficulty: Difficulty;
  reducedMotion: boolean;
  input: GameInput;
  sound: Sound;
  resume?: ResumePoint;
  testHooks: boolean;
  onFinish: (r: FinishInput & { achievements: string[] }) => void;
  onPause: () => void;
  onCheckpoint: (r: ResumePoint) => void;
}

type ArcadeBody = Phaser.Physics.Arcade.Body;
type ArcadeImage = Phaser.Physics.Arcade.Image;
type ArcadeSprite = Phaser.Physics.Arcade.Sprite;

const SOLID = '#=B?^';
const FONT = 'Fredoka, "Trebuchet MS", sans-serif';

export interface SceneState {
  level: string;
  hero: HeroId;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  onGround: boolean;
  hearts: number;
  stars: number;
  starsTotal: number;
  crystal: boolean;
  secret: boolean;
  powers: string[];
  bossHits: number;
  gateOpen: boolean;
  finished: boolean;
  respawns: number;
  boss: { x: number; y: number; visible: boolean; alpha: number; depth: number } | null;
  drops: number;
}

export class LevelScene extends Phaser.Scene {
  private cfg!: SceneConfig;
  private grid: string[][] = [];
  private player!: ArcadeSprite;
  private shieldRing!: Phaser.GameObjects.Image;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private breakables!: Phaser.Physics.Arcade.StaticGroup;
  private surprises!: Phaser.Physics.Arcade.StaticGroup;
  private springs!: Phaser.Physics.Arcade.StaticGroup;
  private movers!: Phaser.Physics.Arcade.Group;
  private stars!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drops!: Phaser.Physics.Arcade.Group;
  private gate?: ArcadeImage;
  private boss?: ArcadeImage;
  private bg: Phaser.GameObjects.TileSprite[] = [];
  private hud!: {
    hearts: Phaser.GameObjects.Image[];
    stars: Phaser.GameObjects.Text;
    crystal: Phaser.GameObjects.Image;
    power: Phaser.GameObjects.Text;
    special: Phaser.GameObjects.Text;
    timer: Phaser.GameObjects.Text;
    banner: Phaser.GameObjects.Text;
  };

  private maxHearts = 3;
  private hearts = 3;
  private collected = new Set<string>();
  private starsTotal = 0;
  private crystal = false;
  private secret = false;
  private elapsedMs = 0;
  private checkpoint = { x: 0, y: 0 };
  private powers = new Map<PowerUpKind, number>();
  private specialReadyAt = 0;
  private shieldUntil = 0;
  private dashUntil = 0;
  private dashDir = 1;
  private invulnUntil = 0;
  private jumps = 0;
  private lastGroundAt = 0;
  private cutJump = true;
  private facing = 1;
  private bossHits = 0;
  private bossGraceUntil = 0;
  private bossActive = false;
  private nextDropAt = 0;
  private gateOpen = true;
  private finished = false;
  private respawns = 0;
  private achievements = new Set<string>();
  private bannerTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('level');
  }

  init(cfg: SceneConfig) {
    this.cfg = cfg;
    const rules = DIFFICULTY_RULES[cfg.difficulty];
    this.maxHearts = rules.hearts;
    this.hearts = rules.hearts;
    this.collected = new Set(cfg.resume?.collected ?? []);
    this.crystal = !!cfg.resume?.crystal;
    this.secret = !!cfg.resume?.secret;
    this.elapsedMs = cfg.resume?.elapsedMs ?? 0;
    this.powers = new Map();
    this.specialReadyAt = this.shieldUntil = this.dashUntil = this.invulnUntil = 0;
    this.jumps = 0;
    this.bossHits = 0;
    this.bossActive = false;
    this.finished = false;
    this.respawns = 0;
    this.achievements = new Set();
    this.bg = [];
    this.grid = cfg.level.rows.map((r) => [...r]);
  }

  private get rules() {
    return DIFFICULTY_RULES[this.cfg.difficulty];
  }

  private now() {
    return this.time.now;
  }

  private solidAt(tx: number, ty: number) {
    if (ty >= ROWS) return false;
    return SOLID.includes(this.grid[ty]?.[tx] ?? '.');
  }

  create() {
    const { level } = this.cfg;
    const keys = makeTextures(this, level.theme);
    const W = level.rows[0].length * TILE;
    const H = VIEW_H;
    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(0, -400, W, H + 800, true, true, false, false);
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor(level.theme.skyBottom);

    // Parallax background.
    this.bg = [
      this.add.tileSprite(0, 0, VIEW_W, H, keys.sky).setOrigin(0).setScrollFactor(0),
      this.add.tileSprite(0, H - 260, VIEW_W, 260, keys.hills).setOrigin(0).setScrollFactor(0).setAlpha(0.9),
      this.add.tileSprite(0, 12 * TILE - 136, VIEW_W, 140, keys.decor).setOrigin(0).setScrollFactor(0),
    ];

    // Static terrain as a tilemap (ground, grassy top, solid blocks).
    const tsKey = `tiles-${level.theme.ground.toString(16)}`;
    if (!this.textures.exists(tsKey)) {
      const canvas = this.textures.createCanvas(tsKey, TILE * 3, TILE)!;
      [keys.ground, keys.groundTop, keys.block].forEach((k, i) => {
        canvas.context.drawImage(this.textures.get(k).getSourceImage() as CanvasImageSource, i * TILE, 0);
      });
      canvas.refresh();
    }
    const data = this.grid.map((row) => row.map(() => -1));
    this.grid.forEach((row, y) =>
      row.forEach((ch, x) => {
        if (ch === '#') data[y][x] = y === 0 || this.grid[y - 1][x] !== '#' ? 1 : 0;
        else if (ch === '=') data[y][x] = 2;
      }),
    );
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(tsKey, tsKey, TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tileset, 0, 0)!;
    this.layer.setCollision([0, 1, 2]);

    this.breakables = this.physics.add.staticGroup();
    this.surprises = this.physics.add.staticGroup();
    this.springs = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.stars = this.physics.add.group({ allowGravity: false, immovable: true });
    this.powerups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.physics.add.group();
    this.drops = this.physics.add.group({ allowGravity: false });
    const checkpoints = this.physics.add.staticGroup();
    const secrets: Phaser.GameObjects.Zone[] = [];
    let crystalImg: ArcadeImage | undefined;

    const surprises = [...level.surprises];
    const objs = levelObjects(level).sort((a, b) => a.x - b.x || a.y - b.y);
    let start = { x: 2 * TILE + 16, y: 11 * TILE };
    const cx = (x: number) => x * TILE + TILE / 2;
    const cy = (y: number) => y * TILE + TILE / 2;
    const bottom = (y: number) => (y + 1) * TILE;
    this.starsTotal = 0;

    for (const o of objs) {
      switch (o.ch) {
        case 'P':
          start = { x: cx(o.x), y: bottom(o.y) - 24 };
          break;
        case 'B':
          this.breakables.create(cx(o.x), cy(o.y), 'breakable').setData('tile', [o.x, o.y]);
          break;
        case '?':
          this.surprises.create(cx(o.x), cy(o.y), 'surprise').setData({ kind: surprises.shift() ?? 'heart', used: false });
          break;
        case '^': {
          const s = this.springs.create(cx(o.x), cy(o.y), 'spring') as ArcadeImage;
          (s.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE, TILE - 8).setOffset(0, 8);
          break;
        }
        case 'o': {
          const id = `${o.x},${o.y}`;
          this.starsTotal++;
          if (this.collected.has(id)) break;
          const s = this.stars.create(cx(o.x), cy(o.y), 'star') as ArcadeImage;
          s.setData('id', id);
          if (!this.cfg.reducedMotion) this.tweens.add({ targets: s, scale: 1.15, yoyo: true, repeat: -1, duration: 600 });
          break;
        }
        case 'C':
          if (!this.crystal) {
            crystalImg = this.physics.add.image(cx(o.x), cy(o.y), 'crystal');
            (crystalImg.body as ArcadeBody).allowGravity = false;
            if (!this.cfg.reducedMotion) this.tweens.add({ targets: crystalImg, y: crystalImg.y - 6, yoyo: true, repeat: -1, duration: 900 });
          }
          break;
        case 'S': {
          const z = this.add.zone(cx(o.x), cy(o.y), TILE * 2, TILE * 2);
          this.physics.add.existing(z, true);
          secrets.push(z);
          break;
        }
        case 'K': {
          const k = checkpoints.create(cx(o.x), bottom(o.y), 'flag-off') as ArcadeImage;
          k.setOrigin(0.5, 1).refreshBody();
          break;
        }
        case 'G': {
          this.gate = this.physics.add.staticImage(cx(o.x), bottom(o.y), 'gate').setOrigin(0.5, 1);
          (this.gate.body as Phaser.Physics.Arcade.StaticBody).setSize(40, 90);
          this.gate.refreshBody();
          break;
        }
        case 'e': {
          const e = this.enemies.create(cx(o.x), bottom(o.y) - 13, 'bug') as ArcadeSprite;
          e.setData({ kind: 'walker', dir: -1 });
          (e.body as ArcadeBody).setSize(28, 22).setOffset(2, 4);
          break;
        }
        case 'f': {
          const e = this.enemies.create(cx(o.x), cy(o.y), 'puff') as ArcadeSprite;
          e.setData({ kind: 'flyer', ox: e.x, oy: e.y, phase: o.x });
          (e.body as ArcadeBody).allowGravity = false;
          (e.body as ArcadeBody).moves = false;
          (e.body as ArcadeBody).setSize(30, 22);
          break;
        }
        case 'M':
        case 'N': {
          const m = this.movers.create(cx(o.x), cy(o.y), keys.platform) as ArcadeImage;
          m.setData({ axis: o.ch === 'M' ? 'x' : 'y', ox: m.x, oy: m.y });
          const b = m.body as ArcadeBody;
          b.setFriction(1, 0);
          if (o.ch === 'M') b.setVelocityX(70);
          else b.setVelocityY(60);
          break;
        }
        case 'X': {
          this.boss = this.physics.add.image(cx(o.x), cy(o.y), 'cloud-boss');
          const b = this.boss.body as ArcadeBody;
          b.allowGravity = false;
          // Driven by code each frame, not by physics.
          b.moves = false;
          b.setSize(104, 56).setOffset(12, 16);
          this.boss.setData({ ox: this.boss.x });
          this.gateOpen = false;
          break;
        }
      }
    }
    if (this.gate && !this.gateOpen) this.gate.setVisible(false);
    if (this.boss && this.cfg.resume && this.cfg.resume.checkpoint.x > this.boss.x - 20 * TILE) {
      // Resuming in the boss cave: the cloud is still gloomy, so the fight starts again.
      this.bossHits = 0;
    }

    // Player
    const hero = HEROES[this.cfg.hero];
    this.checkpoint = this.cfg.resume?.checkpoint ?? start;
    this.player = this.physics.add.sprite(this.checkpoint.x, this.checkpoint.y, `${hero.key}-idle`);
    this.player.setCollideWorldBounds(true).setDepth(10);
    const pb = this.player.body as ArcadeBody;
    if (this.cfg.hero === 'afa') pb.setSize(20, 42).setOffset(4, 2);
    else pb.setSize(18, 26).setOffset(3, 2);
    pb.setMaxVelocityY(1000);
    this.shieldRing = this.add.image(0, 0, 'shield-ring').setDepth(11).setVisible(false);

    // Collisions
    const physics = this.physics;
    physics.add.collider(this.player, this.layer);
    physics.add.collider(this.player, this.movers);
    physics.add.collider(this.player, this.breakables, (_p, b) => this.hitBreakable(b as ArcadeImage));
    physics.add.collider(this.player, this.surprises, (_p, b) => this.hitSurprise(b as ArcadeImage));
    physics.add.collider(this.player, this.springs, (_p, s) => this.hitSpring(s as ArcadeImage));
    for (const g of [this.layer, this.breakables, this.surprises, this.springs, this.movers] as const) {
      physics.add.collider(this.enemies, g);
      physics.add.collider(this.drops, g, (d) => (d as ArcadeImage).destroy());
    }
    physics.add.overlap(this.player, this.stars, (_p, s) => this.collectStar(s as ArcadeImage));
    physics.add.overlap(this.player, this.powerups, (_p, u) => this.collectPower(u as ArcadeImage));
    physics.add.overlap(this.player, this.enemies, (_p, e) => this.touchEnemy(e as ArcadeSprite));
    physics.add.overlap(this.player, this.drops, (_p, d) => this.touchDrop(d as ArcadeImage));
    physics.add.overlap(this.player, checkpoints, (_p, k) => this.touchCheckpoint(k as ArcadeImage));
    if (crystalImg) physics.add.overlap(this.player, crystalImg, () => this.collectCrystal(crystalImg!));
    secrets.forEach((z) => physics.add.overlap(this.player, z, () => this.findSecret()));
    if (this.gate) physics.add.overlap(this.player, this.gate, () => this.reachGate());
    if (this.boss) physics.add.overlap(this.player, this.boss, () => this.touchBoss());

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 90);
    this.cameras.main.setRoundPixels(true);

    this.makeHud();
    this.showBanner(this.cfg.resume ? 'Welcome back! Let’s keep going.' : `World ${level.world}: ${level.name}`, 2200);
    this.cfg.sound.startMusic();

    if (this.cfg.testHooks) this.installTestHooks();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.cfg.testHooks) delete (window as unknown as { __afa?: unknown }).__afa;
    });
  }

  private makeHud() {
    const style = { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#14123a', strokeThickness: 5 };
    const hearts = Array.from({ length: this.maxHearts }, (_, i) =>
      this.add.image(20 + i * 26, 22, 'heart').setScrollFactor(0).setDepth(100),
    );
    this.add.image(20, 52, 'star').setScrollFactor(0).setDepth(100);
    const stars = this.add.text(36, 40, '', style).setScrollFactor(0).setDepth(100);
    const crystal = this.add.image(150, 52, 'crystal').setScale(0.7).setScrollFactor(0).setDepth(100);
    const power = this.add.text(VIEW_W / 2, 14, '', { ...style, fontSize: '20px' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    const special = this.add.text(VIEW_W - 12, 44, '', { ...style, fontSize: '18px' }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    const timer = this.add.text(VIEW_W - 12, 12, '', style).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    const banner = this.add
      .text(VIEW_W / 2, 110, '', { ...style, fontSize: '32px', align: 'center', wordWrap: { width: VIEW_W - 80 } })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    this.hud = { hearts, stars, crystal, power, special, timer, banner };
  }

  private showBanner(text: string, ms = 1800) {
    this.hud.banner.setText(text).setAlpha(1);
    this.bannerTimer?.remove();
    this.bannerTimer = this.time.delayedCall(ms, () => {
      if (this.cfg.reducedMotion) this.hud.banner.setAlpha(0);
      else this.tweens.add({ targets: this.hud.banner, alpha: 0, duration: 400 });
    });
  }

  private burst(x: number, y: number, n = 8) {
    if (this.cfg.reducedMotion) return;
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, 'spark').setDepth(12);
      const a = (Math.PI * 2 * i) / n;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, alpha: 0, duration: 450, onComplete: () => s.destroy() });
    }
  }

  private shielded() {
    const t = this.now();
    return this.shieldUntil > t || (this.powers.get('shield') ?? 0) > t;
  }

  private dashing() {
    return this.dashUntil > this.now();
  }

  private hasPower(k: PowerUpKind) {
    return (this.powers.get(k) ?? 0) > this.now();
  }

  // --- Interactions --------------------------------------------------------

  private hitBreakable(b: ArcadeImage) {
    const pb = this.player.body as ArcadeBody;
    if (!(pb.touching.up || this.dashing() || this.shielded())) return;
    const [tx, ty] = b.getData('tile') as [number, number];
    this.grid[ty][tx] = '.';
    this.burst(b.x, b.y, 6);
    b.destroy();
    this.cfg.sound.play('break');
  }

  private hitSurprise(b: ArcadeImage) {
    const pb = this.player.body as ArcadeBody;
    if (!pb.touching.up || b.getData('used')) return;
    b.setData('used', true).setTexture('used');
    const kind = b.getData('kind') as PowerUpKind;
    const u = this.powerups.create(b.x, b.y - TILE, `pu-${kind}`) as ArcadeImage;
    u.setData('kind', kind);
    if (!this.cfg.reducedMotion) {
      u.setScale(0.3);
      this.tweens.add({ targets: u, scale: 1, duration: 250 });
    }
    this.cfg.sound.play('bump');
  }

  private hitSpring(s: ArcadeImage) {
    const pb = this.player.body as ArcadeBody;
    if (!pb.touching.down) return;
    pb.setVelocityY(-SPRING_VELOCITY);
    this.jumps = 1;
    this.cutJump = false;
    this.cfg.sound.play('spring');
    if (!this.cfg.reducedMotion) this.tweens.add({ targets: s, scaleY: 0.6, yoyo: true, duration: 90 });
    if (!this.achievements.has('super-jumper')) {
      this.achievements.add('super-jumper');
      this.showBanner('Boing! Super Jumper!');
    }
  }

  private collectStar(s: ArcadeImage) {
    this.collected.add(s.getData('id'));
    this.burst(s.x, s.y, 5);
    s.destroy();
    this.cfg.sound.play('star');
  }

  private collectPower(u: ArcadeImage) {
    const kind = u.getData('kind') as PowerUpKind;
    u.destroy();
    this.cfg.sound.play('power');
    if (kind === 'heart') {
      this.hearts = Math.min(this.maxHearts, this.hearts + 1);
    } else {
      this.powers.set(kind, this.now() + POWER_UP_MS[kind]);
    }
    this.showBanner(POWER_UP_NAMES[kind] + '!', 1400);
  }

  private collectCrystal(c: ArcadeImage) {
    if (this.crystal) return;
    this.crystal = true;
    this.achievements.add('rainbow-collector');
    this.burst(c.x, c.y, 12);
    c.destroy();
    this.cfg.sound.play('crystal');
    this.showBanner('You found a Rainbow Crystal!', 2200);
  }

  private findSecret() {
    if (this.secret) return;
    this.secret = true;
    this.achievements.add('secret-discoverer');
    this.cfg.sound.play('checkpoint');
    this.showBanner('A secret place! Great exploring!', 2200);
  }

  private touchCheckpoint(k: ArcadeImage) {
    if (k.getData('on')) return;
    k.setData('on', true).setTexture('flag-on');
    this.checkpoint = { x: k.x, y: k.y - 30 };
    this.cfg.sound.play('checkpoint');
    this.showBanner('Checkpoint!', 1200);
    this.cfg.onCheckpoint(this.resumePoint());
  }

  resumePoint(): ResumePoint {
    return {
      levelId: this.cfg.level.id,
      hero: this.cfg.hero,
      checkpoint: { ...this.checkpoint },
      collected: [...this.collected],
      crystal: this.crystal,
      secret: this.secret,
      elapsedMs: Math.round(this.elapsedMs),
      savedAt: Date.now(),
    };
  }

  private cheer(e: ArcadeSprite) {
    const body = e.body as ArcadeBody;
    body.enable = false;
    e.setTexture(e.getData('kind') === 'walker' ? 'bug-happy' : 'puff-happy');
    this.cfg.sound.play('cheer');
    if (this.cfg.reducedMotion) this.time.delayedCall(600, () => e.destroy());
    else this.tweens.add({ targets: e, y: e.y - 60, alpha: 0, duration: 900, onComplete: () => e.destroy() });
  }

  private touchEnemy(e: ArcadeSprite) {
    const pb = this.player.body as ArcadeBody;
    const eb = e.body as ArcadeBody;
    if (pb.velocity.y > 0 && pb.bottom <= eb.top + 14) {
      this.cheer(e);
      pb.setVelocityY(-420);
      this.jumps = 1;
      return;
    }
    if (this.shielded() || this.dashing()) {
      this.cheer(e);
      return;
    }
    this.hurt(e.x);
  }

  private touchDrop(d: ArcadeImage) {
    d.destroy();
    if (!this.shielded()) this.hurt(d.x);
  }

  private touchBoss() {
    const boss = this.boss!;
    if (this.bossHits >= BOSS_HITS || this.bossGraceUntil > this.now()) return;
    const pb = this.player.body as ArcadeBody;
    const bb = boss.body as ArcadeBody;
    if (pb.velocity.y > 0 && pb.bottom <= bb.center.y) {
      this.bossHits++;
      this.bossGraceUntil = this.now() + 1000;
      pb.setVelocityY(-560);
      this.jumps = 1;
      this.cfg.sound.play('cheer');
      this.burst(boss.x, boss.y - 20, 10);
      boss.setAlpha(0.6);
      this.time.delayedCall(1000, () => boss.setAlpha(1));
      if (this.bossHits >= BOSS_HITS) this.cheerBoss();
      else this.showBanner(this.bossHits === 1 ? 'The cloud giggled!' : 'Almost smiling!', 1200);
      return;
    }
    if (pb.center.y > bb.center.y) {
      // Bumping it from below is harmless.
      pb.setVelocityY(150);
      return;
    }
    if (!this.shielded()) this.hurt(boss.x);
  }

  private cheerBoss() {
    const boss = this.boss!;
    this.bossHits = BOSS_HITS;
    this.bossActive = false;
    boss.setTexture('cloud-happy').setAlpha(1);
    (boss.body as ArcadeBody).enable = false;
    this.drops.clear(true, true);
    this.cfg.sound.play('win');
    this.showBanner('The Gloomy Cloud is happy again! The rainbow gate is open!', 2600);
    this.openGate();
    if (!this.cfg.reducedMotion) this.tweens.add({ targets: boss, y: boss.y - 140, alpha: 0.85, duration: 2400 });
  }

  private openGate() {
    if (!this.gate) return;
    this.gateOpen = true;
    this.gate.setVisible(true);
    this.burst(this.gate.x, this.gate.y - 48, 14);
  }

  private reachGate() {
    if (!this.gateOpen || this.finished) return;
    this.finished = true;
    const pb = this.player.body as ArcadeBody;
    pb.setVelocity(0, pb.velocity.y);
    this.cfg.sound.play('win');
    this.burst(this.gate!.x, this.gate!.y - 48, 16);
    this.showBanner('Hooray!', 1500);
    this.time.delayedCall(1200, () =>
      this.cfg.onFinish({
        levelId: this.cfg.level.id,
        hero: this.cfg.hero,
        starsCollected: this.collected.size,
        starsTotal: this.starsTotal,
        crystal: this.crystal,
        secret: this.secret,
        elapsedMs: Math.round(this.elapsedMs),
        achievements: [...this.achievements],
      }),
    );
  }

  private hurt(fromX: number) {
    const t = this.now();
    if (this.invulnUntil > t || this.finished) return;
    this.hearts--;
    this.cfg.sound.play('hurt');
    if (this.hearts <= 0) {
      this.respawn(true);
      return;
    }
    this.invulnUntil = t + HURT_GRACE_MS;
    const pb = this.player.body as ArcadeBody;
    pb.setVelocity(this.player.x < fromX ? -220 : 220, -300);
    if (!this.cfg.reducedMotion) this.cameras.main.shake(120, 0.004);
  }

  private respawn(outOfHearts: boolean) {
    this.respawns++;
    if (outOfHearts || this.hearts <= 0) {
      this.hearts = this.maxHearts;
      this.showBanner(pick(GENTLE, this.respawns), 1800);
    }
    this.player.setPosition(this.checkpoint.x, this.checkpoint.y);
    (this.player.body as ArcadeBody).setVelocity(0, 0);
    this.invulnUntil = this.now() + HURT_GRACE_MS;
    this.dashUntil = 0;
  }

  // --- Frame update --------------------------------------------------------

  update(_t: number, dt: number) {
    const input = this.cfg.input;
    input.update();
    if (input.justPressed('pause')) {
      this.cfg.onPause();
      return;
    }
    const t = this.now();
    if (!this.finished) this.elapsedMs += dt;
    const pb = this.player.body as ArcadeBody;
    const stats = HERO_STATS[this.cfg.hero];
    const onGround = pb.blocked.down || pb.touching.down;
    if (onGround) {
      this.lastGroundAt = t;
      this.jumps = 0;
    }

    if (!this.finished) {
      // Special move
      if (input.justPressed('action') && t >= this.specialReadyAt) {
        this.specialReadyAt = t + stats.cooldownMs;
        this.cfg.sound.play('special');
        if (stats.special === 'shield') this.shieldUntil = t + SHIELD_MS;
        else {
          this.dashUntil = t + DASH_MS;
          this.dashDir = this.facing;
        }
      }
      const dashing = this.dashing();
      pb.allowGravity = !dashing;
      const speed = stats.speed * (this.hasPower('boots') ? 1.5 : 1);
      if (dashing) {
        pb.setVelocity(this.dashDir * DASH_SPEED, 0);
      } else {
        const dir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
        if (dir) this.facing = dir;
        pb.setVelocityX(dir * speed);

        const jumpPressed = input.justPressed('jump') || input.justPressed('up');
        const jumpHeld = input.isDown('jump') || input.isDown('up');
        const jumpV = stats.jump * (this.hasPower('superjump') ? 1.3 : 1);
        if (jumpPressed) {
          if (onGround || t - this.lastGroundAt < 110) {
            pb.setVelocityY(-jumpV);
            this.jumps = 1;
            this.cutJump = true;
            this.lastGroundAt = 0;
            this.cfg.sound.play('jump');
          } else if (canDoubleJump(this.cfg.hero, this.cfg.difficulty) && this.jumps < 2) {
            pb.setVelocityY(-jumpV * 0.85);
            this.jumps = 2;
            this.cutJump = true;
            this.cfg.sound.play('jump');
          }
        }
        if (this.hasPower('flight') && jumpHeld && !onGround) {
          pb.setVelocityY(Math.max(pb.velocity.y - 2600 * (dt / 1000), -300));
        } else if (!jumpHeld && this.cutJump && pb.velocity.y < -260) {
          // Short tap = small hop, long press = full jump.
          pb.setVelocityY(-260);
        }
      }
    } else {
      pb.setVelocityX(0);
    }

    // Look
    const hero = HEROES[this.cfg.hero];
    let pose = 'idle';
    if (!onGround) pose = 'jump';
    else if (Math.abs(pb.velocity.x) > 10) pose = Math.floor(t / 120) % 2 ? 'run1' : 'run2';
    this.player.setTexture(`${hero.key}-${pose}`).setFlipX(this.facing < 0);
    this.player.setAlpha(this.invulnUntil > t ? 0.5 : 1);
    this.shieldRing.setVisible(this.shielded()).setPosition(this.player.x, this.player.y);

    // Fell into a pit
    if (this.player.y > VIEW_H + 80) {
      this.hearts--;
      this.cfg.sound.play('hurt');
      this.respawn(this.hearts <= 0);
    }

    // Magnet pulls nearby stars
    if (this.hasPower('magnet')) {
      for (const s of this.stars.getChildren() as ArcadeImage[]) {
        const d = Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y);
        if (d < 170) {
          s.x += (this.player.x - s.x) * 0.15;
          s.y += (this.player.y - s.y) * 0.15;
          (s.body as ArcadeBody).updateFromGameObject();
        }
      }
    }

    this.updateEnemies(t);
    this.updateMovers();
    this.updateBoss(t);
    this.updateHud(t);

    const cam = this.cameras.main;
    this.bg[1].tilePositionX = cam.scrollX * 0.25;
    this.bg[2].tilePositionX = cam.scrollX * 0.55;
  }

  private updateEnemies(t: number) {
    const speed = 70 * this.rules.enemySpeed;
    for (const e of this.enemies.getChildren() as ArcadeSprite[]) {
      const b = e.body as ArcadeBody;
      if (!b.enable) continue;
      if (e.getData('kind') === 'walker') {
        let dir = e.getData('dir') as number;
        const tx = Math.floor((e.x + dir * 16) / TILE);
        const ty = Math.floor(b.bottom / TILE);
        if ((dir < 0 && b.blocked.left) || (dir > 0 && b.blocked.right) || (b.blocked.down && !this.solidAt(tx, ty))) dir = -dir;
        e.setData('dir', dir);
        b.setVelocityX(dir * speed);
        e.setFlipX(dir > 0);
      } else {
        const ph = (e.getData('phase') as number) + t / 1000;
        e.setPosition(
          (e.getData('ox') as number) + Math.sin(ph * 0.8 * this.rules.enemySpeed) * 70,
          (e.getData('oy') as number) + Math.sin(ph * 2) * 18,
        );
        b.updateFromGameObject();
      }
    }
  }

  private updateMovers() {
    for (const m of this.movers.getChildren() as ArcadeImage[]) {
      const b = m.body as ArcadeBody;
      if (m.getData('axis') === 'x') {
        const ox = m.getData('ox') as number;
        if (m.x > ox + 72) b.setVelocityX(-70);
        else if (m.x < ox - 72) b.setVelocityX(70);
      } else {
        const oy = m.getData('oy') as number;
        if (m.y > oy + 70) b.setVelocityY(-60);
        else if (m.y < oy - 90) b.setVelocityY(60);
      }
    }
  }

  private updateBoss(t: number) {
    const boss = this.boss;
    if (!boss || this.bossHits >= BOSS_HITS) return;
    if (!this.bossActive && this.player.x > boss.x - 12 * TILE) {
      this.bossActive = true;
      this.nextDropAt = t + 1500;
      this.showBanner('The Gloomy Cloud looks sad. Bounce on it to cheer it up!', 2600);
    }
    if (!this.bossActive) return;
    const ox = boss.getData('ox') as number;
    boss.setPosition(ox + Math.sin(t / 1400) * 7 * TILE, 225 + Math.sin(t / 700) * 25);
    (boss.body as ArcadeBody).updateFromGameObject();
    if (t >= this.nextDropAt) {
      this.nextDropAt = t + this.rules.bossDropMs;
      const d = this.drops.create(boss.x, boss.y + 34, 'drop') as ArcadeImage;
      (d.body as ArcadeBody).setVelocityY(150);
      this.time.delayedCall(4000, () => d.active && d.destroy());
    }
  }

  private updateHud(t: number) {
    this.hud.hearts.forEach((h, i) => h.setTexture(i < this.hearts ? 'heart' : 'heart-empty'));
    this.hud.stars.setText(`${this.collected.size}/${this.starsTotal}`);
    this.hud.crystal.setAlpha(this.crystal ? 1 : 0.3);
    const active = [...this.powers.entries()].filter(([, until]) => until > t);
    this.hud.power.setText(active.map(([k, until]) => `${POWER_UP_NAMES[k]} ${Math.ceil((until - t) / 1000)}`).join('   '));
    const stats = HERO_STATS[this.cfg.hero];
    const wait = Math.ceil((this.specialReadyAt - t) / 1000);
    this.hud.special.setText(`${stats.specialLabel}: ${wait > 0 ? wait : 'ready!'}`);
    this.hud.timer.setText(this.rules.showTimer ? formatTime(this.elapsedMs) : '');
  }

  // --- Test hooks (only with ?testhooks=1) ---------------------------------

  state(): SceneState {
    const pb = this.player.body as ArcadeBody;
    return {
      level: this.cfg.level.id,
      hero: this.cfg.hero,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      tileX: Math.floor(this.player.x / TILE),
      tileY: Math.floor(pb.bottom / TILE),
      onGround: pb.blocked.down || pb.touching.down,
      hearts: this.hearts,
      stars: this.collected.size,
      starsTotal: this.starsTotal,
      crystal: this.crystal,
      secret: this.secret,
      powers: [...this.powers.entries()].filter(([, u]) => u > this.now()).map(([k]) => k),
      bossHits: this.bossHits,
      gateOpen: this.gateOpen,
      finished: this.finished,
      respawns: this.respawns,
      boss: this.boss ? { x: Math.round(this.boss.x), y: Math.round(this.boss.y), visible: this.boss.visible, alpha: this.boss.alpha, depth: this.boss.depth } : null,
      drops: this.drops.countActive(),
    };
  }

  private installTestHooks() {
    (window as unknown as { __afa: unknown }).__afa = {
      state: () => this.state(),
      /** Put the hero standing on tile (tx, ty) where ty is the row the feet rest on top of. */
      teleport: (tx: number, ty: number) => {
        const pb = this.player.body as ArcadeBody;
        this.player.setPosition(tx * TILE + TILE / 2, ty * TILE - pb.height / 2 - 2);
        pb.setVelocity(0, 0);
      },
      cheerBoss: () => this.boss && this.cheerBoss(),
    };
  }
}

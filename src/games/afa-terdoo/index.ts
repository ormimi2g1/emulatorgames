import Phaser from 'phaser';
import type { GameContext, GameInstance, GameModule } from '../types';
import { LEVELS } from './levels';
import { LevelScene, VIEW_H, VIEW_W, type SceneConfig } from './LevelScene';
import type { HeroId, ResumePoint } from './rules';
import { Sound } from './sfx';

export interface AfaOptions {
  levelId: string;
  hero: HeroId;
  resume?: ResumePoint;
  testHooks?: boolean;
}

/**
 * Runs one level. Menus (hero select, world map, results) live in React;
 * see AfaTerdooScreen. Everything is torn down in destroy().
 */
const module: GameModule = {
  async mount(container: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    const opts = ctx.options as unknown as AfaOptions;
    const level = LEVELS.find((l) => l.id === opts.levelId) ?? LEVELS[0];
    const sound = new Sound(ctx.volume, level.world);

    const sceneConfig = (resume?: ResumePoint): SceneConfig => ({
      level,
      hero: opts.hero,
      difficulty: ctx.difficulty,
      reducedMotion: ctx.reducedMotion,
      input: ctx.input,
      sound,
      resume,
      testHooks: !!opts.testHooks,
      onFinish: (r) => ctx.onComplete({ ...r }),
      onPause: () => ctx.onPauseRequest(),
      onCheckpoint: (r) => ctx.onEvent?.({ type: 'checkpoint', resume: r }),
    });

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: VIEW_W,
      height: VIEW_H,
      backgroundColor: '#14123a',
      banner: false,
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { debug: false } },
      render: { antialias: true, roundPixels: true },
    });

    await new Promise<void>((resolve) => {
      if (game.isBooted) resolve();
      else game.events.once(Phaser.Core.Events.READY, () => resolve());
    });
    game.scene.add('level', LevelScene, true, sceneConfig(opts.resume));

    const scene = () => game.scene.getScene('level') as LevelScene;

    return {
      start() {},
      pause() {
        if (game.scene.isActive('level')) game.scene.pause('level');
        sound.suspend();
      },
      resume() {
        game.scene.resume('level');
        sound.resume();
      },
      restart() {
        scene().scene.restart(sceneConfig());
        game.scene.resume('level');
        sound.resume();
      },
      async save() {
        return scene().resumePoint();
      },
      async load(data: unknown) {
        scene().scene.restart(sceneConfig(data as ResumePoint));
      },
      destroy() {
        sound.destroy();
        game.destroy(true);
        delete (window as unknown as { __afa?: unknown }).__afa;
      },
    };
  },
};

export default module;

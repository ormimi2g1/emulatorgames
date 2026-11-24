import { afterEach, describe, expect, it } from 'vitest';
import { GameInput } from './input';

const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }));

describe('GameInput', () => {
  let input: GameInput;
  afterEach(() => input.dispose());

  it('reports a held key once as just pressed', () => {
    input = new GameInput(window);
    key('keydown', 'Space');
    input.update();
    expect(input.justPressed('jump')).toBe(true);
    expect(input.isDown('jump')).toBe(true);
    input.update();
    expect(input.justPressed('jump')).toBe(false);
    expect(input.isDown('jump')).toBe(true);
    key('keyup', 'Space');
    input.update();
    expect(input.isDown('jump')).toBe(false);
  });

  it('does not lose a quick tap that starts and ends between two frames', () => {
    input = new GameInput(window);
    input.update();
    key('keydown', 'Escape');
    key('keyup', 'Escape');
    input.update();
    expect(input.justPressed('pause')).toBe(true);
    input.update();
    expect(input.isDown('pause')).toBe(false);
  });

  it('merges touch buttons and stops reading keys after dispose', () => {
    input = new GameInput(window);
    input.setTouch('right', true);
    input.update();
    expect(input.isDown('right')).toBe(true);
    input.setTouch('right', false);
    input.dispose();
    key('keydown', 'ArrowLeft');
    input.update();
    expect(input.isDown('left')).toBe(false);
  });
});

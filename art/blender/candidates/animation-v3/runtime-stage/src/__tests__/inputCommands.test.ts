import { EventEmitter } from 'node:events';
import { describe, it, expect, jest } from '@jest/globals';
jest.mock('phaser', () => ({ __esModule: true, default: { Scene: class {} } }));
import { UIScene } from '../scenes/UIScene';

describe('native keyboard command identity', () => {
  const event = (key: string, code = 'Key' + key.toUpperCase()) =>
    ({ key, code, repeat: false, timeStamp: 1000, preventDefault: jest.fn() } as unknown as KeyboardEvent);
  it('recruits once for a replayed event but accepts distinct rapid presses', () => {
    const ui = new UIScene() as any;
    ui.recruit = jest.fn();
    const q = event('q'), w = event('w');
    ui.onKey(q); ui.onKey(w); ui.onKey(q); ui.onKey(event('q'));
    expect(ui.recruit.mock.calls).toEqual([[0], [1], [0]]);
  });
  it('does not turn an Escape that cancels building into a second pause command', () => {
    const ui = new UIScene() as any;
    ui.events = new EventEmitter(); ui.selectedTurretIndex = 0; ui.showFeedback = jest.fn();
    const pause = jest.fn(); ui.events.on('togglePause', pause);
    ui.events.on('selectTurret', (index: number) => { ui.selectedTurretIndex = index; });
    const escape = event('Escape', 'Escape');
    ui.onKey(escape); ui.onKey(escape);
    expect(ui.selectedTurretIndex).toBe(-1);
    expect(pause).not.toHaveBeenCalled();
    ui.onKey(event('Escape', 'Escape'));
    expect(pause).toHaveBeenCalledTimes(1);
  });
});

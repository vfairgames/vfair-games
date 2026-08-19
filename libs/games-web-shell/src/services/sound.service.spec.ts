import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSoundStore } from '../store/sound-store/sound-store';
import { soundService } from './sound.service';

const playMock = vi.fn();
const stopMock = vi.fn();
const loadMock = vi.fn();
const volumeMock = vi.fn();
const unloadMock = vi.fn();

vi.mock('howler', () => ({
  Howl: class {
    play = playMock;
    stop = stopMock;
    load = loadMock;
    volume = volumeMock;
    unload = unloadMock;
  },
}));

describe('soundService', () => {
  beforeEach(() => {
    playMock.mockClear();
    stopMock.mockClear();
    loadMock.mockClear();
    volumeMock.mockClear();
    unloadMock.mockClear();
    useSoundStore.setState({ muted: false, volume: 0.5 });
    soundService.resetForTests();
  });

  it('plays a registered sound at the combined volume', () => {
    soundService.register('test', { src: '/test.wav', volume: 0.8 });
    soundService.play('test');

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(volumeMock).toHaveBeenCalledWith(0.4);
  });

  it('does not play when muted', () => {
    soundService.register('test', { src: '/test.wav' });
    useSoundStore.setState({ muted: true });

    soundService.play('test');

    expect(playMock).not.toHaveBeenCalled();
  });

  it('preloads registered sounds', () => {
    soundService.register('test', { src: '/test.wav' });
    soundService.preload(['test']);

    expect(loadMock).toHaveBeenCalledTimes(1);
  });
});

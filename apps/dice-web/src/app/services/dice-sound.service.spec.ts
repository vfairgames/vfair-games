import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { diceSoundService } from './dice-sound.service';

const getDiceGameStateMock = vi.fn(() => ({ betResultTransitionMs: 0 }));

vi.mock('../store/dice-game-store', () => ({
  useDiceGameStore: {
    getState: () => getDiceGameStateMock(),
  },
}));

const playMock = vi.fn();
const stopMock = vi.fn();
const registerMock = vi.fn();

vi.mock('@vfair/games-web-shell', () => ({
  soundService: {
    register: (...args: unknown[]) => registerMock(...args),
    play: (...args: unknown[]) => playMock(...args),
    stop: (...args: unknown[]) => stopMock(...args),
  },
}));

const createResult = (status: 'won' | 'lost') => ({ status });

describe('diceSoundService', () => {
  beforeEach(() => {
    playMock.mockClear();
    stopMock.mockClear();
    registerMock.mockClear();
    getDiceGameStateMock.mockReturnValue({ betResultTransitionMs: 0 });
    diceSoundService.resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers dice sounds once', () => {
    diceSoundService.register();
    diceSoundService.register();

    expect(registerMock).toHaveBeenCalledTimes(4);
  });

  it('plays the action sound', () => {
    diceSoundService.playAction();

    expect(playMock).toHaveBeenCalledWith('dice-action');
  });

  it('plays the bet sound', () => {
    diceSoundService.playBet();

    expect(playMock).toHaveBeenCalledWith('dice-bet');
  });

  it('plays the win sound immediately when betResultTransitionMs is 0', () => {
    diceSoundService.playBetResult(createResult('won'));

    expect(stopMock).toHaveBeenCalledWith('dice-win');
    expect(playMock).toHaveBeenCalledWith('dice-win');
  });

  it('plays the win sound after betResultTransitionMs', () => {
    vi.useFakeTimers();
    getDiceGameStateMock.mockReturnValue({ betResultTransitionMs: 300 });

    diceSoundService.playBetResult(createResult('won'));

    expect(playMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(playMock).toHaveBeenCalledWith('dice-win');
  });

  it('does not play a sound for a losing bet result', () => {
    diceSoundService.playBetResult(createResult('lost'));

    expect(playMock).not.toHaveBeenCalled();
  });

  it('does not cancel a pending win sound when a later bet loses', () => {
    vi.useFakeTimers();
    getDiceGameStateMock.mockReturnValue({ betResultTransitionMs: 300 });

    diceSoundService.playBetResult(createResult('won'));
    diceSoundService.playBetResult(createResult('lost'));

    expect(playMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(playMock).toHaveBeenCalledWith('dice-win');
  });

  it('reschedules the win sound when a later bet also wins', () => {
    vi.useFakeTimers();
    getDiceGameStateMock.mockReturnValue({ betResultTransitionMs: 300 });

    diceSoundService.playBetResult(createResult('won'));
    vi.advanceTimersByTime(100);
    diceSoundService.playBetResult(createResult('won'));

    vi.advanceTimersByTime(200);
    expect(playMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith('dice-win');
  });

  it('throttles slider sounds', () => {
    const now = vi.spyOn(Date, 'now');

    now.mockReturnValueOnce(1000).mockReturnValueOnce(1030);

    diceSoundService.playSlider();
    diceSoundService.playSlider();

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith('dice-slider');

    now.mockRestore();
  });
});

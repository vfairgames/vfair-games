import { soundService } from '@vfair/games-web-shell';
import type { BetStatus } from '@vfair/game-contracts';

import { useDiceGameStore } from '../store/dice-game-store';

const SLIDER_SOUND_THROTTLE_MS = 70;

const diceSoundAsset = (filename: string): string =>
  new URL(`../../assets/sounds/${filename}`, import.meta.url).href;

const DICE_SOUNDS = {
  action: {
    id: 'dice-action',
    src: diceSoundAsset('click2.mp3'),
  },
  bet: {
    id: 'dice-bet',
    src: diceSoundAsset('bet2.mp3'),
  },
  win: {
    id: 'dice-win',
    src: diceSoundAsset('win.mp3'),
  },
  slider: {
    id: 'dice-slider',
    src: diceSoundAsset('roll.mp3'),
  },
} as const;

class DiceSoundService {
  private registered = false;
  private lastSliderSoundAt?: number;
  private winSoundTimeoutId?: ReturnType<typeof setTimeout>;

  register(): void {
    if (this.registered) {
      return;
    }

    Object.values(DICE_SOUNDS).forEach(({ id, src }) => {
      soundService.register(id, { src });
    });
    this.registered = true;
  }

  playAction(): void {
    soundService.play(DICE_SOUNDS.action.id);
  }

  playBet(): void {
    soundService.play(DICE_SOUNDS.bet.id);
  }

  playWin(): void {
    soundService.stop(DICE_SOUNDS.win.id);
    soundService.play(DICE_SOUNDS.win.id);
  }

  playSlider(): void {
    const now = Date.now();

    if (
      this.lastSliderSoundAt !== undefined &&
      now - this.lastSliderSoundAt < SLIDER_SOUND_THROTTLE_MS
    ) {
      return;
    }

    this.lastSliderSoundAt = now;
    soundService.play(DICE_SOUNDS.slider.id);
  }

  playBetResult(result: { status: BetStatus }): void {
    if (result.status !== 'won') {
      return;
    }

    this.clearWinSoundTimeout();

    const delayMs = useDiceGameStore.getState().betResultTransitionMs;

    if (delayMs === 0) {
      this.playWin();
      return;
    }

    this.winSoundTimeoutId = setTimeout(() => {
      this.winSoundTimeoutId = undefined;
      this.playWin();
    }, delayMs);
  }

  resetForTests(): void {
    this.clearWinSoundTimeout();
    this.registered = false;
    this.lastSliderSoundAt = undefined;
  }

  private clearWinSoundTimeout(): void {
    if (this.winSoundTimeoutId === undefined) {
      return;
    }

    clearTimeout(this.winSoundTimeoutId);
    this.winSoundTimeoutId = undefined;
  }
}

export const diceSoundService = new DiceSoundService();

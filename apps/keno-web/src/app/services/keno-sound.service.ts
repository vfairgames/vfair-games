import { soundService } from '@vfair/games-web-shell';
import type { BetStatus } from '@vfair/game-contracts';

import { useKenoGameStore } from '../store/keno-game-store';

const kenoSoundAsset = (filename: string): string =>
  new URL(`../../assets/sounds/${filename}`, import.meta.url).href;

const KENO_SOUNDS = {
  action: {
    id: 'keno-action',
    src: kenoSoundAsset('click2.mp3'),
  },
  bet: {
    id: 'keno-bet',
    src: kenoSoundAsset('bet2.mp3'),
  },
  win: {
    id: 'keno-win',
    src: kenoSoundAsset('win.mp3'),
  },
  openNumber: {
    id: 'keno-open-number',
    src: kenoSoundAsset('keno-open.mp3'),
  },
} as const;

class KenoSoundService {
  private registered = false;
  private winSoundTimeoutId?: ReturnType<typeof setTimeout>;

  register(): void {
    if (this.registered) {
      return;
    }

    Object.values(KENO_SOUNDS).forEach(({ id, src }) => {
      soundService.register(id, { src });
    });
    this.registered = true;
  }

  playAction(): void {
    soundService.play(KENO_SOUNDS.action.id);
  }

  playBet(): void {
    soundService.play(KENO_SOUNDS.bet.id);
  }

  playWin(): void {
    soundService.stop(KENO_SOUNDS.win.id);
    soundService.play(KENO_SOUNDS.win.id);
  }

  playOpenNumber(): void {
    soundService.play(KENO_SOUNDS.openNumber.id);
  }

  playBetResult(result: { status: BetStatus }): void {
    if (result.status !== 'won') {
      return;
    }

    this.clearWinSoundTimeout();

    const delayMs = useKenoGameStore.getState().betResultTransitionMs;

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
  }

  private clearWinSoundTimeout(): void {
    if (this.winSoundTimeoutId === undefined) {
      return;
    }

    clearTimeout(this.winSoundTimeoutId);
    this.winSoundTimeoutId = undefined;
  }
}

export const kenoSoundService = new KenoSoundService();

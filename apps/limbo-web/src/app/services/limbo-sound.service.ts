import { soundService } from '@vfair/games-web-shell';
import type { BetStatus } from '@vfair/game-contracts';

import { useLimboGameStore } from '../store/limbo-game-store';

const limboSoundAsset = (filename: string): string =>
  new URL(`../../assets/sounds/${filename}`, import.meta.url).href;

const LIMBO_SOUNDS = {
  action: {
    id: 'limbo-action',
    src: limboSoundAsset('click2.mp3'),
  },
  bet: {
    id: 'limbo-bet',
    src: limboSoundAsset('bet2.mp3'),
  },
  win: {
    id: 'limbo-win',
    src: limboSoundAsset('win.mp3'),
  },
} as const;

class LimboSoundService {
  private registered = false;
  private winSoundTimeoutId?: ReturnType<typeof setTimeout>;

  register(): void {
    if (this.registered) {
      return;
    }

    Object.values(LIMBO_SOUNDS).forEach(({ id, src }) => {
      soundService.register(id, { src });
    });
    this.registered = true;
  }

  playAction(): void {
    soundService.play(LIMBO_SOUNDS.action.id);
  }

  playBet(): void {
    soundService.play(LIMBO_SOUNDS.bet.id);
  }

  playWin(): void {
    soundService.stop(LIMBO_SOUNDS.win.id);
    soundService.play(LIMBO_SOUNDS.win.id);
  }

  playBetResult(result: { status: BetStatus }): void {
    if (result.status !== 'won') {
      return;
    }

    this.clearWinSoundTimeout();

    const delayMs = useLimboGameStore.getState().betResultTransitionMs;

    if (delayMs === 0) {
      this.playWin();
      return;
    }

    this.winSoundTimeoutId = setTimeout(() => {
      this.winSoundTimeoutId = undefined;
      this.playWin();
    }, delayMs);
  }

  private clearWinSoundTimeout(): void {
    if (this.winSoundTimeoutId === undefined) {
      return;
    }

    clearTimeout(this.winSoundTimeoutId);
    this.winSoundTimeoutId = undefined;
  }
}

export const limboSoundService = new LimboSoundService();

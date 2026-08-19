import { soundService } from '@vfair/games-web-shell';
import type { BetStatus } from '@vfair/game-contracts';

import { useMinesGameStore } from '../store/mines-game-store';

const minesSoundAsset = (filename: string): string =>
  new URL(`../../assets/sounds/${filename}`, import.meta.url).href;

const MINES_SOUNDS = {
  action: {
    id: 'mines-action',
    src: minesSoundAsset('click2.mp3'),
  },
  bet: {
    id: 'mines-bet',
    src: minesSoundAsset('bet2.mp3'),
  },
  explosion: {
    id: 'mines-explosion',
    src: minesSoundAsset('explosion.mp3'),
  },
  gem: {
    id: 'mines-gem',
    src: minesSoundAsset('gem.mp3'),
  },
  win: {
    id: 'mines-win',
    src: minesSoundAsset('win.mp3'),
  },
} as const;

class MinesSoundService {
  private registered = false;
  private winSoundTimeoutId?: ReturnType<typeof setTimeout>;

  register(): void {
    if (this.registered) {
      return;
    }

    Object.values(MINES_SOUNDS).forEach(({ id, src }) => {
      soundService.register(id, { src });
    });
    this.registered = true;
  }

  playAction(): void {
    soundService.play(MINES_SOUNDS.action.id);
  }

  playBet(): void {
    soundService.play(MINES_SOUNDS.bet.id);
  }

  playGem(): void {
    soundService.stop(MINES_SOUNDS.gem.id);
    soundService.play(MINES_SOUNDS.gem.id);
  }

  private playWin(): void {
    soundService.stop(MINES_SOUNDS.win.id);
    soundService.play(MINES_SOUNDS.win.id);
  }

  private playExplosion(): void {
    soundService.stop(MINES_SOUNDS.explosion.id);
    soundService.play(MINES_SOUNDS.explosion.id);
  }

  playBetResult(result: { status: BetStatus }): void {
    if (result.status === 'lost') {
      this.clearWinSoundTimeout();
      if (useMinesGameStore.getState().form.betMode !== 'auto') {
        this.playExplosion();
      }
      return;
    }

    if (result.status !== 'won') {
      return;
    }

    this.clearWinSoundTimeout();

    const delayMs = useMinesGameStore.getState().betResultTransitionMs;

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

export const minesSoundService = new MinesSoundService();

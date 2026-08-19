import { soundService } from '@vfair/games-web-shell';
import type { BetStatus } from '@vfair/game-contracts';

const plinkoSoundAsset = (filename: string): string =>
  new URL(`../../assets/sounds/${filename}`, import.meta.url).href;

const PLINKO_SOUNDS = {
  action: {
    id: 'plinko-action',
    src: plinkoSoundAsset('click2.mp3'),
  },
  bet: {
    id: 'plinko-bet',
    src: plinkoSoundAsset('bet2.mp3'),
  },
  win: {
    id: 'plinko-win',
    src: plinkoSoundAsset('win.mp3'),
  },
} as const;

class PlinkoSoundService {
  private registered = false;

  register(): void {
    if (this.registered) {
      return;
    }

    Object.values(PLINKO_SOUNDS).forEach(({ id, src }) => {
      soundService.register(id, { src });
    });
    this.registered = true;
  }

  playAction(): void {
    soundService.play(PLINKO_SOUNDS.action.id);
  }

  playBet(): void {
    soundService.play(PLINKO_SOUNDS.bet.id);
  }

  playWin(): void {
    soundService.stop(PLINKO_SOUNDS.win.id);
    soundService.play(PLINKO_SOUNDS.win.id);
  }

  playBetResult(result: { status: BetStatus }): void {
    if (result.status !== 'won') {
      return;
    }

    this.playWin();
  }
}

export const plinkoSoundService = new PlinkoSoundService();

import type { ActiveRoundGame } from '@vfair/game-contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { formatActiveRoundsMessage } from './format-active-rounds-message';
import { initializeTranslations } from '../i18n/i18n';

describe('formatActiveRoundsMessage', () => {
  beforeEach(async () => {
    await initializeTranslations('en');
  });

  it('returns null when there are no active rounds', () => {
    expect(formatActiveRoundsMessage([])).toBeNull();
  });

  it('formats a single active round message', () => {
    const games: ActiveRoundGame[] = [{ gameId: 'v_mines', gameName: 'Mines' }];

    expect(formatActiveRoundsMessage(games)).toBe(
      'Finish your active Mines round before rotating seeds.',
    );
  });

  it('formats multiple active round message', () => {
    const games: ActiveRoundGame[] = [
      { gameId: 'v_mines', gameName: 'Mines' },
      { gameId: 'v_limbo', gameName: 'Limbo' },
    ];

    expect(formatActiveRoundsMessage(games)).toBe(
      'Finish active rounds in Mines, Limbo before rotating seeds.',
    );
  });
});

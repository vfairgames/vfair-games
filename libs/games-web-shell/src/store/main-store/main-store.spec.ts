import { DEFAULT_GAME_RTP } from '@vfair/game-math';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_GAME_SETTINGS } from '../../bootstrap/bootstrap';
import { useMainStore, type Session } from './main-store';

const session = (overrides: Partial<Session> = {}): Session => ({
  playerId: 'user-1',
  ...overrides,
});

beforeEach(() => {
  useMainStore.setState({
    ...DEFAULT_GAME_SETTINGS,
    appearance: DEFAULT_GAME_SETTINGS.defaultAppearance,
    status: 'idle',
    connectionState: 'disconnected',
    isDemo: false,
    playerId: null,
    balance: 0,
    error: null,
    underMaintenance: false,
  });
});

describe('initial state', () => {
  it('uses default game bet limits before applyGameSettings', () => {
    const state = useMainStore.getState();

    expect(state.minBet).toBe(DEFAULT_GAME_SETTINGS.minBet);
    expect(state.maxBet).toBe(DEFAULT_GAME_SETTINGS.maxBet);
    expect(state.maxWin).toBe(DEFAULT_GAME_SETTINGS.maxWin);
  });
});

describe('applyGameSettings', () => {
  it('sets game config fields from resolved game settings', () => {
    useMainStore.getState().applyGameSettings({
      ...DEFAULT_GAME_SETTINGS,
      currency: 'EUR',
      countryCode: 'DE',
      currencyDecimals: 2,
      minBet: 0.01,
      maxBet: 500.999,
      maxWin: 1000,
      rtp: 0.97,
      lobbyUrl: 'https://lobby.example.com',
      lightAccentColor: 'blue',
      darkAccentColor: 'violet',
    });

    const state = useMainStore.getState();

    expect(state.currency).toBe('EUR');
    expect(state.countryCode).toBe('DE');
    expect(state.minBet).toBe(0.01);
    expect(state.maxBet).toBe(501);
    expect(state.maxWin).toBe(1000);
    expect(state.rtp).toBe(0.97);
    expect(state.lobbyUrl).toBe('https://lobby.example.com');
    expect(state.lightAccentColor).toBe('blue');
    expect(state.darkAccentColor).toBe('violet');
    expect(state.lang).toBe('en');
    expect(state.defaultAppearance).toBe('light');
    expect(state.appearance).toBe('light');
    expect(state.themeSwitcherEnabled).toBe(true);
    expect(state.theme).toEqual([]);
  });

  it('sets appearance from defaultAppearance', () => {
    useMainStore.getState().applyGameSettings({
      ...DEFAULT_GAME_SETTINGS,
      defaultAppearance: 'dark',
    });

    expect(useMainStore.getState().appearance).toBe('dark');
  });
});

describe('toggleAppearance', () => {
  it('switches between light and dark', () => {
    useMainStore.getState().applyGameSettings({
      ...DEFAULT_GAME_SETTINGS,
      defaultAppearance: 'light',
    });

    useMainStore.getState().toggleAppearance();
    expect(useMainStore.getState().appearance).toBe('dark');

    useMainStore.getState().toggleAppearance();
    expect(useMainStore.getState().appearance).toBe('light');
  });
});

describe('initSession', () => {
  it('sets status to ready and maps identity fields only', () => {
    useMainStore.getState().applyGameSettings(DEFAULT_GAME_SETTINGS);
    useMainStore.getState().initSession(session());
    const state = useMainStore.getState();

    expect(state.status).toBe('ready');
    expect(state.playerId).toBe('user-1');
    expect(state.balance).toBe(0);
    expect(state.error).toBeNull();
    expect(state.currency).toBe('USD');
    expect(state.rtp).toBe(DEFAULT_GAME_RTP);
  });
});

describe('setIsDemo', () => {
  it('updates isDemo', () => {
    useMainStore.getState().setIsDemo(true);
    expect(useMainStore.getState().isDemo).toBe(true);
  });
});

describe('setBalance', () => {
  it('rounds balance to currencyDecimals', () => {
    useMainStore.getState().setBalance(100.126);

    expect(useMainStore.getState().balance).toBe(100.13);
  });
});

describe('setError', () => {
  it('sets status to error and stores the message', () => {
    useMainStore.getState().setError('something went wrong');
    const state = useMainStore.getState();

    expect(state.status).toBe('error');
    expect(state.error).toBe('something went wrong');
  });
});

describe('setCurrency', () => {
  it('updates currency', () => {
    useMainStore.getState().setCurrency('EUR');
    expect(useMainStore.getState().currency).toBe('EUR');
  });
});

describe('setCountryCode', () => {
  it('updates countryCode', () => {
    useMainStore.getState().setCountryCode('DE');
    expect(useMainStore.getState().countryCode).toBe('DE');
  });
});

describe('setUnderMaintenance', () => {
  it('updates underMaintenance', () => {
    useMainStore.getState().setUnderMaintenance(true);
    expect(useMainStore.getState().underMaintenance).toBe(true);
  });
});

describe('setCurrencyDecimals', () => {
  it('updates currencyDecimals', () => {
    useMainStore.getState().setCurrencyDecimals(4);
    expect(useMainStore.getState().currencyDecimals).toBe(4);
  });
});

describe('calculateInitialBetAmount', () => {
  it('rounds one two-hundredth of the balance to currency precision', () => {
    useMainStore.setState({ balance: 201, minBet: 0.01, maxBet: 100 });

    expect(useMainStore.getState().calculateInitialBetAmount()).toBe(1.01);
  });

  it('uses minBet when the balance-based amount is lower', () => {
    useMainStore.setState({ balance: 1, minBet: 0.1, maxBet: 100 });

    expect(useMainStore.getState().calculateInitialBetAmount()).toBe(0.1);
  });

  it('uses maxBet when the balance-based amount is higher', () => {
    useMainStore.setState({ balance: 100_000, minBet: 0.01, maxBet: 100 });

    expect(useMainStore.getState().calculateInitialBetAmount()).toBe(100);
  });
});

describe('roundToCurrency', () => {
  it('rounds to the current currencyDecimals', () => {
    expect(useMainStore.getState().roundToCurrency(1.23456)).toBe(1.23);
  });

  it('reflects an updated currencyDecimals', () => {
    useMainStore.getState().setCurrencyDecimals(4);
    expect(useMainStore.getState().roundToCurrency(1.23456)).toBe(1.2346);
  });
});

describe('formatCurrency', () => {
  it('formats a number using the current currency and decimals', () => {
    const result = useMainStore.getState().formatCurrency(1234.5);
    expect(result).toContain('1,234.50');
  });

  it('respects a custom decimals override', () => {
    const result = useMainStore.getState().formatCurrency(1.5, { decimals: 0 });
    expect(result).toContain('2');
  });

  it('uses the updated currency after setCurrency', () => {
    useMainStore.getState().setCurrency('EUR');
    const result = useMainStore
      .getState()
      .formatCurrency(10, { showSymbol: true });
    expect(result).toContain('€');
  });
});

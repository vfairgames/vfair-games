import { roundToDecimals } from '@vfair/game-math';
import { formatCurrency as formatCurrencyUtil } from '@vfair/app-common';
import type { ThemeAppearance } from '@vfair/radix-palette';
import { create } from 'zustand';
import type { CountryCode, Currency } from '@vfair/app-common';

import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
} from '../../bootstrap/bootstrap';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type Session = {
  playerId: string | null;
};

type MainState = GameSettings & {
  appearance: ThemeAppearance;
  status: SessionStatus;
  connectionState: ConnectionState;
  isDemo: boolean;
  playerId: string | null;
  balance: number;
  error: string | null;
  underMaintenance: boolean;
};

type MainActions = {
  applyGameSettings: (settings: GameSettings) => void;
  initSession: (session: Session) => void;
  setIsDemo: (isDemo: boolean) => void;
  setBalance: (balance: number) => void;
  setConnectionState: (connectionState: ConnectionState) => void;
  setError: (error: string) => void;
  setCurrency: (currency: Currency) => void;
  setCountryCode: (countryCode: CountryCode) => void;
  setCurrencyDecimals: (currencyDecimals: number) => void;
  setAppearance: (appearance: ThemeAppearance) => void;
  toggleAppearance: () => void;
  setUnderMaintenance: (underMaintenance: boolean) => void;
  calculateInitialBetAmount: () => number;
  roundToCurrency: (value: number) => number;
  formatCurrency: (
    value: number,
    options?: { locale?: string; decimals?: number; showSymbol?: boolean },
  ) => string;
};

type MainStore = MainState & MainActions;

const roundGameBetLimits = (settings: GameSettings) => {
  const { currencyDecimals } = settings;

  return {
    minBet: roundToDecimals(settings.minBet, currencyDecimals),
    maxBet: roundToDecimals(settings.maxBet, currencyDecimals),
    maxWin: roundToDecimals(settings.maxWin, currencyDecimals),
  };
};

export const useMainStore = create<MainStore>((set, get) => ({
  ...DEFAULT_GAME_SETTINGS,
  ...roundGameBetLimits(DEFAULT_GAME_SETTINGS),
  appearance: DEFAULT_GAME_SETTINGS.defaultAppearance,
  status: 'idle',
  connectionState: 'disconnected',
  isDemo: false,
  playerId: null,
  balance: 0,
  error: null,
  underMaintenance: false,
  applyGameSettings: (settings) => {
    const { token: _launchToken, ...gameSettings } = settings;

    set({
      ...gameSettings,
      ...roundGameBetLimits(gameSettings),
      appearance: gameSettings.defaultAppearance,
    });
  },
  initSession: (session) =>
    set({
      status: 'ready',
      playerId: session.playerId,
      error: null,
    }),
  setIsDemo: (isDemo) => set({ isDemo }),
  setBalance: (balance) =>
    set((state) => ({
      balance: roundToDecimals(balance, state.currencyDecimals),
    })),
  setConnectionState: (connectionState) => set({ connectionState }),
  setError: (error) => set({ status: 'error', error }),
  setCurrency: (currency) => set({ currency }),
  setCountryCode: (countryCode) => set({ countryCode }),
  setCurrencyDecimals: (currencyDecimals) => set({ currencyDecimals }),
  setAppearance: (appearance) => set({ appearance }),
  toggleAppearance: () =>
    set((state) => ({
      appearance: state.appearance === 'dark' ? 'light' : 'dark',
    })),
  setUnderMaintenance: (underMaintenance) => set({ underMaintenance }),
  calculateInitialBetAmount: () => {
    const { balance, currencyDecimals, maxBet, minBet } = get();
    const balanceBasedAmount = roundToDecimals(balance / 200, currencyDecimals);

    return Math.min(maxBet, Math.max(minBet, balanceBasedAmount));
  },
  roundToCurrency: (value) => roundToDecimals(value, get().currencyDecimals),
  formatCurrency: (value, options) => {
    const { currency, currencyDecimals } = get();
    return formatCurrencyUtil(value, {
      currency,
      decimals: options?.decimals ?? currencyDecimals,
      locale: options?.locale,
      showSymbol: options?.showSymbol,
    });
  },
}));

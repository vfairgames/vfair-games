import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GAME_SETTINGS } from '../bootstrap/bootstrap';
import { sessionService } from '../services/session.service';
import { useMainStore, type Session } from '../store/main-store/main-store';
import { SessionGate } from './session-gate';

const session = (): Session => ({
  playerId: null,
});

const resetMainStore = () => {
  useMainStore.setState({
    ...DEFAULT_GAME_SETTINGS,
    appearance: DEFAULT_GAME_SETTINGS.defaultAppearance,
    status: 'idle',
    connectionState: 'disconnected',
    playerId: null,
    balance: 0,
    error: null,
    underMaintenance: false,
  });
};

describe('SessionGate', () => {
  beforeEach(() => {
    resetMainStore();
    window.history.pushState({}, '', '/?lang=ru');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows game settings error without initializing the session', async () => {
    const initialize = vi.spyOn(sessionService, 'initialize');

    render(
      <SessionGate gameSettingsError="Invalid settings: payload is not valid JSON">
        <span>Game ready</span>
      </SessionGate>,
    );

    expect(
      screen.getByText('Invalid settings: payload is not valid JSON'),
    ).toBeTruthy();
    expect(screen.queryByText('Game ready')).toBeNull();
    expect(initialize).not.toHaveBeenCalled();
  });

  it('loads translations before initializing the session', async () => {
    const initializedLanguages: string[] = [];

    useMainStore.getState().applyGameSettings({
      ...DEFAULT_GAME_SETTINGS,
      lang: 'ru',
    });

    vi.spyOn(sessionService, 'initialize').mockImplementation(async () => {
      initializedLanguages.push(document.documentElement.lang);
      useMainStore.getState().initSession(session());
    });
    vi.spyOn(sessionService, 'disconnect').mockImplementation(() => undefined);

    render(
      <SessionGate>
        <span>Game ready</span>
      </SessionGate>,
    );

    expect(await screen.findByText('Game ready')).toBeTruthy();
    expect(initializedLanguages).toEqual(['ru']);
  });

  it('shows maintenance message instead of the game when under maintenance', async () => {
    useMainStore.getState().applyGameSettings({
      ...DEFAULT_GAME_SETTINGS,
      lang: 'ru',
    });

    vi.spyOn(sessionService, 'initialize').mockImplementation(async () => {
      useMainStore.getState().initSession(session());
      useMainStore.getState().setUnderMaintenance(true);
    });
    vi.spyOn(sessionService, 'disconnect').mockImplementation(() => undefined);

    render(
      <SessionGate>
        <span>Game ready</span>
      </SessionGate>,
    );

    expect(
      await screen.findByText(
        'Игра временно недоступна из-за технического обслуживания. Пожалуйста, попробуйте позже.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Game ready')).toBeNull();
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import '@radix-ui/themes/styles.css';
import '@vfair/games-web-shell/global-reset-styles';
import 'flag-icons/css/flag-icons.min.css';
import {
  bootstrapGameSettings,
  injectThemeStylesheets,
  SessionGate,
  setupPartnerThemePreviewListener,
  ThemeProvider,
  useMainStore,
} from '@vfair/games-web-shell';
import { PlinkoGame } from './app/plinko-game';
import { plinkoQueryClient } from './app/query/plinko-query-client';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

const start = async () => {
  setupPartnerThemePreviewListener();

  const { error: gameSettingsError, settings } = bootstrapGameSettings();

  if (settings) {
    await injectThemeStylesheets(settings.theme);
    useMainStore.getState().applyGameSettings(settings);
  }

  root.render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={plinkoQueryClient}>
          <SessionGate gameSettingsError={gameSettingsError}>
            <PlinkoGame />
          </SessionGate>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
};

void start();

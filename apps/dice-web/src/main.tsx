import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import '@radix-ui/themes/styles.css';
import '@vfair/games-web-shell/global-reset-styles';
import 'flag-icons/css/flag-icons.min.css';
import './app/dice-variables.scss';
import {
  bootstrapGameSettings,
  injectThemeStylesheets,
  SessionGate,
  setupPartnerThemePreviewListener,
  ThemeProvider,
  useMainStore,
} from '@vfair/games-web-shell';
import { DiceGame } from './app/dice-game';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

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
        <QueryClientProvider client={queryClient}>
          <SessionGate gameSettingsError={gameSettingsError}>
            <DiceGame />
          </SessionGate>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
};

void start();

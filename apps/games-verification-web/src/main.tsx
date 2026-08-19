import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import '@radix-ui/themes/styles.css';
import './styles.scss';
import { bootstrapVerificationSettings } from './app/bootstrap/bootstrap-verification-settings';
import { injectThemeStylesheets } from './app/bootstrap/inject-theme-stylesheets';
import { VerificationApp } from './app/verification-app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

const start = async () => {
  const { hasSettingsError, settings } = bootstrapVerificationSettings();

  if (settings.theme.length > 0) {
    await injectThemeStylesheets(settings.theme);
  }

  root.render(
    <StrictMode>
      <VerificationApp
        settings={settings}
        hasSettingsError={hasSettingsError}
      />
    </StrictMode>,
  );
};

void start();

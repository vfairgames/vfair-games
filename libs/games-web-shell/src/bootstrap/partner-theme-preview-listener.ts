import { isPartnerThemePreviewMessage } from '@vfair/radix-palette';

import { useMainStore } from '../store/main-store/main-store';

export const PARTNER_THEME_PREVIEW_STYLE_ID = 'vfair-partner-theme-preview';

const isPartnerThemePreviewMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('preview') === 'true';
};

const injectPartnerThemePreviewCss = (css: string): void => {
  if (typeof document === 'undefined') {
    return;
  }

  let style = document.getElementById(
    PARTNER_THEME_PREVIEW_STYLE_ID,
  ) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement('style');
    style.id = PARTNER_THEME_PREVIEW_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = css;
};

export const setupPartnerThemePreviewListener = (): (() => void) => {
  if (typeof window === 'undefined' || !isPartnerThemePreviewMode()) {
    return () => undefined;
  }

  const handler = (event: MessageEvent) => {
    if (!isPartnerThemePreviewMessage(event.data)) {
      return;
    }

    injectPartnerThemePreviewCss(event.data.css);
    useMainStore.setState({ logo: event.data.logo });
  };

  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
};

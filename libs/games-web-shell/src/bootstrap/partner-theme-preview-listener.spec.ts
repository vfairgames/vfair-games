import { PARTNER_THEME_PREVIEW_MESSAGE_TYPE } from '@vfair/radix-palette';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useMainStore } from '../store/main-store/main-store';
import {
  PARTNER_THEME_PREVIEW_STYLE_ID,
  setupPartnerThemePreviewListener,
} from './partner-theme-preview-listener';

describe('setupPartnerThemePreviewListener', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/?preview=true');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    document.getElementById(PARTNER_THEME_PREVIEW_STYLE_ID)?.remove();
  });

  it('injects css from a valid preview message', () => {
    const cleanup = setupPartnerThemePreviewListener();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: PARTNER_THEME_PREVIEW_MESSAGE_TYPE,
          css: ':root { --color-background: #111; }',
          logo: null,
        },
      }),
    );

    const style = document.getElementById(
      PARTNER_THEME_PREVIEW_STYLE_ID,
    ) as HTMLStyleElement;

    expect(style.textContent).toBe(':root { --color-background: #111; }');

    cleanup();
  });

  it('updates logo in the main store from preview messages', () => {
    const cleanup = setupPartnerThemePreviewListener();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: PARTNER_THEME_PREVIEW_MESSAGE_TYPE,
          css: ':root { --color-background: #111; }',
          logo: 'https://example.com/logo.png',
        },
      }),
    );

    expect(useMainStore.getState().logo).toBe('https://example.com/logo.png');

    cleanup();
  });

  it('ignores messages when preview mode is disabled', () => {
    window.history.pushState({}, '', '/');

    const cleanup = setupPartnerThemePreviewListener();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: PARTNER_THEME_PREVIEW_MESSAGE_TYPE,
          css: ':root { --color-background: #000; }',
          logo: null,
        },
      }),
    );

    expect(document.getElementById(PARTNER_THEME_PREVIEW_STYLE_ID)).toBeNull();

    cleanup();
  });

  it('ignores messages with an invalid payload', () => {
    const cleanup = setupPartnerThemePreviewListener();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'other', css: 'ignored' },
      }),
    );

    expect(document.getElementById(PARTNER_THEME_PREVIEW_STYLE_ID)).toBeNull();

    cleanup();
  });

  it('updates existing style element on subsequent messages', () => {
    const cleanup = setupPartnerThemePreviewListener();

    const post = (css: string, logo: string | null = null) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: PARTNER_THEME_PREVIEW_MESSAGE_TYPE,
            css,
            logo,
          },
        }),
      );
    };

    post(':root { --color-background: #111; }');
    post(':root { --color-background: #222; }');

    const style = document.getElementById(
      PARTNER_THEME_PREVIEW_STYLE_ID,
    ) as HTMLStyleElement;

    expect(style.textContent).toBe(':root { --color-background: #222; }');
    expect(
      document.querySelectorAll(`#${PARTNER_THEME_PREVIEW_STYLE_ID}`),
    ).toHaveLength(1);

    cleanup();
  });
});

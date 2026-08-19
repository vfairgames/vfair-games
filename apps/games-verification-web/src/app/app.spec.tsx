import { render } from '@testing-library/react';
import { beforeAll } from 'vitest';
import { DEFAULT_VERIFICATION_SETTINGS } from './bootstrap/bootstrap-verification-settings';
import { VerificationApp } from './verification-app';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  };
});

describe('VerificationApp', () => {
  it('renders the verification title', () => {
    const { getByText } = render(
      <VerificationApp
        settings={DEFAULT_VERIFICATION_SETTINGS}
        hasSettingsError={false}
      />,
    );

    expect(getByText('Provably fair verification')).toBeTruthy();
  });
});

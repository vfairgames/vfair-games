import { Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { HouseIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import { useTranslation } from '../../i18n/i18n';
import { useMainStore } from '../../store/main-store/main-store';
import { ConnectionIndicator } from '../connection-indicator/connection-indicator';
import { DemoModeIndicator } from '../demo-mode-indicator/demo-mode-indicator';
import { ProvablyFairButton } from '../provably-fair-button/provably-fair-button';
import { SoundControlButton } from '../sound-control-button/sound-control-button';
import { useAppTheme } from '../theme-provider/theme-provider';

import './game-footer.scss';

type GameFooterProps = {
  start?: ReactNode;
};

export const GameFooter = ({ start }: GameFooterProps) => {
  const { t } = useTranslation();
  const { appearance, toggleAppearance } = useAppTheme();
  const lobbyUrl = useMainStore((state) => state.lobbyUrl);
  const logo = useMainStore((state) => state.logo);
  const themeSwitcherEnabled = useMainStore(
    (state) => state.themeSwitcherEnabled,
  );
  const themeTooltip =
    appearance === 'dark' ? t('shellLightMode') : t('shellDarkMode');
  const backToLobbyLabel = t('shellBackToLobby');

  return (
    <Flex
      align="center"
      className="game-footer"
      justify="between"
      width="100%"
      px="3"
      height="100%"
    >
      <Flex align="center" className="game-footer__start">
        {lobbyUrl ? (
          <>
            <Tooltip content={backToLobbyLabel}>
              <IconButton
                asChild
                variant="ghost"
                size="2"
                className="game-footer__home-button"
              >
                <a href={lobbyUrl} aria-label={backToLobbyLabel}>
                  <HouseIcon size={16} weight="fill" />
                </a>
              </IconButton>
            </Tooltip>
            <span
              className="game-footer__leading-separator"
              aria-hidden="true"
            />
          </>
        ) : null}
        <Flex align="center" gap="3">
          <SoundControlButton />
          {start}
          {themeSwitcherEnabled ? (
            <Tooltip content={themeTooltip}>
              <IconButton
                variant="ghost"
                size="1"
                aria-label={themeTooltip}
                onClick={toggleAppearance}
              >
                {appearance === 'dark' ? (
                  <SunIcon size={14} />
                ) : (
                  <MoonIcon size={14} />
                )}
              </IconButton>
            </Tooltip>
          ) : null}
        </Flex>
      </Flex>

      {logo ? (
        <img
          src={logo}
          alt=""
          className={clsx('game-footer__logo', 'game-footer__center')}
        />
      ) : null}

      <Flex align="center" className="game-footer__end" gap="3">
        <DemoModeIndicator />
        <ProvablyFairButton />
        <ConnectionIndicator />
      </Flex>
    </Flex>
  );
};

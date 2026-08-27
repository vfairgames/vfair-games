import {
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
} from '@radix-ui/themes';
import {
  CaretDownIcon,
  ListIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { PlayerWallet } from '../../auth/auth-types';
import type { PartnerAppearance } from '../../store/partner-prefs-store';
import { usePartnerPrefsStore } from '../../store/partner-prefs-store';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import {
  type GameLanguage,
  LanguageSelector,
} from '../language-selector/language-selector';
import './partner-header.scss';

type PartnerHeaderProps = {
  wallets: PlayerWallet[];
  onLogout: () => void;
};

type HeaderActionsProps = {
  appearance: PartnerAppearance;
  lang: GameLanguage;
  onLangChange: (lang: GameLanguage) => void;
  onLogout: () => void;
  onToggleAppearance: () => void;
  onNavigate?: () => void;
};

const formatBalance = (balance: string, decimals: number): string => {
  const value = Number(balance);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const HeaderActions = ({
  appearance,
  lang,
  onLangChange,
  onLogout,
  onToggleAppearance,
  onNavigate,
}: HeaderActionsProps) => {
  const themeTooltip = appearance === 'dark' ? 'Light mode' : 'Dark mode';

  return (
    <>
      <Button size="2" variant="soft" color="gray" asChild>
        <Link to="/verification" onClick={onNavigate}>
          Verification
        </Link>
      </Button>
      <IconButton
        size="2"
        variant="soft"
        color="gray"
        aria-label={themeTooltip}
        onClick={onToggleAppearance}
      >
        {appearance === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      </IconButton>
      <LanguageSelector value={lang} onChange={onLangChange} />
      <Button
        size="2"
        variant="soft"
        color="gray"
        onClick={() => {
          onNavigate?.();
          onLogout();
        }}
      >
        Logout
      </Button>
    </>
  );
};

export const PartnerHeader = ({ wallets, onLogout }: PartnerHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lang = usePartnerPrefsStore((s) => s.lang);
  const setLang = usePartnerPrefsStore((s) => s.setLang);
  const currency = usePartnerPrefsStore((s) => s.currency);
  const setCurrency = usePartnerPrefsStore((s) => s.setCurrency);
  const appearance = usePartnerPrefsStore((s) => s.appearance);
  const toggleAppearance = usePartnerPrefsStore((s) => s.toggleAppearance);
  const activeWallet =
    wallets.find((wallet) => wallet.currency === currency) ?? wallets[0];

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const actionsProps: HeaderActionsProps = {
    appearance,
    lang,
    onLangChange: setLang,
    onLogout,
    onToggleAppearance: toggleAppearance,
  };

  return (
    <Flex className="partner-header" align="center" px="4" py="3">
      <Flex className="partner-header__side" align="center">
        <Link to="/" className="partner-header__logo" aria-label="Home">
          <img
            src="/sample-logo.svg"
            alt="Fake Partner"
            className="partner-header__logo-image"
          />
        </Link>
      </Flex>
      <Flex className="partner-header__center" justify="center">
        {activeWallet && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button type="button" className="partner-header__balance">
                <Flex align="center" gap="2">
                  <CurrencyFlagIcon currency={activeWallet.currency} />
                  <Text size="3" weight="medium">
                    {formatBalance(activeWallet.balance, activeWallet.decimals)}
                  </Text>
                  <CaretDownIcon size={14} className="partner-header__caret" />
                </Flex>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="center">
              {wallets.map((wallet) => (
                <DropdownMenu.Item
                  key={wallet.currency}
                  onSelect={() => setCurrency(wallet.currency)}
                >
                  <Flex align="center" gap="2">
                    <CurrencyFlagIcon currency={wallet.currency} />
                    <Text size="2">
                      {wallet.currency}{' '}
                      {formatBalance(wallet.balance, wallet.decimals)}
                    </Text>
                  </Flex>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      </Flex>
      <Flex
        className="partner-header__side"
        align="center"
        justify="end"
        gap="3"
      >
        <Flex className="partner-header__actions" align="center" gap="3">
          <HeaderActions {...actionsProps} />
        </Flex>
        <Dialog.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <IconButton
            className="partner-header__menu-btn"
            size="2"
            variant="soft"
            color="gray"
            aria-label="Open menu"
            onClick={() => setIsMenuOpen(true)}
          >
            <ListIcon size={20} />
          </IconButton>
          <Dialog.Content className="partner-header__drawer">
            <Flex
              className="partner-header__drawer-header"
              align="center"
              justify="between"
            >
              <Dialog.Title mb="0">Menu</Dialog.Title>
              <Dialog.Close>
                <IconButton
                  size="2"
                  variant="soft"
                  color="gray"
                  aria-label="Close menu"
                >
                  <XIcon size={16} />
                </IconButton>
              </Dialog.Close>
            </Flex>
            <Flex
              className="partner-header__drawer-actions"
              direction="column"
              align="stretch"
              gap="3"
            >
              <HeaderActions {...actionsProps} onNavigate={closeMenu} />
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
    </Flex>
  );
};

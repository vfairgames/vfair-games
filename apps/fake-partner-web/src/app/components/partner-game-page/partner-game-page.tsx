import { getAvailableGame, type GameId } from '@vfair/game-contracts';
import {
  Button,
  Callout,
  Flex,
  IconButton,
  Spinner,
  Switch,
  Text,
} from '@radix-ui/themes';
import { XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { GameLanguage } from '../language-selector/language-selector';
import { PartnerHeader } from '../partner-header/partner-header';
import { useAuthStore } from '../../auth/auth-store';
import { usePartnerProfile } from '../../auth/use-partner-profile';
import {
  type GameLaunchMode,
  launchGame,
} from '../../services/partner-api.service';
import {
  type PartnerAppearance,
  usePartnerPrefsStore,
} from '../../store/partner-prefs-store';
import './partner-game-page.scss';

type PartnerGamePageProps = {
  gameId: GameId;
};

const parseGameMode = (value: string | null): GameLaunchMode | null =>
  value === 'demo' || value === 'real' ? value : null;

export const PartnerGamePage = ({ gameId }: PartnerGamePageProps) => {
  const gameName = getAvailableGame(gameId)?.name ?? gameId;
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const lang = usePartnerPrefsStore((s) => s.lang);
  const currency = usePartnerPrefsStore((s) => s.currency);
  const appearance = usePartnerPrefsStore((s) => s.appearance);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMode = parseGameMode(searchParams.get('mode'));

  const [gameMode, setGameMode] = useState<GameLaunchMode>(urlMode ?? 'demo');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchingMode, setLaunchingMode] = useState<GameLaunchMode | null>(
    null,
  );
  const launchedLangRef = useRef<GameLanguage | null>(null);
  const launchedCurrencyRef = useRef<string | null>(null);
  const launchedAppearanceRef = useRef<PartnerAppearance | null>(null);
  const launchInFlightRef = useRef(false);

  const { data, isLoading, isFetched } = usePartnerProfile();

  const handleLogout = () => {
    logout();
    navigate('/sign-in', { replace: true });
  };

  const handleClose = () => {
    navigate('/');
  };

  const loadGame = async (
    mode: GameLaunchMode,
    launchLang: GameLanguage = lang,
    launchCurrency: string = currency,
    launchAppearance: PartnerAppearance = appearance,
  ): Promise<boolean> => {
    if (!token) {
      return false;
    }

    setLaunchError(null);
    setLaunchingMode(mode);

    const result = await launchGame(token, {
      gameId,
      currency: launchCurrency,
      mode,
      lang: launchLang,
      appearance: launchAppearance,
    });

    setLaunchingMode(null);

    if ('error' in result) {
      setLaunchError(result.error);
      setIframeSrc(null);
      return false;
    }

    launchedLangRef.current = launchLang;
    launchedCurrencyRef.current = launchCurrency;
    launchedAppearanceRef.current = launchAppearance;
    setIframeSrc(result.url);
    return true;
  };

  const setModeParam = (mode: GameLaunchMode) => {
    setSearchParams({ mode }, { replace: true });
  };

  const clearModeParam = () => {
    setSearchParams({}, { replace: true });
  };

  const applyGameMode = async (mode: GameLaunchMode) => {
    if (!iframeSrc) {
      setModeParam(mode);
      return;
    }

    if (mode === gameMode) {
      return;
    }

    const success = await loadGame(mode);
    if (success) {
      setGameMode(mode);
      setModeParam(mode);
    }
  };

  useEffect(() => {
    if (isFetched && !data) {
      logout();
      navigate('/sign-in', { replace: true });
    }
  }, [isFetched, data, logout, navigate]);

  useEffect(() => {
    if (!token || !data || !urlMode || iframeSrc || launchInFlightRef.current) {
      return;
    }

    launchInFlightRef.current = true;
    setGameMode(urlMode);

    void loadGame(urlMode).then((success) => {
      launchInFlightRef.current = false;
      if (!success) {
        clearModeParam();
      }
    });
  }, [token, data, urlMode, iframeSrc]);

  useEffect(() => {
    if (iframeSrc) {
      setIsIframeLoading(true);
    }
  }, [iframeSrc]);

  useEffect(() => {
    if (!iframeSrc) {
      return;
    }
    if (
      launchedLangRef.current === lang &&
      launchedCurrencyRef.current === currency &&
      launchedAppearanceRef.current === appearance
    ) {
      return;
    }
    void loadGame(gameMode, lang, currency, appearance);
  }, [lang, currency, appearance]);

  if (isLoading || !data) {
    return (
      <Flex className="partner-game-page" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Flex className="partner-game-page" direction="column" height="100%">
      <PartnerHeader wallets={data.wallets} onLogout={handleLogout} />
      <Flex
        className="partner-game-page__frame"
        direction="column"
        flexGrow="1"
      >
        <Flex
          className="partner-game-page__container"
          direction="column"
          flexGrow="1"
        >
          <Flex className="partner-game-page__container-header" align="center">
            <Flex
              className="partner-game-page__container-header-side"
              align="center"
            >
              <Flex
                className="partner-game-page__mode-switch"
                align="center"
                gap="2"
              >
                <Text
                  size="2"
                  weight={gameMode === 'demo' ? 'medium' : 'regular'}
                  color={gameMode === 'demo' ? undefined : 'gray'}
                >
                  Demo
                </Text>
                <Switch
                  checked={gameMode === 'real'}
                  disabled={!iframeSrc || launchingMode !== null}
                  onCheckedChange={(checked) =>
                    void applyGameMode(checked ? 'real' : 'demo')
                  }
                />
                <Text
                  size="2"
                  weight={gameMode === 'real' ? 'medium' : 'regular'}
                  color={gameMode === 'real' ? undefined : 'gray'}
                >
                  Real
                </Text>
              </Flex>
            </Flex>
            <Text
              className="partner-game-page__container-header-title"
              size="3"
              weight="medium"
            >
              {gameName}
            </Text>
            <Flex
              className="partner-game-page__container-header-side"
              justify="end"
            >
              <IconButton
                type="button"
                size="2"
                variant="soft"
                color="gray"
                aria-label="Close game"
                onClick={handleClose}
              >
                <XIcon size={16} />
              </IconButton>
            </Flex>
          </Flex>
          <Flex className="partner-game-page__body" flexGrow="1">
            {iframeSrc ? (
              <div className="partner-game-page__iframe-wrap">
                {isIframeLoading ? (
                  <Flex
                    className="partner-game-page__iframe-loading"
                    align="center"
                    justify="center"
                  >
                    <Spinner size="3" />
                  </Flex>
                ) : null}
                <iframe
                  title={gameName}
                  src={iframeSrc}
                  className="partner-game-page__iframe"
                  onLoad={() => setIsIframeLoading(false)}
                />
              </div>
            ) : urlMode ? (
              <Flex
                className="partner-game-page__controls"
                direction="column"
                align="center"
                justify="center"
                gap="4"
                flexGrow="1"
              >
                <Spinner size="3" />
              </Flex>
            ) : (
              <Flex
                className="partner-game-page__controls"
                direction="column"
                align="center"
                justify="center"
                gap="4"
                flexGrow="1"
              >
                {launchError ? (
                  <Callout.Root color="red" size="1">
                    <Callout.Text>{launchError}</Callout.Text>
                  </Callout.Root>
                ) : null}
                <Flex gap="3">
                  <Button
                    size="3"
                    variant="soft"
                    onClick={() => setModeParam('demo')}
                  >
                    Demo
                  </Button>
                  <Button size="3" onClick={() => setModeParam('real')}>
                    Real
                  </Button>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

import { Callout, Flex, Spinner } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { GameLanguage } from '../../components/language-selector/language-selector';
import { PartnerHeader } from '../../components/partner-header/partner-header';
import { useAuthStore } from '../../auth/auth-store';
import { usePartnerProfile } from '../../auth/use-partner-profile';
import { launchVerification } from '../../services/partner-api.service';
import {
  type PartnerAppearance,
  usePartnerPrefsStore,
} from '../../store/partner-prefs-store';
import './verification-page.scss';

export const VerificationPage = () => {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const lang = usePartnerPrefsStore((s) => s.lang);
  const appearance = usePartnerPrefsStore((s) => s.appearance);
  const navigate = useNavigate();

  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const launchedLangRef = useRef<GameLanguage | null>(null);
  const launchedAppearanceRef = useRef<PartnerAppearance | null>(null);
  const hasAutoLaunchedRef = useRef(false);

  const { data, isLoading, isFetched } = usePartnerProfile();
  const handleLogout = () => {
    logout();
    navigate('/sign-in', { replace: true });
  };

  const loadVerification = async (
    launchLang: GameLanguage = lang,
    launchAppearance: PartnerAppearance = appearance,
  ): Promise<boolean> => {
    if (!token) {
      return false;
    }

    setLaunchError(null);
    setIsLaunching(true);

    const result = await launchVerification(token, {
      lang: launchLang,
      appearance: launchAppearance,
    });

    setIsLaunching(false);

    if ('error' in result) {
      setLaunchError(result.error);
      setIframeSrc(null);
      return false;
    }

    launchedLangRef.current = launchLang;
    launchedAppearanceRef.current = launchAppearance;
    setIframeSrc(result.url);
    return true;
  };

  useEffect(() => {
    if (isFetched && !data) {
      logout();
      navigate('/sign-in', { replace: true });
    }
  }, [isFetched, data, logout, navigate]);

  useEffect(() => {
    if (!data || !token || hasAutoLaunchedRef.current) {
      return;
    }
    hasAutoLaunchedRef.current = true;
    void loadVerification(lang, appearance);
  }, [data, token]);

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
      launchedAppearanceRef.current === appearance
    ) {
      return;
    }
    void loadVerification(lang, appearance);
  }, [lang, appearance]);

  if (isLoading || !data) {
    return (
      <Flex className="verification-page" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Flex className="verification-page" direction="column" height="100%">
      <PartnerHeader wallets={data.wallets} onLogout={handleLogout} />
      <Flex className="verification-page__body" flexGrow="1">
        {iframeSrc ? (
          <div className="verification-page__iframe-wrap">
            {isIframeLoading ? (
              <Flex
                className="verification-page__iframe-loading"
                align="center"
                justify="center"
              >
                <Spinner size="3" />
              </Flex>
            ) : null}
            <iframe
              title="Verification"
              src={iframeSrc}
              className="verification-page__iframe"
              onLoad={() => setIsIframeLoading(false)}
            />
          </div>
        ) : (
          <Flex
            className="verification-page__status"
            direction="column"
            align="center"
            justify="center"
            gap="3"
            flexGrow="1"
          >
            {launchError ? (
              <Callout.Root color="red" size="1">
                <Callout.Text>{launchError}</Callout.Text>
              </Callout.Root>
            ) : null}
            {isLaunching ? <Spinner size="3" /> : null}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};

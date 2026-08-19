import { Button, Flex, IconButton, Text } from '@radix-ui/themes';
import { ArrowsInIcon, ArrowsOutIcon } from '@phosphor-icons/react';
import {
  AVAILABLE_GAMES,
  getAvailableGame,
  isAvailableGameId,
  type GameId,
} from '@vfair/game-contracts';
import { PARTNER_THEME_PREVIEW_MESSAGE_TYPE } from '@vfair/radix-palette';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isPreviewLanguage,
  PREVIEW_LANGUAGE_OPTIONS,
  type PreviewLanguage,
} from '../partner-theme-editor/partner-theme-editor-helpers';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import { FormSelect } from '../form-select/form-select';
import type { PartnerCurrency } from '../../services/admin-api.service';
import './partner-theme-editor-preview.scss';

type PartnerThemeEditorPreviewProps = {
  previewSrc: string;
  previewCss: string;
  previewLogo: string | null;
  previewOrigin: string;
  previewGameId: GameId;
  onPreviewGameIdChange: (gameId: GameId) => void;
  partnerCurrencies: PartnerCurrency[];
  previewCurrencyCode: string;
  onPreviewCurrencyCodeChange: (code: string) => void;
  previewLang: PreviewLanguage;
  onPreviewLangChange: (lang: PreviewLanguage) => void;
  canCopyPreviewUrl: boolean;
  onCopyPreviewUrl: () => void;
};

export const PartnerThemeEditorPreview = ({
  previewSrc,
  previewCss,
  previewLogo,
  previewOrigin,
  previewGameId,
  onPreviewGameIdChange,
  partnerCurrencies,
  previewCurrencyCode,
  onPreviewCurrencyCodeChange,
  previewLang,
  onPreviewLangChange,
  canCopyPreviewUrl,
  onCopyPreviewUrl,
}: PartnerThemeEditorPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsPreviewFullscreen(
        document.fullscreenElement === previewFrameRef.current,
      );
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, []);

  const postPreviewStyles = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: PARTNER_THEME_PREVIEW_MESSAGE_TYPE,
        css: previewCss,
        logo: previewLogo,
      },
      previewOrigin,
    );
  }, [previewCss, previewLogo, previewOrigin]);

  const togglePreviewFullscreen = async () => {
    const frame = previewFrameRef.current;

    if (!frame) {
      return;
    }

    if (document.fullscreenElement === frame) {
      await document.exitFullscreen();
      return;
    }

    await frame.requestFullscreen();
  };

  const previewGameName =
    getAvailableGame(previewGameId)?.name ?? previewGameId;

  return (
    <Flex direction="column" gap="2" className="partner-theme-editor-preview">
      <Flex
        align="center"
        justify="between"
        gap="2"
        wrap="wrap"
        className="partner-theme-editor-preview__header"
      >
        <Text size="3" weight="medium">
          Preview
        </Text>
        <Flex align="center" gap="2">
          <FormSelect
            value={previewGameId}
            onChange={(value) => {
              if (isAvailableGameId(value)) {
                onPreviewGameIdChange(value);
              }
            }}
            options={AVAILABLE_GAMES.map((game) => ({
              value: game.id,
              label: game.name,
            }))}
            placeholder="Game"
          />
          <FormSelect
            value={previewLang}
            onChange={(value) => {
              if (isPreviewLanguage(value)) {
                onPreviewLangChange(value);
              }
            }}
            options={[...PREVIEW_LANGUAGE_OPTIONS]}
            placeholder="Language"
          />
          <div className="partner-theme-editor-preview__currency-select">
            <ComboboxSelect
              value={previewCurrencyCode}
              onChange={onPreviewCurrencyCodeChange}
              options={partnerCurrencies.map((currency) => ({
                value: currency.code,
                label: currency.code,
                leading: <CurrencyFlagIcon currency={currency.code} />,
              }))}
              placeholder="Currency"
              searchPlaceholder="Search currencies…"
              disabled={partnerCurrencies.length === 0}
            />
          </div>
          <Button
            type="button"
            variant="soft"
            color="gray"
            disabled={!canCopyPreviewUrl}
            onClick={onCopyPreviewUrl}
          >
            Copy preview URL
          </Button>
        </Flex>
      </Flex>
      <div
        ref={previewFrameRef}
        className="partner-theme-editor-preview__frame"
      >
        <IconButton
          type="button"
          variant="soft"
          color="gray"
          size="2"
          className="partner-theme-editor-preview__fullscreen-button"
          aria-label={
            isPreviewFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
          }
          onClick={() => {
            void togglePreviewFullscreen();
          }}
        >
          {isPreviewFullscreen ? (
            <ArrowsInIcon aria-hidden />
          ) : (
            <ArrowsOutIcon aria-hidden />
          )}
        </IconButton>
        <iframe
          ref={iframeRef}
          title={`${previewGameName} game theme preview`}
          src={previewSrc}
          className="partner-theme-editor-preview__iframe"
          onLoad={postPreviewStyles}
        />
      </div>
    </Flex>
  );
};

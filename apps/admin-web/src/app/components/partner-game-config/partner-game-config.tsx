import {
  Button,
  Flex,
  Separator,
  Spinner,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import {
  getAvailableGame,
  KENO_GAME_ID,
  PLINKO_GAME_ID,
} from '@vfair/game-contracts';
import {
  DEFAULT_GAME_RTP,
  MAX_GAME_RTP,
  MIN_GAME_RTP,
  RTP_PERCENT_DECIMALS,
  RTP_DECIMALS,
  roundToDecimals,
} from '@vfair/game-math';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Fragment, useEffect, useState } from 'react';
import {
  usePatchSearchParams,
  useTabQueryParam,
} from '../../hooks/use-query-param';
import {
  fetchPartnerGameConfig,
  updatePartnerGame,
} from '../../services/admin-api.service';
import { toast } from '../../store/toast-store';
import { PartnerGameHelp } from '../partner-game-help/partner-game-help';
import './partner-game-config.scss';

type GameConfigSection = 'game-params' | 'game-help';

const GAME_CONFIG_SECTIONS = [
  { id: 'game-params', label: 'Game params' },
  { id: 'game-help', label: 'Game Help' },
] as const satisfies readonly {
  id: GameConfigSection;
  label: string;
}[];

const GAME_CONFIG_SECTION_IDS = GAME_CONFIG_SECTIONS.map(
  (section) => section.id,
) as readonly GameConfigSection[];

const MIN_RTP_PERCENT = MIN_GAME_RTP * 100;
const MAX_RTP_PERCENT = MAX_GAME_RTP * 100;
const RTP_INPUT_ID = 'partner-game-rtp';

const rtpDecimalToPercent = (rtp: number): string =>
  String(roundToDecimals(rtp * 100, RTP_PERCENT_DECIMALS));

const parseRtpPercent = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = roundToDecimals(parsed, RTP_PERCENT_DECIMALS);
  if (parsed !== rounded) {
    return null;
  }

  return rounded;
};

type PartnerGameParamsConfigProps = {
  partnerId: number;
  gameId: string;
};

const PartnerGameParamsConfig = ({
  partnerId,
  gameId,
}: PartnerGameParamsConfigProps) => {
  const queryClient = useQueryClient();
  const [rtpPercentInput, setRtpPercentInput] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['partner-game-config', partnerId, gameId],
    queryFn: () => fetchPartnerGameConfig(partnerId, gameId),
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setRtpPercentInput(rtpDecimalToPercent(data.rtp));
  }, [data]);

  const savedRtpPercent = data ? rtpDecimalToPercent(data.rtp) : '';

  const rtpPercent = parseRtpPercent(rtpPercentInput);
  const isRtpInputValid =
    rtpPercent !== null &&
    rtpPercent >= MIN_RTP_PERCENT &&
    rtpPercent <= MAX_RTP_PERCENT;
  const isDirty =
    data !== undefined &&
    isRtpInputValid &&
    rtpPercent !== null &&
    rtpPercent !== parseRtpPercent(savedRtpPercent);

  const isAtDefaultRtp =
    data !== undefined &&
    roundToDecimals(data.rtp, RTP_DECIMALS) ===
      roundToDecimals(DEFAULT_GAME_RTP, RTP_DECIMALS);

  const saveMutation = useMutation({
    mutationFn: () => {
      const rtpPercent = parseRtpPercent(rtpPercentInput);
      if (rtpPercent === null) {
        throw new Error('Enter a valid RTP percentage');
      }

      if (rtpPercent < MIN_RTP_PERCENT || rtpPercent > MAX_RTP_PERCENT) {
        throw new Error(
          `RTP must be between ${MIN_RTP_PERCENT}% and ${MAX_RTP_PERCENT}%`,
        );
      }

      const rtp = roundToDecimals(rtpPercent / 100, RTP_DECIMALS);

      return updatePartnerGame(partnerId, gameId, { rtp });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['partner-game-config', partnerId, gameId],
        updated,
      );
      toast.success('Game params saved');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save game params',
      );
    },
  });

  const resetRtpMutation = useMutation({
    mutationFn: () => updatePartnerGame(partnerId, gameId, { rtp: null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['partner-game-config', partnerId, gameId],
        updated,
      );
      toast.success('RTP reset to default');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reset RTP',
      );
    },
  });

  const isSaving = saveMutation.isPending || resetRtpMutation.isPending;

  if (isFetching && !data) {
    return (
      <Flex justify="center" py="4">
        <Spinner size="2" />
      </Flex>
    );
  }

  if (!data) {
    return (
      <Text size="2" color="gray">
        Game configuration is unavailable.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="4" width="100%">
      <Flex direction="column" gap="2">
        <Text as="label" htmlFor={RTP_INPUT_ID} size="2" weight="medium">
          RTP
        </Text>
        <TextField.Root
          id={RTP_INPUT_ID}
          type="number"
          min={MIN_RTP_PERCENT}
          max={MAX_RTP_PERCENT}
          step="0.01"
          value={rtpPercentInput}
          onChange={(event) => setRtpPercentInput(event.target.value)}
        >
          <TextField.Slot side="right">%</TextField.Slot>
        </TextField.Root>
        <Text size="1" color="gray">
          Allowed values: {rtpDecimalToPercent(MIN_GAME_RTP)}% to{' '}
          {rtpDecimalToPercent(MAX_GAME_RTP)}%, up to {RTP_PERCENT_DECIMALS}{' '}
          decimal places. Default: {rtpDecimalToPercent(DEFAULT_GAME_RTP)}%.
        </Text>
      </Flex>

      <Flex gap="2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={isSaving || !isDirty || !isRtpInputValid}
        >
          Save game params
        </Button>
        <Button
          variant="soft"
          color="gray"
          onClick={() => resetRtpMutation.mutate()}
          disabled={isSaving || isAtDefaultRtp}
        >
          Reset to default
        </Button>
      </Flex>
    </Flex>
  );
};

type PartnerGameConfigProps = {
  partnerId: number;
  gameId: string;
};

const GameConfigSectionContent = ({
  section,
  partnerId,
  gameId,
}: {
  section: GameConfigSection;
  partnerId: number;
  gameId: string;
}) => {
  if (section === 'game-help') {
    return <PartnerGameHelp partnerId={partnerId} gameId={gameId} />;
  }

  if (gameId === PLINKO_GAME_ID || gameId === KENO_GAME_ID) {
    const gameName = getAvailableGame(gameId)?.name ?? gameId;

    return (
      <Text size="2" color="gray">
        {gameName} uses fixed multiplier tables.
      </Text>
    );
  }

  return <PartnerGameParamsConfig partnerId={partnerId} gameId={gameId} />;
};

export const PartnerGameConfig = ({
  partnerId,
  gameId,
}: PartnerGameConfigProps) => {
  const patchSearchParams = usePatchSearchParams();
  const gameName = getAvailableGame(gameId)?.name ?? gameId;
  const [activeSection, setActiveSection] = useTabQueryParam(
    'game-params',
    GAME_CONFIG_SECTION_IDS,
    'gameSection',
  );

  return (
    <Flex
      direction="column"
      gap="4"
      align="start"
      className="partner-game-config"
    >
      <Button
        variant="ghost"
        color="gray"
        onClick={() => patchSearchParams({ game: null, gameSection: null })}
      >
        <ArrowLeftIcon size={16} />
        Back to games
      </Button>

      <Flex direction="column" gap="3" width="100%">
        <Text size="4" weight="medium">
          {gameName} configuration
        </Text>
        <Separator size="4" />
      </Flex>

      <Flex gap="4" width="100%" className="partner-game-config__layout">
        <Flex
          direction="column"
          className="partner-game-config__nav"
          role="tablist"
          aria-label={`${gameName} configuration sections`}
        >
          {GAME_CONFIG_SECTIONS.map((section, index) => (
            <Fragment key={section.id}>
              {index > 0 ? <Separator size="4" /> : null}
              <button
                type="button"
                className={clsx(
                  'partner-game-config__nav-button',
                  activeSection === section.id &&
                    'partner-game-config__nav-button--active',
                )}
                role="tab"
                aria-selected={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            </Fragment>
          ))}
        </Flex>

        <Flex
          direction="column"
          gap="2"
          flexGrow="1"
          className="partner-game-config__content"
          role="tabpanel"
        >
          <Text size="3" weight="medium">
            {
              GAME_CONFIG_SECTIONS.find(
                (section) => section.id === activeSection,
              )?.label
            }
          </Text>
          <GameConfigSectionContent
            section={activeSection}
            partnerId={partnerId}
            gameId={gameId}
          />
        </Flex>
      </Flex>
    </Flex>
  );
};

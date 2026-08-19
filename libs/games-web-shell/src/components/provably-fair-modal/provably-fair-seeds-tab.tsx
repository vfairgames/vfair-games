import { Button, Flex, Grid, Text, TextField, Tooltip } from '@radix-ui/themes';
import { useId, useMemo } from 'react';

import { formatActiveRoundsMessage } from '../../fairness/format-active-rounds-message';
import { useTranslation } from '../../i18n/i18n';
import { useFairnessStore } from '../../store/fairness-store/fairness-store';
import { CopyableTextField } from '../copyable-text-field/copyable-text-field';

import './provably-fair-seeds-tab.scss';

type ProvablyFairSeedsTabProps = {
  isApplying: boolean;
  isLoading: boolean;
  newClientSeed: string;
  nextServerSeedHash: string;
  onNewClientSeedChange: (value: string) => void;
  onApplySeedPair: () => Promise<void>;
};

export const ProvablyFairSeedsTab = ({
  isApplying,
  isLoading,
  newClientSeed,
  nextServerSeedHash,
  onNewClientSeedChange,
  onApplySeedPair,
}: ProvablyFairSeedsTabProps) => {
  const newClientSeedInputId = useId();
  const { t } = useTranslation();
  const clientSeed = useFairnessStore((state) => state.clientSeed);
  const serverSeedHash = useFairnessStore((state) => state.serverSeedHash);
  const nonce = useFairnessStore((state) => state.nonce);
  const activeRounds = useFairnessStore((state) => state.activeRounds);
  const trimmedClientSeed = newClientSeed.trim();
  const hasActiveRound = activeRounds.length > 0;
  const activeRoundMessage = useMemo(
    () => formatActiveRoundsMessage(activeRounds),
    [activeRounds],
  );
  const isActionDisabled =
    isLoading || isApplying || hasActiveRound || !trimmedClientSeed;

  const handleApplySeedPair = () => {
    void onApplySeedPair();
  };

  const applyButton = (
    <Button
      disabled={isActionDisabled}
      loading={isApplying}
      size="3"
      onClick={handleApplySeedPair}
    >
      {t('shellUseNewSeedPair')}
    </Button>
  );

  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="3">
        <CopyableTextField
          label={t('shellActiveClientSeed')}
          value={clientSeed}
        />
        <CopyableTextField
          label={t('shellActiveServerSeedCommitment')}
          value={serverSeedHash}
        />
        <CopyableTextField
          label={t('shellTotalBetsMadeWithPairNonce')}
          value={String(nonce)}
        />
      </Flex>

      <Text align="center" size="3" weight="medium">
        {t('shellChangeSeedPair')}
      </Text>

      <Grid columns={{ initial: '1', sm: '2' }} gap="3" align="end">
        <Flex direction="column" gap="1">
          <Flex align="end" gap="1">
            <Text
              as="label"
              htmlFor={newClientSeedInputId}
              size="2"
              weight="medium"
            >
              {t('shellNewClientSeed')}
            </Text>
            <Text size="2" color="red">
              *
            </Text>
          </Flex>
          <TextField.Root
            id={newClientSeedInputId}
            disabled={isLoading || isApplying}
            size="3"
            value={newClientSeed}
            onChange={(event) => onNewClientSeedChange(event.target.value)}
          />
        </Flex>
        <CopyableTextField
          label={t('shellNextServerSeedCommitment')}
          value={nextServerSeedHash}
        />
      </Grid>

      {hasActiveRound && activeRoundMessage ? (
        <Tooltip content={activeRoundMessage}>
          <span className="provably-fair-seeds-tab__apply-tooltip-target">
            {applyButton}
          </span>
        </Tooltip>
      ) : (
        applyButton
      )}
    </Flex>
  );
};

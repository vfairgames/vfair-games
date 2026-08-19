import { Button, Dialog, Flex, IconButton } from '@radix-ui/themes';
import { BookOpenIcon, XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { fairnessService } from '../../services/fairness.service';
import { translate, useTranslation } from '../../i18n/i18n';
import { toastService } from '../../services/toast.service';
import { useFairnessStore } from '../../store/fairness-store/fairness-store';
import { SegmentedTabs } from '../segmented-tabs/segmented-tabs';
import { useProvablyFairModal } from './provably-fair-modal-store';
import { ProvablyFairSeedsTab } from './provably-fair-seeds-tab';

import './provably-fair-modal.scss';

const toastFairnessError = (error: unknown): void => {
  toastService.error(
    error instanceof Error ? error.message : translate('shellUnknownError'),
  );
};

type ProvablyFairTab = 'seeds' | 'bet-history';

type ProvablyFairModalProps = {
  betHistoryTab?: ReactNode;
};

export const ProvablyFairModal = ({
  betHistoryTab,
}: ProvablyFairModalProps) => {
  const isOpen = useProvablyFairModal((state) => state.isOpen);
  const open = useProvablyFairModal((state) => state.open);
  const close = useProvablyFairModal((state) => state.close);
  const [activeTab, setActiveTab] = useState<ProvablyFairTab>('seeds');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const nextSeedPair = useFairnessStore((state) => state.nextSeedPair);
  const patchNextSeedPair = useFairnessStore(
    (state) => state.patchNextSeedPair,
  );
  const hasActiveRound = useFairnessStore(
    (state) => state.activeRounds.length > 0,
  );
  const { t } = useTranslation();
  const tabItems = [
    { label: t('shellSeeds'), value: 'seeds' as const },
    { label: t('shellBetHistory'), value: 'bet-history' as const },
  ];

  const syncModal = useCallback(async () => {
    setIsLoading(true);

    try {
      await Promise.all([
        fairnessService.syncNextSeedPair(),
        fairnessService.syncActiveRounds(),
      ]);
    } catch (error: unknown) {
      toastFairnessError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('seeds');
    void syncModal();
  }, [isOpen, syncModal]);

  const handleApplySeedPair = async () => {
    const trimmedClientSeed = nextSeedPair.newClientSeed.trim();
    if (!trimmedClientSeed || isApplying || hasActiveRound) {
      return;
    }

    setIsApplying(true);

    try {
      await fairnessService.applySeedPair(trimmedClientSeed);
      await syncModal();
    } catch (error: unknown) {
      toastFairnessError(error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(nextOpen) => (nextOpen ? open() : close())}
    >
      <Dialog.Content maxWidth="640px" aria-describedby={undefined}>
        <Flex align="center" justify="between" mb="4">
          <Dialog.Title size="4" mb="0">
            {t('shellProvablyFair')}
          </Dialog.Title>
          <Dialog.Close>
            <IconButton variant="soft" size="2" aria-label={t('shellClose')}>
              <XIcon size={14} />
            </IconButton>
          </Dialog.Close>
        </Flex>

        <Flex align="center" gap="3" mb="4">
          <SegmentedTabs
            ariaLabel={t('shellProvablyFairSections')}
            className="provably-fair-modal__tabs"
            items={tabItems}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ProvablyFairTab)}
          />
          <Button variant="outline" size="2">
            <BookOpenIcon size={14} />
            {t('shellTutorial')}
          </Button>
        </Flex>

        {activeTab === 'seeds' ? (
          <ProvablyFairSeedsTab
            isApplying={isApplying}
            isLoading={isLoading}
            newClientSeed={nextSeedPair.newClientSeed}
            nextServerSeedHash={nextSeedPair.nextServerSeedHash}
            onNewClientSeedChange={(newClientSeed) =>
              patchNextSeedPair({ newClientSeed })
            }
            onApplySeedPair={handleApplySeedPair}
          />
        ) : (
          betHistoryTab
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};

import { useEffect, useState, type ReactNode } from 'react';

import { WrenchIcon } from '@phosphor-icons/react';
import { Flex, Spinner, Text } from '@radix-ui/themes';

import { initializeTranslations, translate } from '../i18n/i18n';
import { sessionService } from '../services/session.service';
import { useMainStore } from '../store/main-store/main-store';

type Props = {
  children: ReactNode;
  gameSettingsError?: string | null;
};

export const SessionGate = ({ children, gameSettingsError = null }: Props) => {
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const status = useMainStore((s) => s.status);
  const errorMessage = useMainStore((s) => s.error);
  const underMaintenance = useMainStore((s) => s.underMaintenance);
  const blockingError = gameSettingsError ?? bootstrapError;

  useEffect(() => {
    if (gameSettingsError) {
      return;
    }

    let active = true;

    const initialize = async () => {
      try {
        await initializeTranslations(useMainStore.getState().lang);
        if (active) {
          await sessionService.initialize();
        }
      } catch (error) {
        if (!active) return;
        setBootstrapError(
          error instanceof Error ? error.message : 'Application load failed',
        );
      }
    };

    void initialize();

    return () => {
      active = false;
      sessionService.disconnect();
    };
  }, [gameSettingsError]);

  if (blockingError) {
    return (
      <Flex align="center" justify="center" height="100vh">
        <Text color="red">{blockingError}</Text>
      </Flex>
    );
  }

  if (underMaintenance) {
    return (
      <Flex
        align="center"
        direction="column"
        gap="4"
        height="100dvh"
        justify="center"
        px="4"
      >
        <WrenchIcon aria-hidden size={48} />
        <Text align="center" color="gray" size="3">
          {translate('shellUnderMaintenance')}
        </Text>
      </Flex>
    );
  }

  if (status === 'ready') return children;
  if (status === 'error')
    return (
      <Flex align="center" justify="center" height="100vh">
        <Text color="red">
          {errorMessage ?? translate('shellUnknownError')}
        </Text>
      </Flex>
    );
  return (
    <Flex align="center" justify="center" height="100vh">
      <Spinner size="3" />
    </Flex>
  );
};

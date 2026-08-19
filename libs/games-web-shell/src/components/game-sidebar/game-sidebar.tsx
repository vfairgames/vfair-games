import { Flex } from '@radix-ui/themes';
import type { ReactNode } from 'react';

import { useTranslation } from '../../i18n/i18n';
import type { BetMode } from '../../store/game-store/bet-types';
import { SegmentedTabs } from '../segmented-tabs/segmented-tabs';
import './game-sidebar.scss';

type GameSidebarProps = {
  manualContent: ReactNode;
  autoContent: ReactNode;
  mode: BetMode;
  onModeChange: (mode: BetMode) => void;
  modeChangeDisabled?: boolean;
};

export const GameSidebar = ({
  manualContent,
  autoContent,
  mode,
  onModeChange,
  modeChangeDisabled = false,
}: GameSidebarProps) => {
  const { t } = useTranslation();
  const tabItems = [
    { label: t('shellManual'), value: 'manual' as const },
    { label: t('shellAuto'), value: 'auto' as const },
  ];

  return (
    <Flex
      className="game-sidebar"
      p="3"
      gap="2"
      height="100%"
      direction="column"
    >
      <div className="game-sidebar__tabs">
        <SegmentedTabs
          ariaLabel={t('shellPlayMode')}
          items={tabItems.map((item) => ({
            ...item,
            disabled: modeChangeDisabled,
          }))}
          value={mode}
          onValueChange={onModeChange}
        />
      </div>
      <div className="game-sidebar__body">
        {mode === 'manual' ? manualContent : autoContent}
      </div>
    </Flex>
  );
};

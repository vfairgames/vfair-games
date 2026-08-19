import { Badge } from '@radix-ui/themes';

import { useTranslation } from '../../i18n/i18n';
import { useMainStore } from '../../store/main-store/main-store';

export const DemoModeIndicator = () => {
  const { t } = useTranslation();
  const isDemo = useMainStore((state) => state.isDemo);

  if (!isDemo) {
    return null;
  }

  return (
    <Badge
      size="1"
      variant="soft"
      color="amber"
      role="status"
      aria-label={t('shellFunPlay')}
    >
      {t('shellFunPlay')}
    </Badge>
  );
};

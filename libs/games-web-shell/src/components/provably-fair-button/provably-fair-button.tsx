import { Button } from '@radix-ui/themes';
import { LockIcon } from '@phosphor-icons/react';

import { useTranslation } from '../../i18n/i18n';
import { useProvablyFairModal } from '../provably-fair-modal/provably-fair-modal-store';

export const ProvablyFairButton = () => {
  const { t } = useTranslation();
  const open = useProvablyFairModal((state) => state.open);

  return (
    <Button variant="outline" size="1" onClick={open}>
      <LockIcon size={14} />
      {t('shellProvablyFair')}
    </Button>
  );
};

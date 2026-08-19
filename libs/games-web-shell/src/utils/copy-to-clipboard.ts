import { translate } from '../i18n/i18n';
import { toastService } from '../services/toast.service';

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    toastService.info(translate('shellCopied'));
  } catch {
    toastService.error(translate('shellCopyFailed'));
  }
};

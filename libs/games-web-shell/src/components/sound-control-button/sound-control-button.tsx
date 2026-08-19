import { IconButton, Tooltip } from '@radix-ui/themes';
import { SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react';

import { useTranslation } from '../../i18n/i18n';
import { useSoundStore } from '../../store/sound-store/sound-store';

export const SoundControlButton = () => {
  const { t } = useTranslation();
  const muted = useSoundStore((state) => state.muted);
  const toggleMuted = useSoundStore((state) => state.toggleMuted);
  const label = muted ? t('shellUnmute') : t('shellMute');

  return (
    <Tooltip content={label}>
      <IconButton
        variant="ghost"
        size="1"
        aria-label={label}
        aria-pressed={muted}
        onClick={toggleMuted}
      >
        {muted ? <SpeakerSlashIcon size={14} /> : <SpeakerHighIcon size={14} />}
      </IconButton>
    </Tooltip>
  );
};

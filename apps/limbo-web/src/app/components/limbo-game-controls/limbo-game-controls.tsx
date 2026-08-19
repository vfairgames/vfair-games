import { TextField } from '@radix-ui/themes';
import { PercentIcon, XIcon } from '@phosphor-icons/react';

import { NumericInput, useTranslation } from '@vfair/games-web-shell';

import { useIsLimboAutoBetInProgress } from '../../query/use-is-limbo-bet-in-progress';
import { useLimboForm } from '../../store/hooks/use-limbo-form';

import './limbo-game-controls.scss';

export const LimboGameControls = () => {
  const { t } = useTranslation();
  const { form, errors, patch } = useLimboForm();
  const isAutoBetInProgress = useIsLimboAutoBetInProgress();

  return (
    <div className="limbo-game-controls">
      <NumericInput
        label={t('limboTargetMultiplier')}
        error={errors.targetMultiplier}
        value={form.targetMultiplier}
        fractionDigits={2}
        step={1}
        disabled={isAutoBetInProgress}
        onChange={(targetMultiplier) => patch({ targetMultiplier })}
      >
        <TextField.Slot side="right">
          <XIcon size={14} />
        </TextField.Slot>
      </NumericInput>

      <NumericInput
        label={t('limboWinChance')}
        error={errors.winChance}
        value={form.winChance}
        fractionDigits={8}
        step={1}
        disabled={isAutoBetInProgress}
        onChange={(winChance) => patch({ winChance })}
      >
        <TextField.Slot side="right">
          <PercentIcon size={14} />
        </TextField.Slot>
      </NumericInput>
    </div>
  );
};

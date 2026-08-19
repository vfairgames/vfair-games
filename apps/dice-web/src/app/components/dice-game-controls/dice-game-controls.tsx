import { IconButton, TextField } from '@radix-ui/themes';
import {
  ArrowsCounterClockwiseIcon,
  PercentIcon,
  XIcon,
} from '@phosphor-icons/react';

import { NumericInput, useTranslation } from '@vfair/games-web-shell';

import { useIsDiceAutoBetInProgress } from '../../query/use-is-dice-bet-in-progress';
import { diceSoundService } from '../../services/dice-sound.service';
import { useDiceForm } from '../../store/hooks/use-dice-form';

import './dice-game-controls.scss';

export const DiceGameControls = () => {
  const { t } = useTranslation();
  const { form, errors, patch } = useDiceForm();
  const isAutoBetInProgress = useIsDiceAutoBetInProgress();

  const toggleGameMode = () => {
    diceSoundService.playAction();
    patch({
      gameMode: form.gameMode === 'rollOver' ? 'rollUnder' : 'rollOver',
    });
  };

  return (
    <div className="dice-game-controls">
      <NumericInput
        label={t('diceMultiplier')}
        error={errors.multiplier}
        value={form.multiplier}
        fractionDigits={4}
        step={1}
        disabled={isAutoBetInProgress}
        onChange={(multiplier) => patch({ multiplier })}
      >
        <TextField.Slot side="right">
          <XIcon size={14} />
        </TextField.Slot>
      </NumericInput>

      <NumericInput
        label={
          form.gameMode === 'rollOver' ? t('diceRollOver') : t('diceRollUnder')
        }
        error={errors.sliderValue}
        value={form.sliderValue}
        fractionDigits={2}
        step={1}
        disabled={isAutoBetInProgress}
        onChange={(sliderValue) => patch({ sliderValue })}
      >
        <TextField.Slot side="right" className="dice-game-controls__roll_slot">
          <IconButton
            size="2"
            variant="soft"
            disabled={isAutoBetInProgress}
            onClick={toggleGameMode}
          >
            <ArrowsCounterClockwiseIcon size={14} />
          </IconButton>
        </TextField.Slot>
      </NumericInput>

      <NumericInput
        label={t('diceWinChance')}
        error={errors.winChance}
        value={form.winChance}
        fractionDigits={4}
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

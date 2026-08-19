import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LANGUAGE_CODE_LIST, type Language } from '@vfair/app-common';

const LAUNCH_MODES = ['real', 'demo'] as const;
const APPEARANCES = ['light', 'dark'] as const;

export type LaunchGameMode = (typeof LAUNCH_MODES)[number];
type LaunchAppearance = (typeof APPEARANCES)[number];

export class LaunchGameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  gameId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  currency!: string;

  @IsString()
  @IsIn(LAUNCH_MODES)
  mode!: LaunchGameMode;

  @IsOptional()
  @IsString()
  @IsIn(LANGUAGE_CODE_LIST)
  lang?: Language;

  @IsOptional()
  @IsString()
  @IsIn(APPEARANCES)
  appearance?: LaunchAppearance;
}

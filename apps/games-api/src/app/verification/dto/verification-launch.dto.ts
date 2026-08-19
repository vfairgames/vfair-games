import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LANGUAGE_CODE_LIST, type Language } from '@vfair/app-common';

const APPEARANCES = ['light', 'dark'] as const;

type LaunchAppearance = (typeof APPEARANCES)[number];

export class VerificationLaunchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  partnerCode!: string;

  @IsOptional()
  @IsString()
  @IsIn(LANGUAGE_CODE_LIST)
  lang?: Language;

  @IsOptional()
  @IsString()
  @IsIn(APPEARANCES)
  appearance?: LaunchAppearance;
}

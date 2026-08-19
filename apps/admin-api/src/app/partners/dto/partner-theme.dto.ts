import { IsBoolean, IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { ThemeAppearance } from '@vfair/radix-palette';

export class PartnerThemeDto {
  @IsString()
  @IsNotEmpty()
  lightAccent!: string;

  @IsString()
  @IsNotEmpty()
  lightGray!: string;

  @IsString()
  @IsNotEmpty()
  lightBg!: string;

  @IsString()
  @IsNotEmpty()
  darkAccent!: string;

  @IsString()
  @IsNotEmpty()
  darkGray!: string;

  @IsString()
  @IsNotEmpty()
  darkBg!: string;

  @IsIn(['light', 'dark'])
  defaultAppearance!: ThemeAppearance;

  @IsBoolean()
  themeSwitcherEnabled!: boolean;
}

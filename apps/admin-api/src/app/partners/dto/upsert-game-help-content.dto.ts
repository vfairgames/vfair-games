import { IsString, MaxLength } from 'class-validator';

export class UpsertGameHelpContentDto {
  @IsString()
  @MaxLength(100_000)
  html!: string;
}

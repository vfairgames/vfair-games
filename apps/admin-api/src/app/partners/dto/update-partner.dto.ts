import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePartnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @ValidateIf((_object, value) => value != null && String(value).trim() !== '')
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  lobbyUrl?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value != null && String(value).trim() !== '')
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  webhookUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  ipWhitelist?: string;
}

import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsInt()
  @IsOptional()
  roleId?: number;

  @ValidateIf((o: UpdateUserDto) => o.partnerId !== null)
  @IsInt()
  @IsOptional()
  partnerId?: number | null;
}

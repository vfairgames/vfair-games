import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ValidateIf((dto: UpdateProfileDto) => !!dto.password)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;
}

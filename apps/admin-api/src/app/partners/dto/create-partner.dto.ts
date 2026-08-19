import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

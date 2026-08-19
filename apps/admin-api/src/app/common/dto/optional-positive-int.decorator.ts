import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export const OptionalPositiveInt = () =>
  applyDecorators(
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
  );

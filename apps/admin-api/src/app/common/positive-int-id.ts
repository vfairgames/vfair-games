import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  Param,
  type PipeTransform,
} from '@nestjs/common';

export const parsePositiveInt = (value: string, label = 'id'): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException({
      err_code: 'invalid_id',
      message: `Invalid ${label}`,
    });
  }
  return parsed;
};

@Injectable()
export class PositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    return parsePositiveInt(value, metadata.data);
  }
}

export const IntParam = (property: string) => Param(property, PositiveIntPipe);

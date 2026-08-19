import {
  BadRequestException,
  type ArgumentsHost,
  Catch,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { attachHttpResponseError } from '@vfair/nest-utils';
import { MAX_PARTNER_LOGO_SIZE_MESSAGE } from '../partners/partner-logo-upload.constants';

type MulterLikeError = {
  code: string;
};

const isMulterError = (exception: unknown): exception is MulterLikeError =>
  typeof exception === 'object' &&
  exception !== null &&
  (exception as Error).name === 'MulterError' &&
  typeof (exception as MulterLikeError).code === 'string';

@Catch()
export class MulterExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();

    if (!isMulterError(exception)) {
      attachHttpResponseError(response, exception);
      super.catch(exception, host);
      return;
    }

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? MAX_PARTNER_LOGO_SIZE_MESSAGE
        : 'Invalid file upload';

    attachHttpResponseError(
      response,
      new BadRequestException({
        err_code: 'invalid_file_upload',
        message,
      }),
    );

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Bad Request',
      err_code: 'invalid_file_upload',
    });
  }
}

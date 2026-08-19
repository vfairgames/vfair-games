import {
  ArgumentsHost,
  Catch,
  Injectable,
  type WsExceptionFilter,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  InjectPinoLogger,
  logWsException,
  PinoLogger,
} from '@vfair/nest-utils';

@Injectable()
@Catch(WsException)
export class WsAcknowledgmentFilter implements WsExceptionFilter {
  constructor(
    @InjectPinoLogger(WsAcknowledgmentFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: WsException, host: ArgumentsHost): void {
    const callback = host.getArgByIndex(2);
    const event = host.switchToWs().getPattern();

    const payload = logWsException(this.logger, exception, {
      ...(event ? { event } : {}),
    });

    if (typeof callback === 'function') {
      callback({ error: payload });
    }
  }
}

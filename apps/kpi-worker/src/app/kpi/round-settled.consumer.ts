import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type {
  AmqpConnectionManager,
  Channel,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { connect } from 'amqp-connection-manager';
import type { ConsumeMessage } from 'amqplib';
import {
  GAME_EVENTS_EXCHANGE,
  GAME_ROUND_SETTLED_ROUTING_KEY,
  KPI_ROUND_SETTLED_DLQ,
  KPI_ROUND_SETTLED_DLX,
  KPI_ROUND_SETTLED_QUEUE,
} from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { KpiIncrementService } from './kpi-increment.service';
import { parseGameRoundSettledEvent } from './parse-game-round-settled-event';

const MAX_RETRIES = 10;
const KPI_RETRY_HEADER = 'x-kpi-retry';
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class RoundSettledConsumer
  implements OnModuleInit, OnApplicationShutdown
{
  private connection: AmqpConnectionManager | null = null;
  private channel: ChannelWrapper | null = null;

  constructor(
    @InjectPinoLogger(RoundSettledConsumer.name)
    private readonly logger: PinoLogger,
    private readonly kpiIncrement: KpiIncrementService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = process.env['RABBITMQ_URL'];
    if (!url) {
      throw new Error('RABBITMQ_URL is required for kpi-worker');
    }

    this.connection = connect([url], {
      heartbeatIntervalInSeconds: 5,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => {
      this.logger.info('RabbitMQ connection established for KPI consumer');
    });

    this.connection.on('disconnect', ({ err }) => {
      this.logger.warn(
        { error: err },
        'RabbitMQ KPI consumer disconnected; will reconnect',
      );
    });

    this.connection.on('connectFailed', ({ err }) => {
      this.logger.error(
        { error: err },
        'RabbitMQ KPI consumer connection failed; will retry',
      );
    });

    this.channel = this.connection.createChannel({
      name: 'kpi-worker.round-settled-consumer',
      confirm: false,
      setup: async (channel: Channel) => {
        await channel.prefetch(10);
        await channel.assertExchange(GAME_EVENTS_EXCHANGE, 'topic', {
          durable: true,
        });
        await channel.assertExchange(KPI_ROUND_SETTLED_DLX, 'topic', {
          durable: true,
        });
        await channel.assertQueue(KPI_ROUND_SETTLED_DLQ, {
          durable: true,
        });
        await channel.bindQueue(
          KPI_ROUND_SETTLED_DLQ,
          KPI_ROUND_SETTLED_DLX,
          '#',
        );
        await channel.assertQueue(KPI_ROUND_SETTLED_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': KPI_ROUND_SETTLED_DLX,
          },
        });
        await channel.bindQueue(
          KPI_ROUND_SETTLED_QUEUE,
          GAME_EVENTS_EXCHANGE,
          GAME_ROUND_SETTLED_ROUTING_KEY,
        );
      },
    });

    this.channel.on('error', (error, { name }) => {
      this.logger.error(
        { error, channelName: name },
        'RabbitMQ KPI consumer channel error',
      );
    });

    await this.channel.consume(
      KPI_ROUND_SETTLED_QUEUE,
      (message) => {
        void this.handleMessage(message);
      },
      { noAck: false },
    );

    this.logger.info(
      { queue: KPI_ROUND_SETTLED_QUEUE, dlq: KPI_ROUND_SETTLED_DLQ },
      'Consuming game.round.settled events (auto-reconnect enabled)',
    );
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.channel?.cancelAll();
    } catch (error: unknown) {
      this.logger.error({ error }, 'Failed to cancel RabbitMQ consumers');
    }

    try {
      await this.channel?.close();
    } catch (error: unknown) {
      this.logger.error({ error }, 'Failed to close RabbitMQ channel');
    }

    try {
      await this.connection?.close();
    } catch (error: unknown) {
      this.logger.error({ error }, 'Failed to close RabbitMQ connection');
    }

    this.channel = null;
    this.connection = null;
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    let event;
    try {
      const raw: unknown = JSON.parse(message.content.toString('utf8'));
      event = parseGameRoundSettledEvent(raw);
    } catch (error: unknown) {
      this.logger.error(
        {
          error,
          messageId: message.properties.messageId,
        },
        'Invalid game.round.settled message; moving to dead-letter queue',
      );
      this.channel.nack(message, false, false);
      return;
    }

    try {
      await this.kpiIncrement.processSettledRound(event);
      this.channel.ack(message);
    } catch (error: unknown) {
      await this.handleProcessingFailure(message, error);
    }
  }

  private async handleProcessingFailure(
    message: ConsumeMessage,
    error: unknown,
  ): Promise<void> {
    if (!this.channel) {
      return;
    }

    const retry = Number(message.properties.headers?.[KPI_RETRY_HEADER] ?? 0);

    if (retry >= MAX_RETRIES) {
      this.logger.error(
        {
          error,
          messageId: message.properties.messageId,
          retry,
        },
        'Too many retries for game.round.settled; moving to dead-letter queue',
      );
      this.channel.nack(message, false, false);
      return;
    }

    this.logger.warn(
      {
        error,
        messageId: message.properties.messageId,
        retry: retry + 1,
      },
      'Could not process game.round.settled; will retry',
    );

    await sleep(Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** retry));

    if (!this.channel) {
      return;
    }

    try {
      await this.channel.sendToQueue(KPI_ROUND_SETTLED_QUEUE, message.content, {
        contentType: message.properties.contentType,
        persistent: true,
        messageId: message.properties.messageId,
        headers: {
          ...(message.properties.headers ?? {}),
          [KPI_RETRY_HEADER]: retry + 1,
        },
      });
      this.channel.ack(message);
    } catch (requeueError: unknown) {
      this.logger.error(
        {
          error: requeueError,
          originalError: error,
          messageId: message.properties.messageId,
        },
        'Could not retry game.round.settled; moving to dead-letter queue',
      );
      this.channel.nack(message, false, false);
    }
  }
}

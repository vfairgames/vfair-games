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
  KPI_ROUND_SETTLED_QUEUE,
} from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { KpiIncrementService } from './kpi-increment.service';
import { parseGameRoundSettledEvent } from './parse-game-round-settled-event';

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
        await channel.assertQueue(KPI_ROUND_SETTLED_QUEUE, {
          durable: true,
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
      { queue: KPI_ROUND_SETTLED_QUEUE },
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

    try {
      const raw: unknown = JSON.parse(message.content.toString('utf8'));
      const event = parseGameRoundSettledEvent(raw);
      await this.kpiIncrement.processSettledRound(event);
      this.channel.ack(message);
    } catch (error: unknown) {
      this.logger.error(
        {
          error,
          messageId: message.properties.messageId,
        },
        'Failed to process game.round.settled message',
      );
      this.channel.nack(message, false, false);
    }
  }
}

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
import type { GameRoundSettledEvent } from '@vfair/game-contracts';
import {
  GAME_EVENTS_EXCHANGE,
  GAME_ROUND_SETTLED_ROUTING_KEY,
  KPI_ROUND_SETTLED_DLQ,
  KPI_ROUND_SETTLED_DLX,
  KPI_ROUND_SETTLED_QUEUE,
} from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';

const PUBLISH_TIMEOUT_MS = 2_000;

@Injectable()
export class RoundSettledPublisher
  implements OnModuleInit, OnApplicationShutdown
{
  private connection: AmqpConnectionManager | null = null;
  private channel: ChannelWrapper | null = null;

  constructor(
    @InjectPinoLogger(RoundSettledPublisher.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = process.env['RABBITMQ_URL'];
    if (!url) {
      this.logger.warn(
        'RABBITMQ_URL is not set; KPI events will wait in the outbox',
      );
      return;
    }

    this.connection = connect([url], {
      heartbeatIntervalInSeconds: 5,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => {
      this.logger.info('RabbitMQ connection established for publishing');
    });

    this.connection.on('disconnect', ({ err }) => {
      this.logger.warn(
        { error: err },
        'RabbitMQ publisher disconnected; will reconnect',
      );
    });

    this.connection.on('connectFailed', ({ err }) => {
      this.logger.error(
        { error: err },
        'RabbitMQ publisher connection failed; will retry',
      );
    });

    this.channel = this.connection.createChannel({
      name: 'games-api.round-settled-publisher',
      confirm: true,
      publishTimeout: PUBLISH_TIMEOUT_MS,
      setup: async (channel: Channel) => {
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
        'RabbitMQ publisher channel error',
      );
    });

    this.logger.info('RabbitMQ publisher started (auto-reconnect enabled)');
  }

  async onApplicationShutdown(): Promise<void> {
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

  isReady(): boolean {
    return this.channel !== null;
  }

  async publish(event: GameRoundSettledEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel unavailable');
    }

    await this.channel.publish(
      GAME_EVENTS_EXCHANGE,
      GAME_ROUND_SETTLED_ROUTING_KEY,
      Buffer.from(JSON.stringify(event)),
      {
        contentType: 'application/json',
        persistent: true,
        messageId: event.roundId,
        timeout: PUBLISH_TIMEOUT_MS,
      },
    );
  }
}

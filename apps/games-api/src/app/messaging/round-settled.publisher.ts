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
import {
  GAME_EVENTS_EXCHANGE,
  GAME_ROUND_SETTLED_EVENT,
  GAME_ROUND_SETTLED_ROUTING_KEY,
  type GameRoundSettledEvent,
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
        'RABBITMQ_URL is not set; round settled events will not be published',
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

  async publish(event: Omit<GameRoundSettledEvent, 'event'>): Promise<void> {
    if (!this.channel) {
      this.logger.warn(
        { roundId: event.roundId },
        'Skipping game.round.settled publish; RabbitMQ channel unavailable',
      );
      return;
    }

    const payload: GameRoundSettledEvent = {
      event: GAME_ROUND_SETTLED_EVENT,
      ...event,
    };

    try {
      await this.channel.publish(
        GAME_EVENTS_EXCHANGE,
        GAME_ROUND_SETTLED_ROUTING_KEY,
        Buffer.from(JSON.stringify(payload)),
        {
          contentType: 'application/json',
          persistent: true,
          messageId: event.roundId,
          timeout: PUBLISH_TIMEOUT_MS,
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        { error, roundId: event.roundId },
        'Failed to publish game.round.settled',
      );
    }
  }
}

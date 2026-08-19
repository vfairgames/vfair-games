import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamesApiClient } from './games-api-client.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [AuthModule],
  controllers: [GamesController],
  providers: [GamesApiClient, GamesService],
})
export class GamesModule {}

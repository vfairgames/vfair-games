import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@vfair/prisma-client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { IntParam } from '../common/positive-int-id';
import { CurrentUser } from '../auth/current-user.decorator';
import { ListPlayerRoundsQueryDto } from './dto/list-player-rounds-query.dto';
import { ListPlayerTransactionsQueryDto } from './dto/list-player-transactions-query.dto';
import { ListPlayersQueryDto } from './dto/list-players-query.dto';
import { PlayerKpiQueryDto } from './dto/player-kpi-query.dto';
import { parseRoundId } from './parse-round-id';
import { PlayersService } from './players.service';

@Controller('players')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_PLAYERS)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListPlayersQueryDto,
  ) {
    return this.playersService.findAll(
      user,
      query.page,
      query.limit,
      query.externalId,
      query.partnerId,
    );
  }

  @Get(':id/rounds/:roundId')
  findRound(
    @CurrentUser() user: JwtPayload,
    @IntParam('id') id: number,
    @Param('roundId') roundIdParam: string,
  ) {
    return this.playersService.findRound(user, id, parseRoundId(roundIdParam));
  }

  @Get(':id/rounds')
  findRounds(
    @CurrentUser() user: JwtPayload,
    @IntParam('id') id: number,
    @Query() query: ListPlayerRoundsQueryDto,
  ) {
    return this.playersService.findRounds(user, id, query);
  }

  @Get(':id/transactions')
  findTransactions(
    @CurrentUser() user: JwtPayload,
    @IntParam('id') id: number,
    @Query() query: ListPlayerTransactionsQueryDto,
  ) {
    return this.playersService.findTransactions(user, id, query);
  }

  @Get(':id/currencies')
  findCurrencies(@CurrentUser() user: JwtPayload, @IntParam('id') id: number) {
    return this.playersService.findCurrencies(user, id);
  }

  @Get(':id/kpi')
  findKpi(
    @CurrentUser() user: JwtPayload,
    @IntParam('id') id: number,
    @Query() query: PlayerKpiQueryDto,
  ) {
    return this.playersService.findKpi(user, id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @IntParam('id') id: number) {
    return this.playersService.findOne(user, id);
  }
}

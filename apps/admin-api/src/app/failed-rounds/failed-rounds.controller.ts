import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@vfair/prisma-client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { parseRoundId } from '../players/parse-round-id';
import { FailedRoundResolutionNoteDto } from './dto/failed-round-resolution-note.dto';
import { ListFailedRoundsQueryDto } from './dto/list-failed-rounds-query.dto';
import { FailedRoundsService } from './failed-rounds.service';

@Controller('failed-rounds')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_PLAYERS)
export class FailedRoundsController {
  constructor(private readonly failedRoundsService: FailedRoundsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListFailedRoundsQueryDto,
  ) {
    return this.failedRoundsService.findAll(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.failedRoundsService.findOne(user, parseRoundId(id));
  }

  @Post(':id/solve')
  markSolved(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: FailedRoundResolutionNoteDto,
  ) {
    return this.failedRoundsService.markSolved(
      user,
      parseRoundId(id),
      body.note,
    );
  }

  @Post(':id/unsolve')
  markUnsolved(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: FailedRoundResolutionNoteDto,
  ) {
    return this.failedRoundsService.markUnsolved(
      user,
      parseRoundId(id),
      body.note,
    );
  }
}

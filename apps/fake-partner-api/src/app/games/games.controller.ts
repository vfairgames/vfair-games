import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload';
import { LaunchGameDto } from './dto/launch-game.dto';
import { LaunchVerificationDto } from './dto/launch-verification.dto';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('launch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  launch(@Req() request: { user: JwtPayload }, @Body() dto: LaunchGameDto) {
    return this.gamesService.launch(Number(request.user.sub), dto);
  }

  @Post('verification/launch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  launchVerification(@Body() dto: LaunchVerificationDto) {
    return this.gamesService.launchVerification(dto);
  }
}

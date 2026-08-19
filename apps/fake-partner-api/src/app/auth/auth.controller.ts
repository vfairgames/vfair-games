import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: SignInDto): Promise<{ accessToken: string }> {
    return this.authService.signIn(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: { user: JwtPayload }) {
    return this.authService.getProfile(Number(request.user.sub));
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { SignInRequest } from './extract-request-meta';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  signIn(
    @Body() dto: SignInDto,
    @Req() req: SignInRequest,
  ): Promise<{ accessToken: string }> {
    return this.authService.signIn(dto, req);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: { user: JwtPayload }): JwtPayload {
    return request.user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() request: { user: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ): Promise<{ accessToken: string } & JwtPayload> {
    return this.authService.updateProfile(request.user.sub, dto);
  }
}

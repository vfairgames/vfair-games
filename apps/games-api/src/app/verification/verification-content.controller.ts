import { Controller, Get, Param, Query } from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller('verification')
export class VerificationContentController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('content/:gameId')
  getContent(
    @Param('gameId') gameId: string,
    @Query('partnerCode') partnerCode?: string,
    @Query('lang') lang?: string,
  ) {
    return this.verificationService.getHelpContent(gameId, partnerCode, lang);
  }
}

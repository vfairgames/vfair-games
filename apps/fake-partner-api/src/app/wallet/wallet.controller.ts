import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type {
  PartnerWalletBalanceResponse,
  PartnerWalletTransactionResponse,
} from '@vfair/game-contracts';
import { WalletBalanceQueryDto, WalletTransactionDto } from './dto/wallet.dto';
import { PartnerJwtGuard } from './partner-jwt.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(PartnerJwtGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('transaction')
  processTransaction(
    @Body() dto: WalletTransactionDto,
  ): Promise<PartnerWalletTransactionResponse> {
    return this.walletService.processTransaction(dto);
  }

  @Get('balance')
  getBalance(
    @Query() query: WalletBalanceQueryDto,
  ): Promise<PartnerWalletBalanceResponse> {
    return this.walletService.getBalance(query.playerId, query.currency);
  }
}

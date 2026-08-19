import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { PrismaService } from '../prisma/prisma.service';
import type { SignInDto } from './dto/sign-in.dto';
import type { JwtPayload } from './jwt-payload';

export type PlayerWalletView = {
  currency: string;
  balance: string;
  decimals: number;
};

export type PlayerProfile = {
  id: number;
  username: string;
  wallets: PlayerWalletView[];
};

@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signIn(dto: SignInDto): Promise<{ accessToken: string }> {
    const player = await this.prisma.player.findUnique({
      where: { username: dto.username },
    });

    const passwordValid =
      !!player && (await bcrypt.compare(dto.password, player.password));

    if (!passwordValid || !player) {
      this.logger.warn({ username: dto.username }, 'Failed sign-in attempt');
      throw new UnauthorizedException({
        err_code: 'invalid_credentials',
        message: 'Invalid credentials',
      });
    }

    const payload: JwtPayload = {
      sub: String(player.id),
      username: player.username,
    };

    return { accessToken: this.jwt.sign(payload) };
  }

  async getProfile(playerId: number): Promise<PlayerProfile> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { wallets: { orderBy: { currency: 'asc' } } },
    });

    if (!player) {
      throw new UnauthorizedException({
        err_code: 'invalid_credentials',
        message: 'Invalid credentials',
      });
    }

    return {
      id: player.id,
      username: player.username,
      wallets: player.wallets.map((wallet) => ({
        currency: wallet.currency,
        balance: wallet.balance.toFixed(wallet.decimals),
        decimals: wallet.decimals,
      })),
    };
  }
}

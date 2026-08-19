import { Module } from '@nestjs/common';
import { PartnerConfigCacheInvalidationService } from './partner-config-cache-invalidation.service';
import { PartnerCurrenciesService } from './partner-currencies.service';
import { PartnerGamesService } from './partner-games.service';
import { PartnerThemeService } from './partner-theme.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  controllers: [PartnersController],
  providers: [
    PartnersService,
    PartnerCurrenciesService,
    PartnerGamesService,
    PartnerThemeService,
    PartnerConfigCacheInvalidationService,
  ],
})
export class PartnersModule {}

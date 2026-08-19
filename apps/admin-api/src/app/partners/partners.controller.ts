import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permission } from '@vfair/prisma-client';
import { MulterExceptionFilter } from '../common/multer-exception.filter';
import { IntParam } from '../common/positive-int-id';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { CreatePartnerCurrencyDto } from './dto/create-partner-currency.dto';
import { ListPartnersQueryDto } from './dto/list-partners-query.dto';
import { UpdatePartnerGameDto } from './dto/update-partner-game.dto';
import { UpdatePartnerCurrencyDto } from './dto/update-partner-currency.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { UpsertGameHelpContentDto } from './dto/upsert-game-help-content.dto';
import { PartnerThemeDto } from './dto/partner-theme.dto';
import { PartnerCurrenciesService } from './partner-currencies.service';
import { PartnerGamesService } from './partner-games.service';
import { MAX_PARTNER_LOGO_BYTES } from './partner-logo-upload.constants';
import type { PartnerLogoUploadFile } from './partner-logo-upload.types';
import { PartnerThemeService } from './partner-theme.service';
import { PartnersService } from './partners.service';

@Controller('partners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_PARTNERS)
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly partnerCurrenciesService: PartnerCurrenciesService,
    private readonly partnerGamesService: PartnerGamesService,
    private readonly partnerThemeService: PartnerThemeService,
  ) {}

  @Get()
  findAll(@Query() query: ListPartnersQueryDto) {
    return this.partnersService.findAll(query.page, query.limit, query.name);
  }

  @Get(':id/currencies')
  findCurrencies(@IntParam('id') id: number) {
    return this.partnerCurrenciesService.findAll(id);
  }

  @Post(':id/currencies')
  createCurrency(
    @IntParam('id') id: number,
    @Body() dto: CreatePartnerCurrencyDto,
  ) {
    return this.partnerCurrenciesService.create(id, dto);
  }

  @Patch(':id/currencies/:currencyId')
  updateCurrency(
    @IntParam('id') id: number,
    @IntParam('currencyId') currencyId: number,
    @Body() dto: UpdatePartnerCurrencyDto,
  ) {
    return this.partnerCurrenciesService.update(id, currencyId, dto);
  }

  @Delete(':id/currencies/:currencyId')
  @HttpCode(204)
  removeCurrency(
    @IntParam('id') id: number,
    @IntParam('currencyId') currencyId: number,
  ) {
    return this.partnerCurrenciesService.remove(id, currencyId);
  }

  @Get(':id/games')
  findGames(@IntParam('id') id: number) {
    return this.partnerGamesService.findAll(id);
  }

  @Get(':id/games/:gameId')
  findGame(@IntParam('id') id: number, @Param('gameId') gameId: string) {
    return this.partnerGamesService.findOne(id, gameId);
  }

  @Patch(':id/games/:gameId')
  updateGame(
    @IntParam('id') id: number,
    @Param('gameId') gameId: string,
    @Body() dto: UpdatePartnerGameDto,
  ) {
    return this.partnerGamesService.update(id, gameId, dto);
  }

  @Get(':id/games/:gameId/help-content')
  getGameHelpContent(
    @IntParam('id') id: number,
    @Param('gameId') gameId: string,
  ) {
    return this.partnerGamesService.getHelpContent(id, gameId);
  }

  @Put(':id/games/:gameId/help-content/:lang')
  upsertGameHelpContent(
    @IntParam('id') id: number,
    @Param('gameId') gameId: string,
    @Param('lang') lang: string,
    @Body() dto: UpsertGameHelpContentDto,
  ) {
    return this.partnerGamesService.upsertHelpContent(
      id,
      gameId,
      lang,
      dto.html,
    );
  }

  @Get(':id/theme')
  findTheme(@IntParam('id') id: number) {
    return this.partnerThemeService.findOne(id);
  }

  @Put(':id/theme')
  upsertTheme(@IntParam('id') id: number, @Body() dto: PartnerThemeDto) {
    return this.partnerThemeService.upsert(id, dto);
  }

  @Post(':id/theme/logo')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PARTNER_LOGO_BYTES },
    }),
  )
  uploadThemeLogo(
    @IntParam('id') id: number,
    @UploadedFile() file: PartnerLogoUploadFile | undefined,
  ) {
    return this.partnerThemeService.uploadLogo(id, file);
  }

  @Delete(':id/theme/logo')
  @HttpCode(204)
  removeThemeLogo(@IntParam('id') id: number) {
    return this.partnerThemeService.removeLogo(id);
  }

  @Get(':id')
  findOne(@IntParam('id') id: number) {
    return this.partnersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }

  @Patch(':id')
  update(@IntParam('id') id: number, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }

  @Post(':id/regenerate-secret')
  regenerateSecret(@IntParam('id') id: number) {
    return this.partnersService.regenerateSecret(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@IntParam('id') id: number) {
    return this.partnersService.remove(id);
  }
}

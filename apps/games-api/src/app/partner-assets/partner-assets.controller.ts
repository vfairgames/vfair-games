import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { PartnerAssetsService } from './partner-assets.service';

@Controller('public/partners')
export class PartnerAssetsController {
  constructor(private readonly partnerAssets: PartnerAssetsService) {}

  @Get(':code/theme.css')
  @Header('Content-Type', 'text/css; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=60')
  getThemeCss(@Param('code') code: string): Promise<string> {
    return this.partnerAssets.getThemeCss(code);
  }

  @Get(':code/logo')
  @Header('Cache-Control', 'public, max-age=60')
  async getLogo(@Param('code') code: string): Promise<StreamableFile> {
    const logo = await this.partnerAssets.getLogo(code);
    return new StreamableFile(logo.bytes, {
      type: logo.contentType,
      disposition: 'inline',
    });
  }
}

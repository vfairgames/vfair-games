import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Partner } from '../auth/partner.decorator';
import type { AuthenticatedPartner } from '../auth/partner-jwt-payload';
import { PartnerJwtGuard } from '../auth/partner-jwt.guard';
import { LaunchDto } from './dto/launch.dto';
import { LaunchService } from './launch.service';

@Controller('launch')
@UseGuards(PartnerJwtGuard)
export class LaunchController {
  constructor(private readonly launchService: LaunchService) {}

  @Post()
  launch(@Partner() partner: AuthenticatedPartner, @Body() dto: LaunchDto) {
    return this.launchService.launch(partner, dto);
  }
}

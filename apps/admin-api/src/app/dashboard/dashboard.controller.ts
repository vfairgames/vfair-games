import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@vfair/prisma-client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardKpiQueryDto } from './dto/dashboard-kpi-query.dto';
import { DashboardMetaQueryDto } from './dto/dashboard-meta-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('meta')
  @RequirePermissions(Permission.MANAGE_PLAYERS)
  getMeta(
    @CurrentUser() user: JwtPayload,
    @Query() query: DashboardMetaQueryDto,
  ) {
    return this.dashboardService.getMeta(user, query.partnerId);
  }

  @Get('kpi')
  @RequirePermissions(Permission.MANAGE_PLAYERS)
  getKpi(
    @CurrentUser() user: JwtPayload,
    @Query() query: DashboardKpiQueryDto,
  ) {
    return this.dashboardService.getKpi(user, query);
  }
}

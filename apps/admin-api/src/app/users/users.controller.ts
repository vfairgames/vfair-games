import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@vfair/prisma-client';
import { IntParam } from '../common/positive-int-id';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_USERS)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(
      query.page,
      query.limit,
      query.email,
      query.partnerId,
      query.roleId,
    );
  }

  @Get('roles')
  findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Get(':id/sign-ins')
  findSignIns(@IntParam('id') id: number, @Query() query: PaginationQueryDto) {
    return this.usersService.findSignIns(id, query.page, query.limit);
  }

  @Get(':id')
  findOne(@IntParam('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@IntParam('id') id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@IntParam('id') id: number) {
    return this.usersService.remove(id);
  }
}

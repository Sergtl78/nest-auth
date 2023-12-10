import { Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { RoleService } from './role.service';

import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@lib/decorators';
import { JwtPayload } from '@auth/interfaces';
import { UserResponse } from '@user/responses';

@ApiTags('role')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponse })
  @Post(':id')
  addAdminRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roleService.addAdminRole(id, user);
  }
}

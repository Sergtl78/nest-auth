import { JwtPayload } from '@auth/interfaces';

import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UserService } from './user.service';
import { CurrentUser } from '@lib/decorators';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteResponse, UserResponse } from './responses';

@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOkResponse({ type: UserResponse })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findOneUser(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    return user ? new UserResponse(user) : null;
  }

  @ApiOkResponse({ type: DeleteResponse })
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.remove(id, user);
  }

  @ApiCreatedResponse({ type: UserResponse })
  @UseInterceptors(ClassSerializerInterceptor)
  @Put()
  async updateUser(@Body() body: Partial<User>) {
    const user = await this.userService.update(body);
    return new UserResponse(user);
  }
}

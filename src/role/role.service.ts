import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserResponse } from '@user/responses';
import { JwtPayload } from '@auth/interfaces';
import { Role } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private readonly userService: UserService) {}

  async addAdminRole(id: string, user: JwtPayload) {
    if (!user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }
    const userQ = await this.userService.findOne(id);
    if (user) {
      user.roles.push('ADMIN');
      const savedUser = await this.userService.update(userQ);
      return new UserResponse(savedUser);
    }
  }
}

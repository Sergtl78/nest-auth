import { ApiProperty } from '@nestjs/swagger';
import { Provider, Role, User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponse implements User {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @Exclude()
  password: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  provider: Provider;

  @Exclude()
  isBlocked: boolean;

  @ApiProperty()
  updatedAt: Date;
  @ApiProperty()
  roles: Role[];

  constructor(user: User) {
    Object.assign(this, user);
  }
}

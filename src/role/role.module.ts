import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [RoleController],
  providers: [RoleService],
  imports: [UserModule],
})
export class RoleModule {}

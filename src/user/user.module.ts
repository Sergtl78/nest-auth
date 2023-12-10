import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { UserService } from './user.service';

@Module({
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
  imports: [CacheModule.register()],
})
export class UserModule {}

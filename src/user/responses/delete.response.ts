import { ApiProperty } from '@nestjs/swagger';

export class DeleteResponse {
  @ApiProperty()
  id: string;
}

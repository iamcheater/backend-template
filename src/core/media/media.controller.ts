import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { AdminJwtAuthGuard, RolesGuard } from 'src/core/admin-auth/guards';
import { PresignUploadDto, PresignedUploadResultDto } from './dtos';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller('uploads')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post('presign')
  presign(@Body() dto: PresignUploadDto): Promise<PresignedUploadResultDto> {
    return this.mediaService.createPresignedUpload(dto);
  }
}

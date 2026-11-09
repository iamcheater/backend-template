import { IsEnum, IsOptional } from 'class-validator';
import { PageOptionsDto } from 'src/common/dtos';
import { SortOrder } from 'src/common/enums';

export class AdminPageOptionsDto extends PageOptionsDto {
  @IsEnum(SortOrder)
  @IsOptional()
  readonly order?: SortOrder = SortOrder.DESC;
}

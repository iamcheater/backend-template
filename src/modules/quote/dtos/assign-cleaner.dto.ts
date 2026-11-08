import { IsInt } from 'class-validator';

export class AssignCleanerDto {
  @IsInt()
  cleanerId: number;
}

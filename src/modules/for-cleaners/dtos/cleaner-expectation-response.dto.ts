export class CleanerExpectationResponseDto {
  id: number;
  title: string;
  description: string;
  order: number;

  constructor(partial: CleanerExpectationResponseDto) {
    Object.assign(this, partial);
  }
}

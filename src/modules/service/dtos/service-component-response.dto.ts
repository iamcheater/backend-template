export class ServiceComponentResponseDto {
  id: number;
  title: string;
  description: string | null;

  constructor(partial: ServiceComponentResponseDto) {
    Object.assign(this, partial);
  }
}

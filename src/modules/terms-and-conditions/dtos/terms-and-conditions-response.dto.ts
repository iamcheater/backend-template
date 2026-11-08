export class TermsAndConditionsResponseDto {
  content: string | null;
  updatedAt: Date;

  constructor(partial: TermsAndConditionsResponseDto) {
    Object.assign(this, partial);
  }
}

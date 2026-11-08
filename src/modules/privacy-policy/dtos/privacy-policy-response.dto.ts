export class PrivacyPolicyResponseDto {
  content: string | null;
  updatedAt: Date;

  constructor(partial: PrivacyPolicyResponseDto) {
    Object.assign(this, partial);
  }
}

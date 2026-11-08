export class ResponseDto<T> {
  readonly success: boolean;
  readonly message?: string;
  readonly data?: T;

  constructor(partial: Partial<ResponseDto<T>>) {
    Object.assign(this, partial);
  }
}

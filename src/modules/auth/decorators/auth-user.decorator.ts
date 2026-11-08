import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from 'src/modules/users/entities';

export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: UserEntity }>();
    return request.user;
  },
);

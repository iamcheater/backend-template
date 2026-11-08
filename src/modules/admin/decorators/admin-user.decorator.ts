import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AdminEntity } from '../entities';

export const AdminUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminEntity => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AdminEntity }>();
    return request.user;
  },
);

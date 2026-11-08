import {
  IsStrongPassword as IsStrongPasswordBase,
  ValidationOptions,
} from 'class-validator';

export const IsStrongPassword = (validationOptions?: ValidationOptions) =>
  IsStrongPasswordBase(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one symbol',
      ...validationOptions,
    },
  );

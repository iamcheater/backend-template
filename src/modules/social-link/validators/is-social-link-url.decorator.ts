import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isHttpsUrl, isViberDeepLink } from '../utils';

@ValidatorConstraint({ name: 'isSocialLinkUrl', async: false })
class IsSocialLinkUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    return isHttpsUrl(value) || isViberDeepLink(value);
  }

  defaultMessage(): string {
    return 'url must be an https:// link or a Viber link (viber://chat?number=%2B374... or viber://pa?chatURI=...)';
  }
}

export const IsSocialLinkUrl = (validationOptions?: ValidationOptions) =>
  function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSocialLinkUrlConstraint,
    });
  };

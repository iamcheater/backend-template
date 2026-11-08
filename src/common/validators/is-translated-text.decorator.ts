import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isSupportedLanguage } from 'src/localization/resolve-language.util';
import { DEFAULT_LANGUAGE } from 'src/localization/supported-language.enum';

export interface TranslatedTextRules {
  partial?: boolean;
  allowClearingDefault?: boolean;
  minLength?: number;
  maxLength?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasValidLength(value: string, rules: TranslatedTextRules): boolean {
  const { minLength = 1, maxLength = Number.MAX_SAFE_INTEGER } = rules;
  return value.length >= minLength && value.length <= maxLength;
}

@ValidatorConstraint({ name: 'isTranslatedText', async: false })
class IsTranslatedTextConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [rules] = args.constraints as [TranslatedTextRules];

    if (!isPlainObject(value)) {
      return false;
    }

    const defaultValue = value[DEFAULT_LANGUAGE];
    const defaultMayBeAbsent = rules.partial === true;
    const defaultMayBeEmpty = rules.allowClearingDefault === true;

    if (defaultValue === undefined && !defaultMayBeAbsent) {
      return false;
    }

    if (defaultValue === '' && !defaultMayBeEmpty) {
      return false;
    }

    return Object.entries(value).every(
      ([language, text]) =>
        isSupportedLanguage(language) &&
        typeof text === 'string' &&
        (text === '' || hasValidLength(text, rules)),
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const [rules] = args.constraints as [TranslatedTextRules];
    const length =
      rules.maxLength !== undefined
        ? ` of ${rules.minLength ?? 1}-${rules.maxLength} characters`
        : '';

    return `${args.property} must be an object of { en, hy, ru } strings${length}, with en required`;
  }
}

export const IsTranslatedText = (
  rules: TranslatedTextRules = {},
  validationOptions?: ValidationOptions,
) =>
  function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [rules],
      validator: IsTranslatedTextConstraint,
    });
  };

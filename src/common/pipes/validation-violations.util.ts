import { getMetadataStorage, ValidationError } from 'class-validator';
import { ValidationMetadata } from 'class-validator/types/metadata/ValidationMetadata';
import { TranslationArgs, ValidationViolation } from '../exceptions';
import { TranslatedTextRules } from '../validators';

const POSITIONAL_ARG_NAMES: Record<string, string[]> = {
  min: ['min'],
  max: ['max'],
  minLength: ['min'],
  maxLength: ['max'],
};

const constraintNameOf = (metadata: ValidationMetadata): string | undefined =>
  metadata.name ??
  getMetadataStorage().getTargetValidatorConstraints(metadata.constraintCls)[0]
    ?.name;

const findMetadata = (
  error: ValidationError,
  constraint: string,
): ValidationMetadata | undefined => {
  if (!error.target) {
    return undefined;
  }

  return getMetadataStorage()
    .getTargetValidationMetadatas(error.target.constructor, '', true, false)
    .find(
      (metadata) =>
        metadata.propertyName === error.property &&
        constraintNameOf(metadata) === constraint,
    );
};

const toViolation = (
  error: ValidationError,
  field: string,
  constraint: string,
  fallbackMessage: string,
): ValidationViolation => {
  const metadata = findMetadata(error, constraint);
  const constraints: unknown[] = metadata?.constraints ?? [];

  if (constraint === 'isTranslatedText') {
    const [rules] = constraints as [TranslatedTextRules | undefined];

    return rules?.maxLength === undefined
      ? { field, key: constraint, args: {}, fallbackMessage }
      : {
          field,
          key: 'isTranslatedTextLength',
          args: { min: rules.minLength ?? 1, max: rules.maxLength },
          fallbackMessage,
        };
  }

  const argNames = POSITIONAL_ARG_NAMES[constraint] ?? [];
  const args: TranslationArgs = Object.fromEntries(
    argNames.map((name, index) => [name, constraints[index] as number]),
  );

  return { field, key: constraint, args, fallbackMessage };
};

export const toValidationViolations = (
  errors: ValidationError[],
  parentPath = '',
): ValidationViolation[] =>
  errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => toViolation(error, field, constraint, message),
    );

    return [...own, ...toValidationViolations(error.children ?? [], field)];
  });

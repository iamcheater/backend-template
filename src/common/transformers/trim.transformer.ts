import { Transform } from 'class-transformer';

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export const BlankToUndefined = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export const TrimTranslatedText = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([language, text]) => [
        language,
        typeof text === 'string' ? text.trim() : text,
      ]),
    );
  });

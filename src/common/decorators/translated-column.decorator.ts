import { Column } from 'typeorm';

export const TranslatedColumn = ({ nullable = false } = {}) =>
  Column({ type: 'jsonb', nullable });

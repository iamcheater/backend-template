import { Availability, CleanerSkill, CleaningExperience } from '../enums';

export const CLEANING_EXPERIENCE_LABELS: Record<CleaningExperience, string> = {
  [CleaningExperience.NONE]: 'No experience',
  [CleaningExperience.LESS_THAN_YEAR]: 'Less than a year',
  [CleaningExperience.ONE_TO_THREE]: '1–3 years',
  [CleaningExperience.THREE_PLUS]: '3+ years',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  [Availability.WEEKDAY_MORNINGS]: 'Weekday mornings',
  [Availability.WEEKDAY_AFTERNOONS]: 'Weekday afternoons',
  [Availability.EVENINGS]: 'Evenings',
  [Availability.WEEKENDS]: 'Weekends',
  [Availability.FULL_TIME]: 'Full time',
};

export const CLEANER_SKILL_LABELS: Record<CleanerSkill, string> = {
  [CleanerSkill.HOME]: 'Home',
  [CleanerSkill.OFFICE]: 'Office',
  [CleanerSkill.RENTAL]: 'Rental',
  [CleanerSkill.DEEP]: 'Deep clean',
  [CleanerSkill.AFTER_RENOVATION]: 'After renovation',
  [CleanerSkill.WINDOWS]: 'Windows',
};

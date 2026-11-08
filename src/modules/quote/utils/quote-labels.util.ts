import { KindOfClean, PreferredTiming } from '../enums';

export const KIND_OF_CLEAN_LABELS: Record<KindOfClean, string> = {
  [KindOfClean.HOME]: 'Home',
  [KindOfClean.OFFICE]: 'Office',
  [KindOfClean.RENTAL]: 'Rental',
  [KindOfClean.DEEP]: 'Deep clean',
};

export const PREFERRED_TIMING_LABELS: Record<PreferredTiming, string> = {
  [PreferredTiming.THIS_WEEK]: 'This week',
  [PreferredTiming.NEXT_WEEK]: 'Next week',
  [PreferredTiming.FLEXIBLE]: 'Flexible',
};

import labels from '@/lib/labels.json';

// Morning Meeting Form Types
export interface MorningMeetingEntry {
  id?: string;
  category: string;
  priority: 'sg-attention' | 'situational-awareness' | '';
  region: string;
  country: string;
  headline: string;
  date: string;
  entry: string;
  sourceUrl?: string;
  puNote?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  status?: 'draft' | 'submitted';
  approved?: boolean;
}

export interface FormFieldError {
  [key: string]: string;
}

export const CATEGORIES = labels.categories;
export const PRIORITIES = labels.priorities;
export const REGIONS = labels.regions;
export const COUNTRIES_BY_REGION = labels.countriesByRegion as Record<string, string[]>;

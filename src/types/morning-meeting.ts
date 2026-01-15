import labels from '@/lib/labels.json';

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

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
  aiSummary?: string[] | null;
  images?: Array<{
    id: string;
    position: number | null;
    mimeType: string;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  status?: 'draft' | 'submitted';
  approvalStatus?: ApprovalStatus;
  approved?: boolean; // For backwards compatibility
}

export interface FormFieldError {
  [key: string]: string;
}

export const CATEGORIES = labels.categories;
export const PRIORITIES = labels.priorities;
export const REGIONS = labels.regions;
export const COUNTRIES_BY_REGION = labels.countriesByRegion as Record<string, string[]>;

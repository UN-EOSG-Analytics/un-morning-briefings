import labels from "@/lib/labels.json";

export type ApprovalStatus = "pending" | "discussed" | "left-out";

// Morning Meeting Form Types
export interface MorningMeetingEntry {
  id?: string;
  category: string;
  priority: "sg-attention" | "situational-awareness" | "";
  region: string;
  country: string | string[]; // Support both single and multiple countries
  headline: string;
  date: string; // Now includes both date and time
  entry: string;
  sourceName?: string;
  sourceDate?: string; // Date from the source
  sourceUrl?: string;
  puNote?: string;
  author?: string;
  aiSummary?: string[] | null;
  images?: Array<{
    id: string;
    position: number | null;
    mimeType: string;
  }>;
  status?: "draft" | "submitted";
  approvalStatus?: ApprovalStatus;
}

export interface FormFieldError {
  [key: string]: string;
}

export const CATEGORIES = labels.categories;
export const PRIORITIES = labels.priorities;
export const REGIONS = labels.regions;
export const COUNTRIES = labels.countries;

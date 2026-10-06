export type VerifiedStatus = 'unverified' | 'pending' | 'verified';
export type Mode = 'online' | 'physical';
export type Language = 'English' | 'Sinhala' | 'Tamil';
export type GroupSize = '1-on-1' | 'small(2-5)' | 'large(6-10)';

export type Subject = {
  /** Module code, e.g. "IT2030" */
  subjectId: string;
  subjectName: string;
};

export type Availability = {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  startTime: string;
  endTime: string;
};

export type Tutor = {
  id: string;
  name: string;
  /** A remote image URL. Omit to show initials when the tutor has no photo. */
  photoUrl?: string | number;
  university: string;
  yearOfStudy: number;
  verifiedStatus: VerifiedStatus;
  /** Total completed sessions (e.g. 10+ sessions conducted) */
  sessionsCompleted?: number;
  subjects: Subject[];
  /** LKR per hour */
  hourlyRate: number;
  avgRating: number;
  reviewCount: number;
  /** Short teaching philosophy shown on the full Tutor Profile screen. */
  bio?: string;
  modesOffered: Mode[];
  languages: Language[];
  teachingStyleTags: string[];
  groupSizeOptions: GroupSize[];
  availability: Availability[];
};

export type SortOption = 'recommended' | 'priceAsc' | 'ratingDesc';
/** 'hybrid' = tutor offers both online and physical sessions */
export type ModeFilter = 'any' | 'online' | 'physical' | 'hybrid';

export type Filters = {
  sort: SortOption;
  priceMin: number;
  priceMax: number;
  minRating: number | null;
  languages: Language[];
  teachingStyle: string | null;
  mode: ModeFilter;
};

export type FilterSection = 'sort' | 'price' | 'rating' | 'language' | 'style' | 'mode';
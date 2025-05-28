export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any;

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type WithTimestamps<T> = T & Timestamps;

export type WithId<T> = T & { id: string };

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string[];
  [key: string]: any;
}

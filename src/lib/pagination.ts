export const DEFAULT_PAGE_SIZE = 20;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

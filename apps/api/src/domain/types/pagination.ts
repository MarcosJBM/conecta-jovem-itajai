export interface Pagination {
  page: number;
  pageSize: number;
}
export interface Page<T> extends Pagination {
  items: T[];
  total: number;
  totalPages: number;
}

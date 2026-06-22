import { useState, useCallback } from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
  from: number;
  to: number;
}

export function usePagination(defaultPageSize = 10): PaginationState {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  
  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  
  return {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    reset,
    from,
    to,
  };
}

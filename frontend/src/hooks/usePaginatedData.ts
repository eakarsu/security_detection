import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../utils/apiClient.ts';
import type { PaginatedResponse } from '../types/index.ts';

interface UsePaginatedDataOptions {
  endpoint: string;
  defaultPageSize?: number;
  extraParams?: Record<string, string>;
}

interface UsePaginatedDataReturn<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  search: string;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  refresh: () => void;
}

export function usePaginatedData<T = any>(options: UsePaginatedDataOptions): UsePaginatedDataReturn<T> {
  const { endpoint, defaultPageSize = 20, extraParams = {} } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || String(defaultPageSize), 10);
  const search = searchParams.get('search') || '';

  const setPage = useCallback((newPage: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('page', String(newPage));
      return params;
    });
  }, [setSearchParams]);

  const setPageSize = useCallback((size: number) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('page_size', String(size));
      params.set('page', '1');
      return params;
    });
  }, [setSearchParams]);

  const setSearch = useCallback((searchTerm: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (searchTerm) {
        params.set('search', searchTerm);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      return params;
    });
  }, [setSearchParams]);

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          ...extraParams,
        });
        if (search) params.set('search', search);

        // Also forward any filter params from URL
        searchParams.forEach((value, key) => {
          if (!['page', 'page_size', 'search'].includes(key)) {
            params.set(key, value);
          }
        });

        const result = await apiGet<PaginatedResponse<T>>(`${endpoint}?${params}`);

        if (!cancelled) {
          setData(result.data);
          setTotal(result.total);
          setTotalPages(result.total_pages);
          setHasNext(result.has_next);
          setHasPrevious(result.has_previous);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [endpoint, page, pageSize, search, refreshKey, searchParams]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext,
    hasPrevious,
    search,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch,
    refresh,
  };
}

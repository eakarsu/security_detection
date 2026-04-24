import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Button,
  Stack,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import SearchBar from './SearchBar.tsx';
import LoadingSkeleton from './LoadingSkeleton.tsx';
import EmptyState from './EmptyState.tsx';

interface Column<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  search?: string;
  onSearchChange?: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  getRowId: (row: T) => string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkUpdate?: (ids: string[]) => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  title?: string;
  actions?: React.ReactNode;
}

function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  loading = false,
  search = '',
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  getRowId,
  selectedIds = [],
  onSelectionChange,
  onBulkDelete,
  onBulkUpdate,
  onExportCsv,
  onExportPdf,
  searchPlaceholder,
  emptyTitle,
  emptyMessage,
  title,
  actions,
}: DataTableProps<T>) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds);
  const selected = onSelectionChange ? selectedIds : localSelected;
  const setSelected = onSelectionChange || setLocalSelected;

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(data.map(getRowId));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelected(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  const hasSelection = onBulkDelete || onBulkUpdate;

  if (loading && data.length === 0) {
    return <LoadingSkeleton variant="table" rows={pageSize > 10 ? 10 : pageSize} />;
  }

  return (
    <Paper>
      {/* Toolbar */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {title && (
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
        )}
        {onSearchChange && (
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
        <Box sx={{ flexGrow: title ? 0 : 1 }} />

        {selected.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${selected.length} selected`} color="primary" size="small" />
            {onBulkDelete && (
              <Tooltip title="Delete selected">
                <IconButton color="error" onClick={() => onBulkDelete(selected)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
            {onBulkUpdate && (
              <Tooltip title="Update selected">
                <IconButton color="primary" onClick={() => onBulkUpdate(selected)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}

        {(onExportCsv || onExportPdf) && (
          <Stack direction="row" spacing={1}>
            {onExportCsv && (
              <Button size="small" startIcon={<DownloadIcon />} onClick={onExportCsv}>
                CSV
              </Button>
            )}
            {onExportPdf && (
              <Button size="small" startIcon={<DownloadIcon />} onClick={onExportPdf}>
                PDF
              </Button>
            )}
          </Stack>
        )}
        {actions}
      </Box>

      {/* Table */}
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {hasSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasSelection ? 1 : 0)}>
                  <EmptyState title={emptyTitle} message={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selected.includes(rowId);
                return (
                  <TableRow
                    key={rowId}
                    hover
                    selected={isSelected}
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {hasSelection && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleSelectRow(rowId)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = (row as any)[column.id];
                      return (
                        <TableCell key={column.id} align={column.align || 'left'}>
                          {column.format ? column.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={pageSize}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50, 100]}
      />
    </Paper>
  );
}

export default DataTable;

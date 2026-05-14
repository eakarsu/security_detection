/**
 * Pagination — controlled MUI-styled pagination component matching the
 * platform pattern: { page, totalPages, onPageChange }.
 *
 * Used by paginated lists (Threat Intel IOC table, AI results history,
 * SOC sessions list, etc.).
 */

import React from "react";
import { Box, Button, Typography } from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showLabel?: boolean;
  total?: number;
}

function buildWindow(page: number, totalPages: number, window = 1): (number | "...")[] {
  const set = new Set<number>([1, totalPages, page]);
  for (let i = page - window; i <= page + window; i++) {
    if (i > 0 && i <= totalPages) set.add(i);
  }
  const sorted = Array.from(set).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("...");
    out.push(n);
    prev = n;
  }
  return out;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, showLabel = false, total }) => {
  if (!totalPages || totalPages <= 1) return null;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = buildWindow(safePage, totalPages, 1);

  const goto = (p: number) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    onPageChange(p);
  };

  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      {showLabel && total !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
          {total} total
        </Typography>
      )}
      <Button
        size="small"
        variant="outlined"
        startIcon={<ChevronLeft />}
        onClick={() => goto(safePage - 1)}
        disabled={safePage === 1}
        aria-label="Previous page"
      >
        Prev
      </Button>
      {items.map((it, idx) =>
        it === "..." ? (
          <Typography key={`gap-${idx}`} sx={{ px: 1 }} color="text.secondary">
            …
          </Typography>
        ) : (
          <Button
            key={it}
            size="small"
            variant={it === safePage ? "contained" : "outlined"}
            onClick={() => goto(it)}
            aria-current={it === safePage ? "page" : undefined}
            sx={{ minWidth: 36 }}
          >
            {it}
          </Button>
        )
      )}
      <Button
        size="small"
        variant="outlined"
        endIcon={<ChevronRight />}
        onClick={() => goto(safePage + 1)}
        disabled={safePage === totalPages}
        aria-label="Next page"
      >
        Next
      </Button>
    </Box>
  );
};

export default Pagination;

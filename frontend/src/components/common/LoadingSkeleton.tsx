import React from 'react';
import { Box, Skeleton, Paper } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'table' | 'cards' | 'form';
  rows?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'table', rows = 5 }) => {
  if (variant === 'cards') {
    return (
      <Box display="flex" gap={3} flexWrap="wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} sx={{ p: 2, flex: '1 1 200px', minWidth: 200 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
          </Paper>
        ))}
      </Box>
    );
  }

  if (variant === 'form') {
    return (
      <Box>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  // Table variant
  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 0.5, borderRadius: 1 }} />
        ))}
      </Box>
    </Paper>
  );
};

export default LoadingSkeleton;

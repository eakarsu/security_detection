import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { InboxOutlined as EmptyIcon } from '@mui/icons-material';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There are no items to display.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={6}
      px={3}
    >
      {icon || <EmptyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: actionLabel ? 3 : 0 }}>
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;

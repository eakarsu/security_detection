import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
} from '@mui/material';

interface BulkUpdateDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (updates: Record<string, string>) => void;
  fields: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
}

const BulkUpdateDialog: React.FC<BulkUpdateDialogProps> = ({
  open,
  count,
  onClose,
  onConfirm,
  fields,
}) => {
  const [updates, setUpdates] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    const nonEmpty = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== '')
    );
    if (Object.keys(nonEmpty).length > 0) {
      onConfirm(nonEmpty);
    }
    setUpdates({});
  };

  const handleClose = () => {
    setUpdates({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Update {count} Items</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select the fields you want to update. Only changed fields will be applied.
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map((field) => (
            <FormControl key={field.key} fullWidth>
              <InputLabel>{field.label}</InputLabel>
              <Select
                value={updates[field.key] || ''}
                label={field.label}
                onChange={(e) =>
                  setUpdates((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              >
                <MenuItem value="">-- No change --</MenuItem>
                {field.options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={Object.values(updates).every((v) => !v)}
        >
          Update {count} Items
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkUpdateDialog;

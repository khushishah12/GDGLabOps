'use client';

import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { AlertCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          {isDestructive && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
          <DialogTitle>{title}</DialogTitle>
        </div>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          size="sm"
          isLoading={isLoading}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

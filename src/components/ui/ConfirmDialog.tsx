'use client';

import { useT } from '@/hooks/useT';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * Gate for every destructive action. Deliberately requires an explicit
 * `confirmLabel` so the button never just says "OK" for a delete.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();

  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm}>
            {confirmLabel ?? t.common.confirm}
          </Button>
        </div>
      }
    >
      {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
    </Sheet>
  );
}

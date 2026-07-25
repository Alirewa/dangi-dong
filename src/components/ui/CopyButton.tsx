'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { copyText } from '@/lib/clipboard';
import { useDongStore } from '@/store/dongStore';
import { ActionButton } from './ActionButton';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useT();
  const pushToast = useDongStore((s) => s.pushToast);
  const [done, setDone] = useState(false);

  return (
    <ActionButton
      tone="primary"
      icon={
        done ? (
          <Check className="size-4 text-positive" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )
      }
      onClick={async () => {
        const ok = await copyText(value);
        if (ok) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
          pushToast('success', t.toast.copiedNumber);
        } else {
          pushToast('error', t.toast.copyFailed);
        }
      }}
    >
      {done ? t.common.copied : (label ?? t.common.copy)}
    </ActionButton>
  );
}

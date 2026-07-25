'use client';

import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextInput } from '@/components/ui/TextInput';

/**
 * First-run prompt for the owner's name.
 *
 * Previously the app silently created a person called "من", which then showed
 * up in every group and export as a placeholder nobody had chosen. Asking once
 * costs one field and makes every later screen read correctly.
 *
 * Dismissing is allowed — `completeOnboarding` falls back to the locale default
 * — so a modal can never trap someone on first launch. The name stays editable
 * from the People screen afterwards.
 */
export function OnboardingSheet() {
  const { t } = useT();
  const hydrated = useDongStore((s) => s.hydrated);
  const onboarded = useDongStore((s) => s.settings.onboarded);
  const completeOnboarding = useDongStore((s) => s.completeOnboarding);

  const [name, setName] = useState('');

  const open = hydrated && !onboarded;

  return (
    <Sheet
      open={open}
      onClose={() => completeOnboarding()}
      title={t.onboarding.title}
      footer={
        <Button fullWidth size="lg" onClick={() => completeOnboarding(name)}>
          {t.onboarding.submit}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <UserRound className="size-7" aria-hidden="true" />
          </span>
        </div>

        <p className="text-center text-sm leading-relaxed text-muted">{t.onboarding.description}</p>

        <TextInput
          label={t.onboarding.nameLabel}
          placeholder={t.onboarding.namePlaceholder}
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') completeOnboarding(name);
          }}
          hint={t.onboarding.nameHint}
        />
      </div>
    </Sheet>
  );
}

'use client';

import { useState } from 'react';
import { useT } from '@/hooks/useT';
import {
  bankOfCard,
  formatCardNumber,
  formatIban,
  isValidCardNumber,
  isValidIban,
  normalizeDigits,
  normalizeIban,
} from '@/lib/bank';
import type { PayoutInfo } from '@/types/dong';
import { TextInput } from '@/components/ui/TextInput';

/**
 * Card / IBAN entry for the main payer box.
 *
 * Validation policy: a Luhn failure is a hard error (it is definitely a typo),
 * but an unrecognised BIN is only a soft warning — the BIN table is a
 * convenience that will go stale, and blocking on it would lock users out of
 * legitimate new cards.
 */
export function PayoutForm({
  value,
  onChange,
}: {
  value: PayoutInfo;
  onChange: (data: Partial<PayoutInfo>) => void;
}) {
  const { t } = useT();
  // Seeded once. The parent owns the canonical PayoutInfo and this component
  // remounts with its sheet, so there is nothing to sync back from.
  const [cardDraft, setCardDraft] = useState(() => formatCardNumber(value.cardNumber));
  const [ibanDraft, setIbanDraft] = useState(() => formatIban(value.iban));

  const cardDigits = normalizeDigits(cardDraft);
  const cardComplete = cardDigits.length === 16;
  const cardError = cardComplete && !isValidCardNumber(cardDigits) ? t.people.invalidCard : null;
  const detectedBank = bankOfCard(cardDigits);
  const bankWarning = cardComplete && !cardError && !detectedBank ? t.people.unknownBank : null;

  const ibanClean = normalizeIban(ibanDraft);
  const ibanError =
    ibanClean.length > 2 && ibanClean.length >= 26 && !isValidIban(ibanClean)
      ? t.people.invalidIban
      : null;

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted">{t.people.payoutHint}</p>

      <TextInput
        label={t.people.cardNumber}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        placeholder="6104 3378 1234 5678"
        value={cardDraft}
        error={cardError}
        hint={bankWarning}
        onChange={(e) => {
          const formatted = formatCardNumber(e.target.value);
          setCardDraft(formatted);
          const digits = normalizeDigits(formatted);
          const bank = bankOfCard(digits);
          onChange({
            cardNumber: digits,
            // Only auto-fill the bank; never overwrite a name the user typed.
            ...(bank && !value.bankName ? { bankName: bank } : {}),
          });
        }}
      />

      <TextInput
        label={t.people.bankName}
        value={value.bankName}
        placeholder={detectedBank ?? ''}
        onChange={(e) => onChange({ bankName: e.target.value })}
      />

      <TextInput
        label={`${t.people.iban} (${t.common.optional})`}
        dir="ltr"
        autoComplete="off"
        placeholder="IR66 0540 1027 8000 8975 2143 51"
        value={ibanDraft}
        error={ibanError}
        onChange={(e) => {
          setIbanDraft(e.target.value.toUpperCase());
          onChange({ iban: normalizeIban(e.target.value) });
        }}
      />

      <TextInput
        label={`${t.people.holderName} (${t.common.optional})`}
        hint={t.people.holderNameHint}
        value={value.holderName}
        onChange={(e) => onChange({ holderName: e.target.value })}
      />
    </div>
  );
}

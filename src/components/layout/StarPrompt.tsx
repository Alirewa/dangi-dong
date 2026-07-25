'use client';

import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { REPO_URL } from './Footer';

const TICK_SECONDS = 30;
/** First ask after five minutes of real use, not five minutes of a parked tab. */
const FIRST_ASK_SECONDS = 5 * 60;
/** "Maybe later" costs another half hour of use before asking again. */
const SECOND_ASK_SECONDS = 35 * 60;

/**
 * Asks for a GitHub star once the app has actually been used.
 *
 * Time only accrues while the document is visible, so leaving a tab open
 * overnight does not trigger it. Answering either way is final enough that the
 * prompt never becomes nagging: "star" closes it forever, "later" pushes it
 * out by another half hour of genuine use.
 */
export function StarPrompt() {
  const { t } = useT();
  const hydrated = useDongStore((s) => s.hydrated);
  const onboarded = useDongStore((s) => s.settings.onboarded);
  const usageSeconds = useDongStore((s) => s.settings.usageSeconds);
  const starPrompt = useDongStore((s) => s.settings.starPrompt);
  const addUsageSeconds = useDongStore((s) => s.addUsageSeconds);
  const setStarPrompt = useDongStore((s) => s.setStarPrompt);

  useEffect(() => {
    if (!hydrated || starPrompt === 'done') return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') addUsageSeconds(TICK_SECONDS);
    }, TICK_SECONDS * 1000);
    return () => clearInterval(id);
  }, [hydrated, starPrompt, addUsageSeconds]);

  const threshold = starPrompt === 'later' ? SECOND_ASK_SECONDS : FIRST_ASK_SECONDS;
  const open =
    hydrated && onboarded && starPrompt !== 'done' && (usageSeconds ?? 0) >= threshold;

  const star = () => {
    window.open(REPO_URL, '_blank', 'noopener,noreferrer');
    setStarPrompt('done');
  };

  return (
    <Sheet
      open={open}
      onClose={() => setStarPrompt('later')}
      title={t.star.title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={() => setStarPrompt('later')}>
            {t.star.later}
          </Button>
          <Button
            block
            icon={<Star className="size-4" aria-hidden="true" />}
            onClick={star}
          >
            {t.star.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning">
            <Star className="size-7" aria-hidden="true" />
          </span>
        </div>
        <p className="text-center text-sm leading-relaxed text-muted">{t.star.description}</p>
      </div>
    </Sheet>
  );
}

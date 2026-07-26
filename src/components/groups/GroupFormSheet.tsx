'use client';

import { useState } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import { GROUP_ICON_KEYS, type Group, type GroupIconKey, type GroupMode } from '@/types/dong';
import { GroupIcon, defaultIconFor, toIconKey } from './groupIcons';
import { todayIso } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { Button } from '@/components/ui/Button';
import { ActionButton } from '@/components/ui/ActionButton';
import { DateField } from '@/components/ui/DateField';
import { Sheet } from '@/components/ui/Sheet';
import { TextInput, inputClass } from '@/components/ui/TextInput';

/**
 * Wrapper so the form's state resets by remounting rather than by syncing
 * store values into local state from an effect (see ExpenseForm).
 */
export function GroupFormSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Group | null;
}) {
  if (!open) return null;
  return <GroupForm key={editing?.id ?? 'new'} onClose={onClose} editing={editing ?? null} />;
}

function GroupForm({ onClose, editing }: { onClose: () => void; editing: Group | null }) {
  const { t } = useT();
  const people = useDongStore((s) => s.people);
  const addGroup = useDongStore((s) => s.addGroup);
  const updateGroup = useDongStore((s) => s.updateGroup);
  const addPerson = useDongStore((s) => s.addPerson);
  const addAdHocMember = useDongStore((s) => s.addAdHocMember);
  const removeMember = useDongStore((s) => s.removeMember);
  const pushToast = useDongStore((s) => s.pushToast);

  const globals = people.filter((p) => p.scope === 'global');

  const [name, setName] = useState(() => editing?.name ?? '');
  const [mode, setMode] = useState<GroupMode>(() => editing?.mode ?? 'monthly');
  const [icon, setIcon] = useState<GroupIconKey>(() =>
    toIconKey(editing?.icon, editing?.mode ?? 'monthly')
  );
  const [eventDate, setEventDate] = useState(() => editing?.eventDate ?? todayIso());
  const [memberIds, setMemberIds] = useState<string[]>(
    // New group: pre-tick everyone saved — the common case is "me and my housemates".
    () => editing?.memberIds ?? globals.map((p) => p.id)
  );
  const [adHocNames, setAdHocNames] = useState<string[]>([]);
  const [adHocDraft, setAdHocDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const commitAdHocDraft = () => {
    const value = adHocDraft.trim();
    if (!value) return;
    setAdHocNames((prev) => [...prev, value]);
    setAdHocDraft('');
  };

  const submit = () => {
    if (!name.trim()) {
      setError(t.groupForm.needName);
      return;
    }
    if (memberIds.length === 0 && adHocNames.length === 0) {
      setError(t.groupForm.needMembers);
      return;
    }

    if (editing) {
      updateGroup(editing.id, {
        name: name.trim(),
        icon,
        eventDate: editing.mode === 'event' ? eventDate : null,
      });
      // Reconcile membership against what the user ticked.
      for (const id of memberIds) {
        if (!editing.memberIds.includes(id)) useDongStore.getState().addMember(editing.id, id);
      }
      for (const id of editing.memberIds) {
        if (!memberIds.includes(id) && !removeMember(editing.id, id)) {
          pushToast('error', t.group.memberInUse);
        }
      }
      for (const adHoc of adHocNames) addAdHocMember(editing.id, adHoc);
    } else {
      const group = addGroup({
        name: name.trim(),
        mode,
        icon,
        memberIds,
        eventDate: mode === 'event' ? eventDate : null,
      });
      for (const adHoc of adHocNames) addAdHocMember(group.id, adHoc);
    }

    pushToast('success', t.toast.saved);
    onClose();
  };

  const modes: {
    value: GroupMode;
    label: string;
    desc: string;
    icon: GroupIconKey;
  }[] = [
    {
      value: 'monthly',
      label: t.home.monthly,
      desc: t.home.monthlyDesc,
      icon: 'home',
    },
    {
      value: 'event',
      label: t.home.event,
      desc: t.home.eventDesc,
      icon: 'utensils',
    },
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? t.groupForm.editTitle : t.groupForm.newTitle}
      footer={
        <Button block onClick={submit}>
          {t.common.save}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.groupForm.mode}</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.groupForm.mode}>
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                disabled={!!editing}
                onClick={() => {
                  setMode(m.value);
                  setIcon(defaultIconFor(m.value));
                }}
                className={cn(
                  'rounded-lg border p-3 text-start transition-colors disabled:opacity-60',
                  mode === m.value
                    ? 'border-primary bg-primary-soft'
                    : 'border-border bg-surface hover:bg-surface-2'
                )}
              >
                <GroupIcon icon={m.icon} className="size-6 text-primary" />
                <span className="mt-1 block text-sm font-semibold">{m.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{m.desc}</span>
              </button>
            ))}
          </div>
          {editing && <p className="text-xs text-muted">{t.groupForm.modeLocked}</p>}
        </div>

        <TextInput
          label={t.groupForm.name}
          placeholder={t.groupForm.namePlaceholder}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          error={error && !name.trim() ? error : null}
        />

        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.groupForm.icon}</span>
          <div className="flex flex-wrap gap-2">
            {GROUP_ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={t.groupForm.iconNames[key]}
                title={t.groupForm.iconNames[key]}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-lg border transition-colors',
                  icon === key
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-surface text-muted hover:bg-surface-2'
                )}
              >
                <GroupIcon icon={key} className="size-5" />
              </button>
            ))}
          </div>
        </div>

        {mode === 'event' && (
          <DateField label={t.groupForm.eventDate} value={eventDate} onChange={setEventDate} />
        )}

        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.groupForm.members}</span>

          {globals.length > 0 && (
            <ul className="space-y-1">
              {globals.map((p) => {
                const checked = memberIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(p.id)}
                        className="size-5 accent-[var(--primary)]"
                      />
                      <PersonAvatar personId={p.id} name={p.name} color={p.color} size="sm" />
                      <span className="flex-1 truncate text-sm">{p.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {adHocNames.length > 0 && (
            <ul className="space-y-1">
              {adHocNames.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className="flex min-h-11 items-center gap-3 rounded-lg bg-surface-2 px-2"
                >
                  <Avatar name={n} color="#64748b" size="sm" />
                  <span className="flex-1 truncate text-sm">{n}</span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted">
                    {t.people.adHocBadge}
                  </span>
                  <ActionButton
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                    tone="danger"
                    onClick={() => setAdHocNames((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    {t.common.delete}
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              value={adHocDraft}
              onChange={(e) => setAdHocDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitAdHocDraft();
                }
              }}
              placeholder={t.groupForm.addAdHoc}
              className={inputClass}
            />
            <Button
              variant="secondary"
              onClick={commitAdHocDraft}
              icon={<UserPlus className="size-4" aria-hidden="true" />}
            >
              {t.common.add}
            </Button>
          </div>
          <p className="text-xs text-muted">{t.groupForm.adHocHint}</p>

          {globals.length === 0 && adHocNames.length === 0 && (
            <Button
              variant="outline"
              block
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                const p = addPerson({
                  name: t.appName === 'دنگ‌بندی' ? 'من' : 'Me',
                });
                setMemberIds((prev) => [...prev, p.id]);
              }}
            >
              {t.people.addPerson}
            </Button>
          )}

          {error && memberIds.length === 0 && adHocNames.length === 0 && (
            <p className="text-xs text-negative">{error}</p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

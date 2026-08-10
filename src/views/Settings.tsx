import { useEffect, useRef, useState } from 'react';
import { C, input, label, primaryBtn, sectionHeader } from '../tokens';
import { useStore } from '../store';
import { clearAll } from '../db';
import { shortDate } from '../lib/dates';
import { canWrite } from '../lib/googleAuth';
import { PencilIcon } from '../components/ui';
import {
  dataSummary,
  downloadBackup,
  ImportError,
  importBackup,
  importContacts,
} from '../lib/backup';
import {
  CAN_LOCK,
  clearPin,
  DEFAULT_IDLE_MINUTES,
  getIdleMinutes,
  IDLE_CHOICES,
  setIdleMinutes,
  setName,
  type LockState,
} from '../lib/lock';
import { Lock } from './Lock';

export function Settings({ lock }: { lock: LockState }) {
  const store = useStore();
  const [nameDraft, setNameDraft] = useState(lock.name);
  const [editingName, setEditingName] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);
  const [confirmRemovePin, setConfirmRemovePin] = useState(false);
  const [idle, setIdle] = useState(DEFAULT_IDLE_MINUTES);

  useEffect(() => setNameDraft(lock.name), [lock.name]);
  useEffect(() => {
    void getIdleMinutes().then(setIdle);
  }, []);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [contactReport, setContactReport] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const contactsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void dataSummary().then(setCounts);
  }, [store.projects, store.tasks, store.notes, store.meetings, store.people]);

  const onImport = async (file: File) => {
    try {
      await importBackup(await file.text());
      await store.reload();
      store.showToast('Backup restored');
    } catch (e) {
      store.showToast(e instanceof ImportError ? e.message : 'Could not read that file');
    }
  };

  const onImportContacts = async (file: File) => {
    try {
      const { added, skipped } = await importContacts(await file.text());
      await store.reload();
      const parts = [`Added ${added} ${added === 1 ? 'person' : 'people'}`];
      if (skipped.length) {
        parts.push(
          `skipped ${skipped.length} already here (${skipped.slice(0, 3).join(', ')}${
            skipped.length > 3 ? `, +${skipped.length - 3} more` : ''
          })`,
        );
      }
      setContactReport(`${parts.join(' · ')}.`);
      store.showToast(`Imported ${added} ${added === 1 ? 'contact' : 'contacts'}`);
    } catch (e) {
      const msg = e instanceof ImportError ? e.message : 'Could not read that file';
      setContactReport(msg);
      store.showToast(msg);
    }
  };

  const h: React.CSSProperties = { ...sectionHeader, margin: '20px 2px 10px' };
  const panel: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 14,
    padding: 16,
  };

  const writeCapable = store.accounts.filter((a) => a.provider === 'google' && canWrite(a.scopes));

  const summary = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${n === 1 ? k.replace(/s$/, '') : k}`)
    .join(' · ');

  return (
    <div style={{ animation: 'sbfade .3s ease', marginTop: 6 }}>
      <div style={{ ...h, marginTop: 6 }}>You</div>
      {/* Reads as text with a pencil beside it, the same as a project's
          description — an input parked on screen implies unsaved work. */}
      <div style={panel}>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setNameDraft(lock.name);
                setEditingName(false);
              }
            }}
            onBlur={async () => {
              setEditingName(false);
              await setName(nameDraft);
              await lock.refresh();
            }}
            placeholder="Your name"
            style={input}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 15,
                fontWeight: 600,
                color: lock.name ? C.ink : C.muted,
              }}
            >
              {lock.name || 'Add your name…'}
            </span>
            <button
              onClick={() => setEditingName(true)}
              aria-label="Edit your name"
              title="Edit your name"
              style={{
                background: 'none',
                border: 'none',
                padding: 5,
                cursor: 'pointer',
                display: 'flex',
                lineHeight: 0,
              }}
            >
              <PencilIcon />
            </button>
          </div>
        )}
      </div>

      <div style={h}>Lock</div>
      <div style={panel}>
        <p style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.55 }}>
          A PIN keeps the app closed to anyone who picks up your unlocked phone. It isn't
          encryption — the data on this device is still readable by anything that can read the
          browser's storage.
        </p>
        {lock.pinSet ? (
          <>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <button onClick={() => setPinSheet(true)} style={{ ...primaryBtn, flex: 1 }}>
                Change PIN
              </button>
            </div>
            <label style={{ ...label, marginTop: 16 }}>Ask for it again</label>
            <select
              value={idle}
              onChange={async (e) => {
                const next = Number(e.target.value);
                setIdle(next);
                await setIdleMinutes(next);
                await lock.refresh();
              }}
              style={input}
            >
              {IDLE_CHOICES.map((c) => (
                <option key={c.minutes} value={c.minutes}>
                  {c.label}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>
              Counted from when you last had the app open — locking your phone or switching away
              both count as leaving.
            </p>
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <button
                onClick={() => lock.lockNow()}
                style={{
                  flex: 1,
                  background: 'none',
                  border: `1px solid ${C.line}`,
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: 'inherit',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: C.softInk,
                  cursor: 'pointer',
                }}
              >
                Lock now
              </button>
            </div>
            {confirmRemovePin ? (
              <div style={{ display: 'flex', gap: 9, marginTop: 9 }}>
                <button
                  onClick={async () => {
                    await clearPin();
                    await lock.refresh();
                    setConfirmRemovePin(false);
                  }}
                  style={{
                    flex: 1,
                    background: C.overdue,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: 12,
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Yes, remove it
                </button>
                <button
                  onClick={() => setConfirmRemovePin(false)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    padding: 12,
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: C.softInk,
                    cursor: 'pointer',
                  }}
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRemovePin(true)}
                style={{
                  width: '100%',
                  marginTop: 9,
                  background: 'none',
                  color: C.overdue,
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 8,
                }}
              >
                Remove PIN
              </button>
            )}
          </>
        ) : CAN_LOCK ? (
          <>
            <button
              onClick={() => setPinSheet(true)}
              style={{ ...primaryBtn, marginTop: 12 }}
            >
              Set a PIN
            </button>
            <p style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>
              There's no way to reset a forgotten PIN — export a backup first.
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 12 }}>
            Not available on this address — locking needs a secure connection.
            Open the app over https and it'll appear here.
          </p>
        )}
      </div>

      {pinSheet && (
        <Lock
          mode={{ kind: 'set' }}
          name={lock.name}
          onUnlocked={async () => {
            setPinSheet(false);
            await lock.refresh();
            store.showToast('PIN saved');
          }}
          onCancel={() => setPinSheet(false)}
        />
      )}

      <div style={h}>Backup</div>
      <div style={panel}>
        <p style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.55 }}>
          Everything lives on this phone and nowhere else. Export a backup regularly and keep it
          somewhere safe — a lost or reset phone means a lost brain otherwise.
        </p>
        {summary && (
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>Currently holding {summary}.</p>
        )}
        <button
          onClick={() => void downloadBackup()}
          style={{ ...primaryBtn, marginTop: 14, padding: 14 }}
        >
          Export backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%',
            marginTop: 9,
            background: 'none',
            color: C.softInk,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: 13,
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Restore from a backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <p style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          Restoring replaces everything currently in the app.
        </p>
      </div>

      <div style={h}>Contacts</div>
      <div style={panel}>
        <p style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.55 }}>
          Bring in a batch of people from a JSON file. Anyone whose name is already here is skipped,
          so re-importing the same file won't duplicate anyone or overwrite an interaction log.
        </p>
        <button
          onClick={() => contactsRef.current?.click()}
          style={{
            width: '100%',
            marginTop: 14,
            background: C.card,
            color: C.softInk,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: 13,
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Import contacts
        </button>
        <input
          ref={contactsRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportContacts(f);
            e.target.value = '';
          }}
        />
        {contactReport && (
          <p style={{ fontSize: 12.5, color: C.softInk, marginTop: 10, lineHeight: 1.5 }}>
            {contactReport}
          </p>
        )}
      </div>

      <div style={h}>Calendars</div>
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {store.accounts.length === 0 && (
          <p style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.55 }}>
            Connect a calendar to see your events in Today, Calendar and Meetings. Sync is
            read-only — the app never changes anything in your calendar. You can connect more than
            one account.
          </p>
        )}

        {store.accounts.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingBottom: 12,
              borderBottom: `1px solid ${C.paper2}`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: a.lastError ? C.overdue : '#4a6b52',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>{a.email}</div>
              <div style={{ fontSize: 11.5, color: a.lastError ? C.overdue : C.muted, marginTop: 2 }}>
                {a.lastError
                  ? a.lastError
                  : `${a.provider === 'google' ? 'Google' : 'Outlook'} · ${
                      a.lastSyncedAt ? `synced ${shortDate(a.lastSyncedAt)}` : 'not synced yet'
                    }${canWrite(a.scopes) ? ' · can add events' : ''}`}
              </div>
            </div>
            {a.provider === 'google' && !canWrite(a.scopes) && (
              <button
                onClick={() => void store.grantCalendarWrite(a.id)}
                title="Let the app add meetings to this calendar"
                style={{
                  flexShrink: 0,
                  background: 'none',
                  border: `1px solid ${C.line}`,
                  borderRadius: 9,
                  padding: '6px 10px',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.clay,
                  cursor: 'pointer',
                }}
              >
                Allow adding
              </button>
            )}
            <button
              onClick={() => void store.disconnectCalendar(a.id)}
              style={{
                flexShrink: 0,
                background: 'none',
                border: `1px solid ${C.line}`,
                borderRadius: 9,
                padding: '6px 10px',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                color: C.softInk,
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => void store.connectCalendar('google')}
            style={{
              flex: 1,
              background: C.card,
              color: C.softInk,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              padding: 12,
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ＋ Google
          </button>
          <button
            onClick={() => void store.connectCalendar('outlook')}
            style={{
              flex: 1,
              background: C.card,
              color: C.softInk,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              padding: 12,
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ＋ Outlook
          </button>
        </div>

        {store.accounts.length > 0 && (
          <button
            onClick={() => void store.syncCalendars()}
            disabled={store.syncing}
            style={{
              ...primaryBtn,
              padding: 13,
              fontSize: 15,
              opacity: store.syncing ? 0.6 : 1,
              cursor: store.syncing ? 'default' : 'pointer',
            }}
          >
            {store.syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}

        {writeCapable.length > 1 && (
          <div>
            <label style={{ ...label, marginTop: 4 }}>Default calendar for new meetings</label>
            <select
              value={store.defaultWriteAccountId ?? ''}
              onChange={(e) => void store.setDefaultWriteAccount(e.target.value || null)}
              style={input}
            >
              {writeCapable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
              <option value="">— Ask each time —</option>
            </select>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
          Synced events are read-only, but any notes you write on them stay yours. Disconnecting
          removes that account's events; your own meetings are untouched.
        </p>
        {writeCapable.length > 0 && (
          <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
            A meeting added to a calendar is written once, at the moment you create it, and then
            belongs to that calendar — later changes need making there.
          </p>
        )}
      </div>

      <div style={h}>Data</div>
      <div style={panel}>
        <p style={{ fontSize: 13.5, color: C.softInk, lineHeight: 1.55 }}>
          Clearing wipes every project, task, note, meeting and person on this device. There is no
          undo — export first.
        </p>
        <button
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true);
              return;
            }
            void (async () => {
              await clearAll();
              await store.reload();
              setConfirmClear(false);
              store.showToast('All data cleared');
            })();
          }}
          onBlur={() => setConfirmClear(false)}
          style={{
            width: '100%',
            marginTop: 14,
            background: confirmClear ? C.overdue : 'none',
            color: confirmClear ? '#fff' : C.overdue,
            border: `1px solid ${confirmClear ? C.overdue : '#e8c4b8'}`,
            borderRadius: 12,
            padding: 13,
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {confirmClear ? 'Tap again to permanently clear everything' : 'Clear all data'}
        </button>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}

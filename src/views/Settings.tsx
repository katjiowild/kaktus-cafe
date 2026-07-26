import { useEffect, useRef, useState } from 'react';
import { C, primaryBtn, SERIF } from '../tokens';
import { useStore } from '../store';
import { clearAll } from '../db';
import { shortDate } from '../lib/dates';
import { dataSummary, downloadBackup, ImportError, importBackup } from '../lib/backup';

export function Settings() {
  const store = useStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const h: React.CSSProperties = {
    fontFamily: SERIF,
    fontWeight: 500,
    fontSize: 18,
    margin: '20px 2px 10px',
  };
  const panel: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 14,
    padding: 16,
  };

  const summary = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${n === 1 ? k.replace(/s$/, '') : k}`)
    .join(' · ');

  return (
    <div style={{ animation: 'sbfade .3s ease', marginTop: 6 }}>
      <div style={{ ...h, marginTop: 6 }}>Backup</div>
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
                    }`}
              </div>
            </div>
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

        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
          Synced events are read-only, but any notes you write on them stay yours. Disconnecting
          removes that account's events; your own meetings are untouched.
        </p>
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

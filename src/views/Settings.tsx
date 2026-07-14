import { useEffect, useRef, useState } from 'react';
import { C, primaryBtn, SERIF } from '../tokens';
import { useStore } from '../store';
import { clearAll } from '../db';
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

      <div style={h}>Connections</div>
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.line }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Google Calendar</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>Not connected</span>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
          Read-only calendar sync is the next thing to land. The app works fully without it.
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

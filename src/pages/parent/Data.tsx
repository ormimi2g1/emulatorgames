import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { deleteAllLocalData } from '../../data/db';
import { buildExport } from '../../data/exportData';
import { formatBytes, getStorageInfo, requestPersistentStorage, type StorageInfo } from '../../utils/storage';

export function Data() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [open, setOpen] = useState(false);
  const load = () => void getStorageInfo().then(setInfo);
  useEffect(load, []);

  const download = async () => {
    const data = await buildExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kids-arcade-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = info?.quota ? Math.min(100, (info.usage / info.quota) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-xl font-bold">Storage on this device</h2>
        {info?.supported ? (
          <>
            <div className="surface-2 h-4 overflow-hidden rounded-full" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-grass" style={{ width: `${Math.max(pct, 1)}%` }} />
            </div>
            <p>{formatBytes(info.usage)} used of about {formatBytes(info.quota)} available.</p>
            <p className="muted text-sm">
              {info.persisted
                ? '✅ Protected: the browser will not clear this data on its own.'
                : "Not protected yet: if the device runs low on space, the browser may clear the arcade's data."}
            </p>
            {!info.persisted && (
              <button className="btn btn-ghost self-start" onClick={async () => { await requestPersistentStorage(); load(); }}>
                Protect my data
              </button>
            )}
          </>
        ) : (
          <p>This browser doesn't report storage usage.</p>
        )}
      </section>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-xl font-bold">Backup</h2>
        <p className="muted">Download players and settings as a file. Your parent PIN is never included.</p>
        <button className="btn btn-primary self-start" onClick={() => void download()}>⬇ Download backup</button>
      </section>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-xl font-bold">Delete everything</h2>
        <p className="muted">Removes all players, settings and the parent PIN from this device.</p>
        <button className="btn btn-danger self-start" onClick={() => setOpen(true)}>Delete all data</button>
      </section>
      <Dialog open={open} title="Delete all arcade data?" onClose={() => setOpen(false)}>
        <p className="mb-3">This can't be undone. Type <strong>DELETE</strong> to confirm.</p>
        <input className="input mb-4" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" />
        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button
            className="btn btn-danger"
            disabled={confirmText !== 'DELETE'}
            onClick={async () => {
              await deleteAllLocalData();
              window.location.assign('/');
            }}
          >
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}

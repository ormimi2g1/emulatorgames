import { useState } from 'react';
import { AvatarBadge } from '../../components/AvatarBadge';
import { Dialog } from '../../components/Dialog';
import { ProfileEditor } from '../../components/ProfileEditor';
import { deleteProfile, makeProfile, MAX_PROFILES } from '../../data/profiles';
import type { ChildProfile } from '../../data/types';
import { useApp } from '../../state/AppContext';

export function Profiles() {
  const { profiles, updateProfile, refresh } = useApp();
  const [editing, setEditing] = useState<ChildProfile | null>(null);
  const [removing, setRemoving] = useState<ChildProfile | null>(null);

  if (editing) {
    return (
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-2xl font-bold">{profiles.some((p) => p.id === editing.id) ? `Edit ${editing.nickname}` : 'New player'}</h2>
        <ProfileEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (p) => {
            await updateProfile(p);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {profiles.map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
            <AvatarBadge avatarId={p.avatarId} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{p.nickname}</p>
              <p className="muted text-sm">
                {p.ageRange ? `Age ${p.ageRange} · ` : ''}
                {p.assignedGames === 'all' ? 'All games' : `${p.assignedGames.length} games`}
                {p.isDemo ? ' · demo' : ''}
              </p>
            </div>
            <button className="btn btn-ghost" onClick={() => setEditing(p)}>Edit</button>
            <button className="btn btn-danger" onClick={() => setRemoving(p)} aria-label={`Delete ${p.nickname}`}>Delete</button>
          </li>
        ))}
      </ul>
      <button
        className="btn btn-primary self-start"
        disabled={profiles.length >= MAX_PROFILES}
        onClick={() => setEditing(makeProfile({ nickname: '', avatarId: 'panda' }))}
      >
        ➕ Add player
      </button>
      <Dialog open={!!removing} title={`Delete ${removing?.nickname}?`} onClose={() => setRemoving(null)}>
        <p className="mb-4">This removes the player and their favorites and trophies from this device. It can't be undone.</p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={() => setRemoving(null)}>Keep</button>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (removing) await deleteProfile(removing.id);
              setRemoving(null);
              await refresh();
            }}
          >
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { AvatarBadge } from '../components/AvatarBadge';
import { Background } from '../components/Background';
import { useApp } from '../state/AppContext';

export function ProfilePicker() {
  const { profiles, selectProfile } = useApp();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
      <Background />
      <h1 className="text-center text-4xl font-bold">Who's playing?</h1>
      {profiles.length === 0 ? (
        <p className="card max-w-sm p-6 text-center text-lg">Ask a grown-up to add a player in the Parent Zone.</p>
      ) : (
        <ul className="flex max-w-3xl flex-wrap justify-center gap-6">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="card pop-in flex w-36 flex-col items-center gap-3 p-5 text-xl font-bold transition-transform hover:scale-105"
                onClick={async () => {
                  await selectProfile(p.id);
                  navigate('/');
                }}
              >
                <AvatarBadge avatarId={p.avatarId} size={88} />
                <span className="max-w-full truncate">{p.nickname}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/parent" className="btn btn-ghost">🔐 Parent Zone</Link>
    </div>
  );
}

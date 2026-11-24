import { NavLink, Outlet } from 'react-router-dom';
import { useParentAuth } from '../../auth/ParentAuthContext';
import { ParentGate } from './ParentGate';

const TABS = [
  { to: '/parent', label: 'Dashboard', end: true },
  { to: '/parent/profiles', label: 'Players' },
  { to: '/parent/retro', label: 'Retro Games' },
  { to: '/parent/games', label: 'Games' },
  { to: '/parent/settings', label: 'Settings' },
  { to: '/parent/data', label: 'Storage & Data' },
  { to: '/parent/security', label: 'Security' },
];

export function ParentZone() {
  const { unlocked, lock } = useParentAuth();
  if (!unlocked) return <ParentGate />;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h1 className="text-3xl font-bold sm:text-4xl">🔐 Parent Zone</h1>
        <button type="button" className="btn btn-ghost" onClick={lock}>Lock</button>
      </div>
      <nav aria-label="Parent Zone" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2 font-semibold ${isActive ? 'bg-purple text-white' : 'surface-2'}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

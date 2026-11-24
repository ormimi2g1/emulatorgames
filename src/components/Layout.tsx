import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { AvatarBadge } from './AvatarBadge';
import { Background } from './Background';
import { OfflineBadge } from './OfflineBadge';

export const NAV_ITEMS = [
  { to: '/', label: 'Home', emoji: '🏠', primary: true },
  { to: '/adventure', label: 'Adventure', emoji: '🗺️', primary: true },
  { to: '/retro', label: 'Retro', emoji: '🕹️', primary: true },
  { to: '/learn', label: 'Learn & Play', emoji: '🎓', primary: true },
  { to: '/racing', label: 'Racing', emoji: '🏎️', primary: false },
  { to: '/puzzles', label: 'Puzzles', emoji: '🧩', primary: false },
  { to: '/my-games', label: 'My Games', emoji: '❤️', primary: false },
  { to: '/achievements', label: 'Achievements', emoji: '🏆', primary: false },
  { to: '/parent', label: 'Parent Zone', emoji: '🔐', primary: false },
] as const;

function SideNav() {
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 overflow-y-auto p-4 lg:flex">
      <Link to="/" className="mb-4 flex items-center gap-2 px-2">
        <img src="/icons/icon.svg" alt="" className="h-12 w-12" />
        <span className="text-xl font-bold leading-tight">Kids Adventure Arcade</span>
      </Link>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-lg font-semibold ${isActive ? 'bg-purple text-white' : 'hover:bg-[var(--surface-2)]'}`
          }
        >
          <span aria-hidden="true" className="text-2xl">{item.emoji}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const secondary = NAV_ITEMS.filter((i) => !i.primary);
  const onSecondary = secondary.some((i) => location.pathname.startsWith(i.to));
  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-navy/60 lg:hidden" onClick={() => setMoreOpen(false)} aria-hidden="true" />
      )}
      {moreOpen && (
        <div id="more-menu" role="menu" aria-label="More sections" className="card fixed inset-x-3 bottom-24 z-50 grid grid-cols-3 gap-2 p-3 lg:hidden">
          {secondary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl text-center text-sm font-semibold surface-2"
            >
              <span aria-hidden="true" className="text-3xl">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--surface)] lg:hidden">
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.filter((i) => i.primary).map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center text-xs font-semibold ${isActive ? 'text-purple dark:text-sun' : 'muted'}`
                }
              >
                <span aria-hidden="true" className="text-2xl">{item.emoji}</span>
                {item.label.replace(' & Play', '')}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="more-menu"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex min-h-16 w-full flex-col items-center justify-center text-xs font-semibold ${moreOpen || onSecondary ? 'text-purple dark:text-sun' : 'muted'}`}
            >
              <span aria-hidden="true" className="text-2xl">✨</span>
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function TopBar() {
  const { activeProfile } = useApp();
  return (
    <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-8">
      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <img src="/icons/icon.svg" alt="" className="h-10 w-10" />
        <span className="text-lg font-bold">Kids Arcade</span>
      </Link>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2">
        <OfflineBadge />
        {activeProfile && (
          <Link
            to="/profiles"
            className="flex items-center gap-2 rounded-full bg-[var(--surface)] py-1 pl-1 pr-4 font-semibold shadow"
            aria-label={`Playing as ${activeProfile.nickname}. Switch player`}
          >
            <AvatarBadge avatarId={activeProfile.avatarId} size={40} />
            <span className="max-w-28 truncate">{activeProfile.nickname}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-dvh">
      <Background />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

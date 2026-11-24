import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ParentAuthProvider } from './auth/ParentAuthContext';
import { Layout } from './components/Layout';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Achievements } from './pages/Achievements';
import { Category } from './pages/Category';
import { Home } from './pages/Home';
import { MyGames } from './pages/MyGames';
import { ProfilePicker } from './pages/ProfilePicker';
import { Welcome } from './pages/Welcome';
import { Dashboard } from './pages/parent/Dashboard';
import { Data } from './pages/parent/Data';
import { Games } from './pages/parent/Games';
import { ParentZone } from './pages/parent/ParentZone';
import { Profiles } from './pages/parent/Profiles';
import { Security } from './pages/parent/Security';
import { Settings } from './pages/parent/Settings';
import { AppProvider, useApp } from './state/AppContext';

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <img src="/icons/icon.svg" alt="Loading" className="h-24 w-24 animate-pulse" />
    </div>
  );
}

/** First run goes to setup; no player selected goes to the picker. */
function RequireSetup() {
  const { ready, hasPin } = useApp();
  if (!ready) return <Loading />;
  if (!hasPin) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

function RequireProfile() {
  const { activeProfile } = useApp();
  if (!activeProfile) return <Navigate to="/profiles" replace />;
  return <Outlet />;
}

function WelcomeRoute() {
  const { ready, hasPin } = useApp();
  if (!ready) return <Loading />;
  return hasPin ? <Navigate to="/" replace /> : <Welcome />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeRoute />} />
      <Route element={<RequireSetup />}>
        <Route path="/profiles" element={<ProfilePicker />} />
        <Route element={<Layout />}>
          <Route path="/parent" element={<ParentZone />}>
            <Route index element={<Dashboard />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="games" element={<Games />} />
            <Route path="settings" element={<Settings />} />
            <Route path="data" element={<Data />} />
            <Route path="security" element={<Security />} />
          </Route>
          <Route element={<RequireProfile />}>
            <Route index element={<Home />} />
            <Route path="/adventure" element={<Category category="adventure" />} />
            <Route path="/retro" element={<Category category="retro" />} />
            <Route path="/racing" element={<Category category="racing" />} />
            <Route path="/puzzles" element={<Category category="puzzles" />} />
            <Route path="/learn" element={<Category category="learn" />} />
            <Route path="/my-games" element={<MyGames />} />
            <Route path="/achievements" element={<Achievements />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ParentAuthProvider>{children}</ParentAuthProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppRoutes />
        <UpdatePrompt />
      </Providers>
    </BrowserRouter>
  );
}

import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Safe update handling: a new version waits until the user taps "Update".
 * Updating only replaces cached app files; IndexedDB data (profiles, games, saves) is untouched.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div role="status" className="card fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 p-4 lg:bottom-6">
      <span className="text-3xl" aria-hidden="true">🎁</span>
      <p className="flex-1 font-semibold">A new version of the arcade is ready!</p>
      <button type="button" className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>Later</button>
      <button type="button" className="btn btn-sun" onClick={() => void updateServiceWorker(true)}>Update</button>
    </div>
  );
}

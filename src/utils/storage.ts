export interface StorageInfo {
  supported: boolean;
  usage: number;
  quota: number;
  persisted: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!s?.estimate) return { supported: false, usage: 0, quota: 0, persisted: false };
  const [est, persisted] = await Promise.all([s.estimate(), s.persisted ? s.persisted() : Promise.resolve(false)]);
  return { supported: true, usage: est.usage ?? 0, quota: est.quota ?? 0, persisted };
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  return navigator.storage?.persist ? navigator.storage.persist() : false;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

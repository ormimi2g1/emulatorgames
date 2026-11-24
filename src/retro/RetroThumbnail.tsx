import { useEffect, useState } from 'react';
import { Thumbnail } from '../games/Thumbnail';
import { getRetroArt } from './store';

/** Parent-chosen artwork if there is one, otherwise the arcade's own retro picture with the title. */
export function RetroThumbnail({ romId, title, hasArt }: { romId: string; title: string; hasArt: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!hasArt) return;
    let objectUrl: string | null = null;
    let alive = true;
    void getRetroArt(romId).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [romId, hasArt]);

  if (url) return <img src={url} alt={title} className="h-full w-full object-cover" />;
  return (
    <div className="relative h-full w-full">
      <Thumbnail gameId="retro-console" title={title} />
      <span className="absolute inset-x-2 bottom-2 truncate rounded-xl bg-navy/80 px-3 py-1 text-center font-bold text-white">{title}</span>
    </div>
  );
}

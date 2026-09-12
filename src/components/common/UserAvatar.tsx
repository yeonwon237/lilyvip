import React, { useEffect, useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  className?: string;
  iconClassName?: string;
}

function normalizeAvatarUrl(value?: string): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  if (/^https?:\/\/[^\s]+$/i.test(candidate)) return candidate;
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(candidate)) return candidate;
  return null;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ src, className = '', iconClassName = 'h-5 w-5' }) => {
  const imageUrl = useMemo(() => normalizeAvatarUrl(src), [src]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageUrl]);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-lily-700 text-white ${className}`}>
      {imageUrl && !imageFailed
        ? <img src={imageUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
        : <UserRound className={iconClassName} aria-hidden="true" />}
    </span>
  );
};

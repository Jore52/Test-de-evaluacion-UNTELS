'use client';

import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`relative shrink-0 rounded-full overflow-hidden ${sizeMap[size]}`}>
      {src && failed !== src ? (
        // Google (lh3.googleusercontent.com) responde 403 si recibe Referer
        <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(src)} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-[var(--primary)] text-[var(--on-primary)] font-semibold">
          {initials}
        </div>
      )}
    </div>
  );
}

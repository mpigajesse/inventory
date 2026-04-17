import React from 'react';

interface VendeurOnlineBadgeProps {
  lastSeen: string | null | undefined;
  isOnline?: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

type Status = 'online' | 'idle' | 'offline';

function resolveStatus(lastSeen: string | null | undefined, isOnline?: boolean): Status {
  if (isOnline === true) return 'online';

  if (!lastSeen) return 'offline';

  const lastSeenMs = new Date(lastSeen).getTime();
  if (isNaN(lastSeenMs)) return 'offline';

  const diffMs = Date.now() - lastSeenMs;
  const diffMinutes = diffMs / 60_000;

  if (diffMinutes <= 5) return 'online';
  if (diffMinutes <= 30) return 'idle';
  return 'offline';
}

const STATUS_CONFIG: Record<Status, { color: string; label: string; animation: string }> = {
  online: {
    color: 'hsl(152 52% 42%)',
    label: 'En ligne',
    animation: 'onlinePulse 2s ease-in-out infinite',
  },
  idle: {
    color: 'hsl(36 88% 52%)',
    label: 'Inactif',
    animation: 'idlePulse 3s ease-in-out infinite',
  },
  offline: {
    color: 'hsl(22 15% 65%)',
    label: 'Hors ligne',
    animation: 'none',
  },
};

export function VendeurOnlineBadge({
  lastSeen,
  isOnline,
  size = 'md',
  showLabel = true,
}: VendeurOnlineBadgeProps) {
  const status = resolveStatus(lastSeen, isOnline);
  const config = STATUS_CONFIG[status];
  const dotSize = size === 'sm' ? 8 : 10;
  const shouldShowLabel = size === 'md' && showLabel;

  return (
    <>
      <style>{`
        @keyframes onlinePulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(152 52% 42% / 0.4); }
          50%       { box-shadow: 0 0 0 4px hsl(152 52% 42% / 0); }
        }
        @keyframes idlePulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(36 88% 52% / 0.4); }
          50%       { box-shadow: 0 0 0 4px hsl(36 88% 52% / 0); }
        }
      `}</style>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: config.color,
            animation: config.animation,
            flexShrink: 0,
          }}
        />
        {shouldShowLabel && (
          <span
            style={{
              fontSize: 11,
              lineHeight: 1,
              color: config.color,
              fontWeight: 500,
            }}
          >
            {config.label}
          </span>
        )}
      </span>
    </>
  );
}

type IconProps = { className?: string };

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" />
    </svg>
  );
}

export function NextIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 5.14v13.72a1 1 0 0 0 1.54.84l9-6.86a1 1 0 0 0 0-1.68l-9-6.86A1 1 0 0 0 6 5.14Z" />
      <path d="M17.5 4H20v16h-2.5z" />
    </svg>
  );
}

export function PreviousIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18 5.14v13.72a1 1 0 0 1-1.54.84l-9-6.86a1 1 0 0 1 0-1.68l9-6.86A1 1 0 0 1 18 5.14Z" />
      <path d="M4 4h2.5v16H4z" />
    </svg>
  );
}

export function ShuffleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 4h4v4M20 4l-6.5 6.5M16 20h4v-4M20 20l-6.5-6.5M4 4l4.5 4.5M4 20l16-16" />
    </svg>
  );
}

export function RepeatIcon({ className, one }: IconProps & { one?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 3l3 3-3 3" />
      <path d="M20 6H7a3 3 0 0 0-3 3v2" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M4 18h13a3 3 0 0 0 3-3v-2" />
      {one ? <path d="M12 10v4M12 10l-1.2.9" /> : null}
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function MusicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20 3.5v11.2a3.3 3.3 0 1 1-2-3V8.2l-8 1.6v7.4a3.3 3.3 0 1 1-2-3V6.8l12-2.4Z" />
    </svg>
  );
}

export function VolumeIcon({ className, muted }: IconProps & { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M16 9.5l4 5M20 9.5l-4 5" />
      ) : (
        <>
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18 7a7 7 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

import type { CSSProperties } from 'react';
import type { IconName } from './icons';
import { ICONS } from './icons';

interface IconProps {
  name: IconName;
  small?: boolean;
  /** Accessible name; omit for decorative icons. */
  label?: string;
  style?: CSSProperties;
}

/** Arrows that point "back" or "out"; mirrored in right-to-left layouts. */
const DIRECTIONAL: ReadonlySet<IconName> = new Set(['back', 'out']);

export function Icon({ name, small, label, style }: IconProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  const cls = ['ic', small && 's', DIRECTIONAL.has(name) && 'dir'].filter(Boolean).join(' ');
  return (
    <svg className={cls} viewBox="0 0 24 24" {...a11y} style={style}>
      <path d={ICONS[name]} />
    </svg>
  );
}

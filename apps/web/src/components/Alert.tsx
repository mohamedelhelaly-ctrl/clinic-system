import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Yellow warning box used for allergies and duplicates. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert">
      <Icon name="alert" />
      <div>{children}</div>
    </div>
  );
}

/** Grey dashed box for content the current role cannot see. */
export function Locked({ children }: { children: ReactNode }) {
  return (
    <div className="locked">
      <Icon name="lock" />
      {children}
    </div>
  );
}

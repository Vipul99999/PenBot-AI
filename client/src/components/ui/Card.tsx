import { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return <div className="surface p-4">{children}</div>;
}

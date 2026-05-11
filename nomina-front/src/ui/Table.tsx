import React from 'react';

export default function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-auto ${className}`}>{children}</div>;
}

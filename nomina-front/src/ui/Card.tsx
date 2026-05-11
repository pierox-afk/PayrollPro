import React from 'react';

export default function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border rounded-md p-4 shadow-sm ${className}`}>{children}</div>;
}

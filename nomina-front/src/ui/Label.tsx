import React from 'react';

export default function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm text-gray-600 block mb-1 ${className}`}>{children}</label>;
}

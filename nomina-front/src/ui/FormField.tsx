import React from 'react';
import Label from './Label';

export default function FormField({ label, children, className = '' }: { label?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  );
}

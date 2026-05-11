import React from 'react';

export default function Button({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md font-medium transition-colors shadow-sm ${className}`}
    >
      {children}
    </button>
  );
}

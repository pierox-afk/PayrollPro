import React from 'react';

export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`border p-2 rounded-md shadow-sm ${props.className || ''}`} />;
}

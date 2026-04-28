import { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({ className = '', loading = false, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`rounded-xl bg-brand px-4 py-2 text-white disabled:opacity-60 disabled:cursor-not-allowed transition ${className}`}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}

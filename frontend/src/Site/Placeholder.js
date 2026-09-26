import React from 'react';

function Placeholder({ className = '' }) {
  return (
    <div className={`site-ph ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <rect x="6" y="8" width="36" height="32" rx="4" />
        <circle cx="17" cy="19" r="3.5" />
        <path d="M6 34l10-9 8 7 6-5 12 10" />
      </svg>
    </div>
  );
}

export default Placeholder;

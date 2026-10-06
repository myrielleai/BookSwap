import React from 'react';

const StatusBadge = ({ status, type = 'listing', className = '' }) => {
  if (!status) return null;

  const normalizedStatus = String(status).toLowerCase();

  const styles = {
    // Listing Statuses
    unverified: 'bg-amber-100/80 text-amber-900 border-amber-300/80',
    available: 'pill-moss',
    locked: 'bg-teal-100/80 text-teal-900 border-teal-300/80',
    returned: 'bg-purple-100/80 text-purple-900 border-purple-300/80',
    rejected: 'bg-rose-100/80 text-rose-900 border-rose-300/80',
    archived: 'bg-stone-200/70 text-stone-700 border-stone-300/80',
    withdrawn: 'bg-stone-200/70 text-stone-600 border-stone-300/80',

    // Exchange / Request Statuses
    pending: 'bg-amber-100/80 text-amber-900 border-amber-300/80',
    accepted: 'pill-moss',
    declined: 'bg-rose-100/80 text-rose-900 border-rose-300/80',

    // Transaction Statuses
    scheduled: 'bg-amber-100/80 text-amber-900 border-amber-300/80',
    completed: 'pill-moss',
    cancelled: 'bg-rose-100/80 text-rose-900 border-rose-300/80',

    // User Statuses
    active: 'pill-moss',
    inactive: 'bg-stone-200/70 text-stone-600 border-stone-300/80',
    suspended: 'bg-rose-100/80 text-rose-900 border-rose-300/80',
    admin: 'bg-purple-100/80 text-purple-900 border-purple-300/80',
    staff: 'bg-indigo-100/80 text-indigo-900 border-indigo-300/80',
    customer: 'bg-stone-200/70 text-stone-800 border-stone-300/80',
  };

  const defaultStyle = 'bg-stone-200/70 text-stone-700 border-stone-300/80';
  const badgeStyle = styles[normalizedStatus] || defaultStyle;

  const displayLabel = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_1px_rgba(90,60,30,0.12)] ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;

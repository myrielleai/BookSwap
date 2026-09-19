import React from 'react';

const StatusBadge = ({ status, type = 'listing', className = '' }) => {
  if (!status) return null;

  const normalizedStatus = String(status).toLowerCase();

  const styles = {
    // Listing Statuses
    unverified: 'bg-amber-100 text-amber-800 border-amber-200',
    available: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    locked: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    returned: 'bg-purple-100 text-purple-800 border-purple-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    archived: 'bg-slate-100 text-slate-700 border-slate-200',
    withdrawn: 'bg-gray-100 text-gray-600 border-gray-200',

    // Exchange / Request Statuses
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-blue-50 text-blue-700 border-blue-200',
    declined: 'bg-rose-50 text-rose-700 border-rose-200',

    // Transaction Statuses
    scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-200',

    // User Statuses
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    suspended: 'bg-rose-100 text-rose-800 border-rose-200',
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    staff: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    customer: 'bg-sky-100 text-sky-800 border-sky-200',
  };

  const defaultStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  const badgeStyle = styles[normalizedStatus] || defaultStyle;

  const displayLabel = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;

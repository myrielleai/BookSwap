import React from 'react';
import { CheckCircle } from 'lucide-react';

// "2026-10-07 18:05:00" (database time) → "Oct 7, 2026, 6:05 PM"
export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

// Proof that an exchange finished: when it was recorded and by which moderator.
// Shown to both readers and to staff on every completed transaction.
const CompletionRecord = ({ tx }) => (
  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
    <p className="font-bold flex items-center gap-1.5">
      <CheckCircle className="w-4 h-4 text-emerald-700" />
      Exchange completed{tx.completed_at ? ` on ${formatDateTime(tx.completed_at)}` : ''}
    </p>
    <p>
      {tx.target_title} ↔ {tx.offered_title}, between {tx.owner_name} and {tx.requester_name}.
      {tx.handler_name ? ` Recorded by moderator ${tx.handler_name}.` : ''}
    </p>
    {tx.slot_date && (
      <p className="text-emerald-800">
        Handover: {tx.slot_date}
        {tx.location_name ? ` at ${tx.location_name}${tx.location_city ? `, ${tx.location_city}` : ''}` : ''}
      </p>
    )}
  </div>
);

export default CompletionRecord;

import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading catalog...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <Loader2 className="w-10 h-10 text-moss-500 animate-spin mb-3" />
    <p className="font-hand text-2xl text-leather-700">{message}</p>
  </div>
);

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-start justify-between my-4 shadow-inner">
    <div>
      <p className="font-semibold mb-1">Error</p>
      <p className="text-rose-700">{message || 'Something went wrong while loading data.'}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="btn-danger text-xs font-semibold px-3 py-1 rounded-md ml-4"
      >
        Retry
      </button>
    )}
  </div>
);

export const EmptyState = ({
  icon: Icon,
  title = 'No items found',
  description = 'Try adjusting your search criteria or filters.',
  action,
}) => (
  <div className="paper-lined flex flex-col items-center justify-center p-12 pl-16 text-center rounded-lg border border-leather-200 shadow-[0_10px_24px_-12px_rgba(90,60,30,0.28)]">
    {Icon && (
      <div className="well w-14 h-14 rounded-full flex items-center justify-center text-moss-600 mb-4">
        <Icon className="w-7 h-7" />
      </div>
    )}
    <h4 className="font-display font-extrabold text-lg text-stone-900 mb-1">{title}</h4>
    <p className="font-hand text-xl text-leather-700 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

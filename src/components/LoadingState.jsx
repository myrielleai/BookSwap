import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading catalog...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" />
    <p className="text-sm font-medium text-slate-600">{message}</p>
  </div>
);

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start justify-between my-4">
    <div>
      <p className="font-semibold mb-1">Error</p>
      <p className="text-rose-700">{message || 'Something went wrong while loading data.'}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs font-semibold px-3 py-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors ml-4"
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
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200/80 rounded-2xl shadow-sm">
    {Icon && (
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-7 h-7" />
      </div>
    )}
    <h4 className="text-base font-semibold text-slate-800 mb-1">{title}</h4>
    <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

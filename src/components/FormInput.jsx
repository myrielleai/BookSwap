import React, { forwardRef } from 'react';

const FormInput = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      type = 'text',
      className = '',
      required = false,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const inputId = id || name || Math.random().toString(36).substr(2, 9);

    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            required={required}
            className={`block w-full rounded-lg border text-sm transition-colors duration-200 py-2.5 ${
              Icon ? 'pl-9' : 'pl-3.5'
            } pr-3.5 ${
              error
                ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                : 'border-slate-300 text-slate-900 focus:border-brand-500 focus:ring-brand-500 bg-white'
            } focus:outline-none focus:ring-1`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;

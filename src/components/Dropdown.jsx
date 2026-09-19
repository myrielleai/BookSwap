import React, { forwardRef } from 'react';

const Dropdown = forwardRef(
  (
    {
      label,
      options = [],
      value,
      onChange,
      error,
      helperText,
      placeholder = 'Select an option',
      required = false,
      className = '',
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
        <select
          ref={ref}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={`block w-full rounded-lg border text-sm transition-colors duration-200 px-3.5 py-2.5 bg-white ${
            error
              ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
              : 'border-slate-300 text-slate-900 focus:border-brand-500 focus:ring-brand-500'
          } focus:outline-none focus:ring-1`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value ?? opt.id : opt;
            const lbl = typeof opt === 'object' ? opt.label ?? opt.name : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        {error ? (
          <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export default Dropdown;

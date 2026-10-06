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
          <label htmlFor={inputId} className="block text-sm font-bold text-stone-800">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-leather-400 z-[1]">
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
                ? 'field-error text-rose-900'
                : 'text-stone-900'
            } field-inset focus:outline-none`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-stone-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;

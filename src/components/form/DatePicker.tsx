import { useEffect, useRef, useCallback } from 'react';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export default function DatePicker({
  id,
  value = '',
  onChange,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  minDate,
  maxDate
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatpickrRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref current
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (inputRef.current && !flatpickrRef.current) {
      flatpickrRef.current = flatpickr(inputRef.current, {
        dateFormat: 'Y-m-d',
        allowInput: true,
        clickOpens: true,
        minDate: minDate || undefined,
        maxDate: maxDate || undefined,
        defaultDate: value || undefined,
        onChange: (selectedDates, dateStr) => {
          console.log('DatePicker onChange:', dateStr);
          onChangeRef.current(dateStr);
        },
        onReady: () => {
          const calendar = document.querySelector('.flatpickr-calendar');
          if (calendar) {
            calendar.classList.add('shadow-lg', 'border-gray-200', 'dark:border-gray-700');
          }
        }
      });
    }

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
        flatpickrRef.current = null;
      }
    };
  }, []); // Empty dependency array - initialize once

  useEffect(() => {
    if (flatpickrRef.current) {
      flatpickrRef.current.set('minDate', minDate || undefined);
      flatpickrRef.current.set('maxDate', maxDate || undefined);
    }
  }, [minDate, maxDate]);

  useEffect(() => {
    if (flatpickrRef.current && value !== flatpickrRef.current.input.value) {
      flatpickrRef.current.setDate(value || '', false);
    }
  }, [value]);

  const handleClear = () => {
    if (flatpickrRef.current) {
      flatpickrRef.current.clear();
      onChange('');
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className={`h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 pr-10 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30 ${className}`}
        readOnly
      />
      
      {/* Calendar Icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';

export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      {/* Select Button */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-body-md py-3 px-4 transition-all ${
          disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-outline'
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-on-surface-variant' : 'text-on-surface'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-2">
          {loading && <span className="material-symbols-outlined animate-spin text-[16px] text-primary">sync</span>}
          <span
            className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !loading && (
        <div className="absolute z-[100] w-full mt-1 bg-surface border border-outline-variant rounded-lg shadow-2xl overflow-hidden animate-fade-in origin-top opacity-100">
          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-on-surface-variant font-body-md italic text-center">
                No options available
              </li>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-3 font-body-md cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

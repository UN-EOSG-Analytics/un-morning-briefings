'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnFilterProps {
  columnName: string;
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function ColumnFilter({
  columnName,
  options,
  selectedValue,
  onValueChange,
}: ColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-1 ${
          selectedValue !== 'all'
            ? 'bg-un-blue/10 text-un-blue'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Filter className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-[9999] min-w-[200px] rounded-md border border-slate-200 bg-white shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                onValueChange('all');
                setIsOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                selectedValue === 'all'
                  ? 'bg-un-blue/10 text-un-blue font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              All {columnName}s
            </button>
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onValueChange(option);
                  setIsOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  selectedValue === option
                    ? 'bg-un-blue/10 text-un-blue font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

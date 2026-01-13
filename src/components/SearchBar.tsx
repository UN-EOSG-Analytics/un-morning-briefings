'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function SearchBar({ searchTerm, onSearchChange }: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Search entries..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
      />
    </div>
  );
}

'use client';

import { Search, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { REGIONS, CATEGORIES, PRIORITIES } from '@/types/morning-meeting';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterRegion: string;
  onRegionChange: (value: string) => void;
  filterCategory: string;
  onCategoryChange: (value: string) => void;
  filterPriority: string;
  onPriorityChange: (value: string) => void;
  onReset: () => void;
  resultCount: number;
  resultLabel: string;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  filterRegion,
  onRegionChange,
  filterCategory,
  onCategoryChange,
  filterPriority,
  onPriorityChange,
  onReset,
  resultCount,
  resultLabel,
}: FilterBarProps) {
  return (
    <Card className="border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-[350]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
          />
        </div>

        {/* Region Filter */}
        <Select value={filterRegion} onValueChange={onRegionChange}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={filterCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={filterPriority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>

        <div className="ml-auto text-xs text-slate-600">
          {resultCount} {resultLabel}
        </div>
      </div>
    </Card>
  );
}

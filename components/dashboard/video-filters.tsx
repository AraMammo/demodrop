'use client';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface VideoFiltersProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function VideoFilters({
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange
}: VideoFiltersProps) {
  const filters = [
    { label: 'All', value: 'all' },
    { label: 'Processing', value: 'generating' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' },
  ];

  return (
    <div className="mb-8 flex flex-col sm:flex-row gap-4">
      <Input
        type="search"
        placeholder="Search by website URL..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="sm:max-w-xs"
      />

      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <Badge
            key={filter.value}
            variant={currentFilter === filter.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

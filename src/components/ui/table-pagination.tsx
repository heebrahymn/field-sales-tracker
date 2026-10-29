import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemName = 'records',
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 select-none',
        className
      )}
    >
      {/* Left: Summary and Page Size Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          Showing <span className="font-bold text-slate-800">{startItem}</span> to{' '}
          <span className="font-bold text-slate-800">{endItem}</span> of{' '}
          <span className="font-bold text-slate-900">{totalItems}</span> {itemName}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="border border-slate-200 rounded-md px-2 py-1 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-hidden focus:border-brand-blue"
            title="Items per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 border-slate-200 disabled:opacity-40"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 border-slate-200 disabled:opacity-40"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                  ...
                </span>
              );
            }
            const pageNum = Number(page);
            const isActive = pageNum === safeCurrentPage;
            return (
              <Button
                key={`page-${pageNum}`}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'h-7 min-w-[28px] px-2 text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-brand-blue text-white hover:bg-brand-blue/90 border-brand-blue shadow-2xs'
                    : 'text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 border-slate-200 disabled:opacity-40"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 border-slate-200 disabled:opacity-40"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};


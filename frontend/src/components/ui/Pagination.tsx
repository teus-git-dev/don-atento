import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalRecords, onPageChange }: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic for ellipsis and complex pagination could go here.
      // For simplicity in this modern dashboard, we'll show first, last, and current neighbors.
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1 && totalRecords === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/10 px-4 py-4 sm:px-6 mt-4 gap-4">
      <div className="hidden sm:flex flex-1 justify-start">
        <p className="text-sm text-gray-400">
          Mostrando página <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages || 1}</span> 
          {' '}(<span className="font-medium text-gray-300">{totalRecords}</span> registros)
        </p>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || totalPages === 0}
          className="relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </button>
        
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => (
            <button
              key={idx}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={typeof page !== 'number'}
              className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                page === currentPage
                  ? 'bg-[var(--color-neon-cyan)] text-black shadow-[0_0_10px_rgba(0,255,255,0.3)] z-10'
                  : typeof page === 'number'
                  ? 'text-gray-400 bg-transparent hover:bg-white/10 hover:text-white'
                  : 'text-gray-500 cursor-default'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
}

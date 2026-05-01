import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/10 ${className}`}
    />
  );
}

// Pre-built skeletons for specific UI elements
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton className="h-4 w-3/4" />
          {i === 0 && <Skeleton className="h-3 w-1/2 mt-2 opacity-50" />} {/* For subtext like email */}
        </td>
      ))}
    </tr>
  );
}

import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  return (
    <div
      style={{ width, height }}
      className={`bg-surface-container-high rounded animate-skeleton ${className}`}
    />
  );
};

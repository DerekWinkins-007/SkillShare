import React from 'react';

export interface StarRatingProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  onChange,
  size = 'md',
  'data-testid': testId,
}) => {
  const iconSize = {
    sm: 'text-[16px]',
    md: 'text-[20px]',
    lg: 'text-[24px]',
  }[size];

  return (
    <div className="inline-flex items-center gap-0.5" data-testid={testId}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = rating >= starValue;
        const isHalf = !isFilled && rating >= starValue - 0.5;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            className={`transition-transform ${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            }`}
          >
            <span
              className={`material-symbols-outlined ${iconSize} ${
                isFilled || isHalf ? 'text-amber-500' : 'text-neutral-300'
              }`}
              style={{
                fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {isHalf ? 'star_half' : 'star'}
            </span>
          </button>
        );
      })}
    </div>
  );
};

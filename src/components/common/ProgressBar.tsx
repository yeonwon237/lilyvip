import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  className?: string;
  barColor?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  barColor = 'bg-lily-500',
  size = 'sm',
  showLabel = false,
}) => {
  const height = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${height} bg-ink-100 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${barColor} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1 text-xs text-ink-500">
          <span>Tiến độ</span>
          <span className="font-medium text-ink-700">{clampedProgress}%</span>
        </div>
      )}
    </div>
  );
};

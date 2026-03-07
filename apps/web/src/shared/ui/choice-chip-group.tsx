import { cn } from '@repo/ui/lib/utils';

type ChoiceChipGroupProps<T extends string> = {
  values: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  className?: string;
};

export const ChoiceChipGroup = <T extends string>({
  values,
  selected,
  onToggle,
  className,
}: ChoiceChipGroupProps<T>) => (
  <div className={cn('flex flex-wrap gap-2', className)}>
    {values.map((value) => {
      const isActive = selected.includes(value);
      return (
        <button
          key={value}
          type="button"
          className={cn(
            'rounded-full border px-3.5 py-2 text-xs font-medium capitalize transition-colors',
            isActive
              ? 'border-primary bg-primary text-primary-foreground shadow-[0_12px_24px_-16px_color-mix(in_oklab,var(--primary)_70%,black)]'
              : 'border-border bg-card text-secondary-foreground hover:bg-surface-muted',
          )}
          onClick={() => onToggle(value)}
        >
          {value}
        </button>
      );
    })}
  </div>
);

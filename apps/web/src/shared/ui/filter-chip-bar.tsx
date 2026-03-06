import { Button } from '@/shared/ui/button';

type FilterChipItem = {
  key: string;
  label: string;
  onClear: () => void;
};

type FilterChipBarProps = {
  items: FilterChipItem[];
  onResetAll?: () => void;
};

export const FilterChipBar = ({ items, onResetAll }: FilterChipBarProps) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="border-border bg-surface-elevated text-text-soft hover:bg-surface-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
          onClick={item.onClear}
        >
          <span>{item.label}</span>
          <span className="text-text-strong text-[11px]">x</span>
        </button>
      ))}
      {onResetAll ? (
        <Button type="button" variant="ghost" className="h-7 rounded-full px-3 text-xs" onClick={onResetAll}>
          Clear all
        </Button>
      ) : null}
    </div>
  );
};

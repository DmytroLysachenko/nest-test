import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type TagInputProps = {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  maxItems?: number;
};

export const TagInput = ({ label, placeholder, values, onChange, disabled = false, maxItems = 20 }: TagInputProps) => {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const value = draft.trim();
    if (!value || disabled) {
      return;
    }
    if (values.length >= maxItems) {
      return;
    }
    if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  const removeTag = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  return (
    <div className="space-y-2">
      <p className="text-foreground text-sm font-medium">
        {label}{' '}
        <span className="text-muted-foreground text-xs font-normal">
          ({values.length}/{maxItems})
        </span>
      </p>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={addTag} disabled={disabled || !draft.trim()}>
          Add
        </Button>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              className="app-badge hover:bg-muted/85 disabled:opacity-60"
              onClick={() => removeTag(value)}
              title="Remove"
            >
              {value} x
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">No values added yet.</p>
      )}
      {values.length >= maxItems ? <p className="text-xs text-amber-700">Maximum number of items reached.</p> : null}
    </div>
  );
};

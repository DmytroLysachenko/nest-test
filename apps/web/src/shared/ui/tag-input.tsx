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
      <p className="text-sm font-medium text-slate-800">
        {label}{' '}
        <span className="text-xs font-normal text-slate-500">
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
              className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              onClick={() => removeTag(value)}
              title="Remove"
            >
              {value} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No values added yet.</p>
      )}
      {values.length >= maxItems ? <p className="text-xs text-amber-700">Maximum number of items reached.</p> : null}
    </div>
  );
};

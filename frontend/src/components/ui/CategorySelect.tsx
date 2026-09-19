import { useState } from "react";
import { Input, Select } from "./Field";

const NEW = "__new__";

interface CategorySelectProps {
  /** Form field name the chosen category is submitted under. */
  name: string;
  /** Active category names to offer. */
  options: string[];
  defaultValue?: string;
}

/**
 * Category dropdown with a "+ New category…" option that swaps to a text box.
 * A new name is saved to the user's list by the server when the form is submitted.
 */
export function CategorySelect({ name, options, defaultValue }: CategorySelectProps) {
  // Keep a value that's no longer in the list (e.g. an archived category) selectable.
  const choices = defaultValue && !options.includes(defaultValue) ? [defaultValue, ...options] : options;
  const [adding, setAdding] = useState(choices.length === 0);

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input name={name} placeholder="e.g. Vehicle" maxLength={40} autoFocus required />
        {choices.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="shrink-0 text-xs text-neutral-400 hover:text-brand"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <Select
      name={name}
      defaultValue={defaultValue ?? choices[0]}
      onChange={(e) => e.target.value === NEW && setAdding(true)}
    >
      {choices.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={NEW}>+ New category…</option>
    </Select>
  );
}

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

const NEW = "__new__";

interface CategorySelectProps {
  /** Form field name the chosen category is submitted under. */
  name: string;
  id?: string;
  /** Active category names to offer. */
  options: string[];
  defaultValue?: string;
}

/**
 * Category dropdown with a "+ New category…" option that swaps to a text box.
 * A new name is saved to the user's list by the server when the form is submitted.
 */
export function CategorySelect({ name, id, options, defaultValue }: CategorySelectProps) {
  // Keep a value that's no longer in the list (e.g. a hidden category) selectable.
  const choices = defaultValue && !options.includes(defaultValue) ? [defaultValue, ...options] : options;
  const [adding, setAdding] = useState(choices.length === 0);

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input id={id} name={name} placeholder="e.g. Vehicle" maxLength={40} autoFocus required />
        {choices.length > 0 && (
          <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <NativeSelect
      id={id}
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
    </NativeSelect>
  );
}

import { useMemo } from "react";
import { useFetch } from "./useFetch";
import type { CategoriesResponse } from "./types";

/** The user's categories. `names` lists the active (non-archived) ones for pickers. */
export function useCategories() {
  const { data, loading, reload } = useFetch<CategoriesResponse>("/api/categories");
  const names = useMemo(() => (data?.items ?? []).filter((c) => !c.archived).map((c) => c.name), [data]);
  return { categories: data?.items ?? [], suggestions: data?.suggestions ?? [], names, loading, reload };
}

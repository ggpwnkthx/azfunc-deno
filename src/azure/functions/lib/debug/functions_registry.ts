import type { Context } from "../../define.ts";
import { objectIfNotEmpty } from "../util.ts";

export function compileFunctionsDiagnostics(
  ctx: Context,
): {
  totalCount: number;
  list: Array<{
    name: string;
    triggerType?: string;
    triggerName?: string;
    bindingCount: number;
  }>;
  summary: { triggerTypes: Record<string, number> };
} | undefined {
  const fns = ctx.app.list();

  const triggerTypes = fns.reduce<Record<string, number>>((acc, fn) => {
    const t = fn.bindings.trigger?.type ?? "unknown";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return objectIfNotEmpty({
    totalCount: fns.length,
    list: fns.map((fn) => ({
      name: fn.name,
      triggerType: fn.bindings.trigger?.type ?? undefined,
      triggerName: fn.bindings.trigger?.name ?? undefined,
      bindingCount: fn.bindings.all.length,
    })),
    summary: { triggerTypes },
  });
}

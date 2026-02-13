export type Direction = "in" | "out" | "inout";
export type DataTypeHint = "string" | "binary" | "stream";

/* -------------------------- Base binding types --------------------------- */

export interface BindingBase {
  name: string;
  type: string;
  direction: Direction;
  dataType?: DataTypeHint;
}

// IMPORTANT: use an “empty object” type with *no* index signature.
type NoExtra = Record<never, never>;

export type Binding<
  TType extends string,
  TDirection extends Direction,
  TExtra extends object = NoExtra,
> = BindingBase & { type: TType; direction: TDirection } & TExtra;

/** Convenience aliases used heavily by binding modules */
export type InBinding<TType extends string, TExtra extends object = NoExtra> =
  Binding<TType, "in", TExtra>;
export type OutBinding<TType extends string, TExtra extends object = NoExtra> =
  Binding<TType, "out", TExtra>;

/**
 * “Extra” fields are anything beyond BindingBase.
 */
export type ExtraOf<T extends BindingBase> = Omit<T, keyof BindingBase>;

export type BuilderArgs<T extends BindingBase> =
  & { name: string; dataType?: DataTypeHint }
  & ExtraOf<T>;

type DefaultKeys<T extends BindingBase, D extends Partial<ExtraOf<T>>> = Extract<
  keyof ExtraOf<T>,
  keyof D
>;

/**
 * If `defaults` are provided for some extra keys, allow callers to omit them.
 */
export type BuilderArgsWithDefaults<
  T extends BindingBase,
  D extends Partial<ExtraOf<T>>,
> =
  & { name: string; dataType?: DataTypeHint }
  & Omit<ExtraOf<T>, DefaultKeys<T, D>>
  & Partial<Pick<ExtraOf<T>, DefaultKeys<T, D>>>;

/* ------------------------------ Runtime guards --------------------------- */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export const createBindingGuard = <T extends BindingBase>(
  type: T["type"],
  direction: T["direction"],
) =>
(obj: unknown): obj is T =>
  isRecord(obj) && obj.type === type && obj.direction === direction;

/* ------------------------------ Builders -------------------------------- */

/**
 * IMPORTANT:
 * Avoid returning the generic type parameter `T` from builders.
 * Returning a type parameter causes TS2352, because `T` might be a narrower subtype.
 *
 * Built<T> is the concrete structural type that matches your binding aliases.
 */
export type Built<
  T extends BindingBase & { type: string; direction: Direction },
> = Binding<T["type"], T["direction"], ExtraOf<T>>;

export type BindingBuilder<
  T extends BindingBase & { type: string; direction: Direction },
> = Readonly<{
  build: (args: BuilderArgs<T>) => Built<T>;
  is: (obj: unknown) => obj is T;
  /**
   * Attach defaults for some extra fields.
   * Returned builder makes those keys optional (and only those keys).
   */
  defaults: <const D extends Partial<ExtraOf<T>>>(
    defaults: D,
  ) => BindingBuilderWithDefaults<T, D>;
}>;

export type BindingBuilderWithDefaults<
  T extends BindingBase & { type: string; direction: Direction },
  D extends Partial<ExtraOf<T>>,
> = Readonly<{
  build: (args: BuilderArgsWithDefaults<T, D>) => Built<T>;
  is: (obj: unknown) => obj is T;
}>;

/**
 * Ergonomic binding builder factory.
 *
 * - Avoids the "need 2 generics" problem when defaults are passed.
 * - Keeps default-keys precise via `.defaults(...)` inference.
 */
export function defineBinding<
  T extends BindingBase & { type: string; direction: Direction },
>(type: T["type"], direction: T["direction"]): BindingBuilder<T> {
  const is = createBindingGuard<T>(type, direction);

  const buildBase = (args: BuilderArgs<T>): Built<T> => {
    const { name, dataType, ...extra } = args;
    return {
      type,
      direction,
      name,
      ...(dataType ? { dataType } : {}),
      ...(extra as ExtraOf<T>),
    } as Built<T>;
  };

  const defaults = <const D extends Partial<ExtraOf<T>>>(
    d: D,
  ): BindingBuilderWithDefaults<T, D> => {
    const buildWithDefaults = (args: BuilderArgsWithDefaults<T, D>): Built<T> => {
      const { name, dataType, ...extra } = args as unknown as BuilderArgs<T>;
      return {
        type,
        direction,
        name,
        ...(dataType ? { dataType } : {}),
        ...(d as Partial<ExtraOf<T>>),
        ...(extra as ExtraOf<T>),
      } as Built<T>;
    };

    return { build: buildWithDefaults, is } as const;
  };

  return { build: buildBase, is, defaults } as const;
}

/**
 * Direction-specific helpers (less repetition, fewer mismatch footguns).
 */
export function defineInBinding<
  T extends BindingBase & { type: string; direction: "in" },
>(type: T["type"]): BindingBuilder<T> {
  return defineBinding<T>(type, "in");
}

export function defineOutBinding<
  T extends BindingBase & { type: string; direction: "out" },
>(type: T["type"]): BindingBuilder<T> {
  return defineBinding<T>(type, "out");
}

export function defineInOutBinding<
  T extends BindingBase & { type: string; direction: "inout" },
>(type: T["type"]): BindingBuilder<T> {
  return defineBinding<T>(type, "inout");
}

/**
 * Factory function to create binding builders (legacy/low-level).
 * Kept for compatibility; direction helpers + defineBinding are preferred.
 */
export function makeBindingBuilder<
  TBinding extends BindingBase & { type: string; direction: Direction },
>(type: TBinding["type"], direction: TBinding["direction"]) {
  return ({ name, dataType, ...extra }: BuilderArgs<TBinding>): Built<TBinding> =>
    ({
      type,
      direction,
      name,
      ...(dataType ? { dataType } : {}),
      ...extra,
    }) as Built<TBinding>;
}

/* ----------------------- Derive unions from API objects ------------------ */

/**
 * Walk a nested “grouped API” object and union all builder return types.
 * Intended for: `export type XBinding = BindingFromApi<typeof x>;`
 */
export type BindingFromApi<T> = T extends (...args: infer _A) => infer R ? R
  : T extends ReadonlyArray<infer U> ? BindingFromApi<U>
  : T extends object ? BindingFromApi<T[keyof T]>
  : never;

/* ----------------------------- Known types ------------------------------ */

export const KNOWN_BINDING_TYPES = [
  "httpTrigger",
  "http",
  "blobTrigger",
  "blob",
  "queueTrigger",
  "queue",
  "table",
  "serviceBusTrigger",
  "serviceBus",
  "eventHubTrigger",
  "eventHub",
  "timerTrigger",
  "manualTrigger",
  "mobileTable",
  "documentDB",
  "notificationHub",
  "twilioSms",
  "sendGrid",
  "sql",
  "sqlTrigger",
  "kusto",
  "mysql",
  "mysqlTrigger",
] as const;

export type KnownBindingType = typeof KNOWN_BINDING_TYPES[number];

const KNOWN_BINDING_TYPE_SET: ReadonlySet<string> = new Set(
  KNOWN_BINDING_TYPES,
);

export function isKnownBindingType(t: unknown): t is KnownBindingType {
  return typeof t === "string" && KNOWN_BINDING_TYPE_SET.has(t);
}

export interface CustomBinding extends BindingBase {
  [key: string]: unknown;
}

export type AuthLevel = "anonymous" | "function" | "admin";

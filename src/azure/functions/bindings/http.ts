import type {
  AuthLevel,
  BindingFromApi,
  InBinding,
  OutBinding,
} from "./types.ts";
import { defineInBinding, defineOutBinding } from "./types.ts";

export type HttpTriggerBinding = InBinding<"httpTrigger", {
  authLevel: AuthLevel;
  route?: string;
  methods?: readonly string[];
  webHookType?: string;
}>;

export type HttpOutputBinding = OutBinding<"http">;

const httpTrigger = defineInBinding<HttpTriggerBinding>("httpTrigger").defaults(
  {
    authLevel: "anonymous",
  } as const,
);

const httpOut = defineOutBinding<HttpOutputBinding>("http");

export const isHttpTriggerBinding = httpTrigger.is;
export const isHttpOutputBinding = httpOut.is;

export const http = {
  trigger: httpTrigger.build,
  output: httpOut.build,
} as const;

export type HttpBinding = BindingFromApi<typeof http>;

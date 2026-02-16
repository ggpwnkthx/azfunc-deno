import type { Context } from "../../define.ts";
import type { InvokeRequest, JsonValue } from "../../invoke.ts";
import { discoverPrivateIp } from "./net.ts";
import { parseWebsiteOwnerName } from "./owner_name.ts";
import { findHttpRequestData } from "./request.ts";
import type {
  AzureFunctionsDiagnostics,
  CompileDiagnosticsOptions,
  FunctionsHostStatus,
} from "./types.ts";
import { compileFunctionsDiagnostics } from "./functions_registry.ts";
import { envGet, objectIfNotEmpty, parseIntEnv, tryCall } from "../util.ts";
import { fetchFunctionsHostStatus } from "./admin_api.ts";

export async function compileDiagnostics<TData extends object>(
  payload: InvokeRequest<TData, Record<string, JsonValue>>,
  ctx: Context,
  opts: CompileDiagnosticsOptions = {},
): Promise<
  AzureFunctionsDiagnostics & {
    azure: AzureFunctionsDiagnostics["azure"] & {
      functionsHostStatus?: FunctionsHostStatus;
    };
  }
> {
  const genStartMs = Date.now();
  const collectedAt = new Date().toISOString();

  const includeFunctionsList = opts.includeFunctionsList ?? true;

  const req = findHttpRequestData(
    payload as unknown as InvokeRequest<object, Record<string, JsonValue>>,
  );

  const ownerName = envGet("WEBSITE_OWNER_NAME");
  const ownerNameParsed = ownerName
    ? parseWebsiteOwnerName(ownerName)
    : undefined;

  const subscriptionId = envGet("WEBSITE_SubscriptionId") ??
    ownerNameParsed?.subscriptionId;

  const region = envGet("REGION_NAME") ??
    envGet("WEBSITE_REGION") ??
    ownerNameParsed?.inferred?.regionCandidate;

  const resourceGroup = envGet("WEBSITE_RESOURCE_GROUP") ??
    ownerNameParsed?.inferred?.resourceGroupCandidate;

  const platform = objectIfNotEmpty({
    ...(envGet("WEBSITE_SKU") ? { sku: envGet("WEBSITE_SKU") } : {}),
    ...(envGet("WEBSITE_COMPUTE_MODE")
      ? { computeMode: envGet("WEBSITE_COMPUTE_MODE") }
      : {}),
    ...(envGet("WEBSITE_PLATFORM_VERSION")
      ? { platformVersion: envGet("WEBSITE_PLATFORM_VERSION") }
      : {}),
    ...(envGet("SITE_BITNESS") ? { bitness: envGet("SITE_BITNESS") } : {}),
    ...(envGet("WEBSITE_VOLUME_TYPE")
      ? { volumeType: envGet("WEBSITE_VOLUME_TYPE") }
      : {}),
  });

  const deployment = objectIfNotEmpty({
    ...(envGet("WEBSITE_DEPLOYMENT_ID")
      ? { deploymentId: envGet("WEBSITE_DEPLOYMENT_ID") }
      : {}),
    ...(envGet("WEBSITE_RUN_FROM_PACKAGE")
      ? { runFromPackage: envGet("WEBSITE_RUN_FROM_PACKAGE") }
      : {}),
    ...(envGet("WEBSITE_CONTENTSHARE")
      ? { contentShare: envGet("WEBSITE_CONTENTSHARE") }
      : {}),
  });

  const app = objectIfNotEmpty({
    ...(envGet("WEBSITE_SITE_NAME")
      ? { name: envGet("WEBSITE_SITE_NAME") }
      : {}),
    ...(envGet("WEBSITE_HOSTNAME")
      ? { hostname: envGet("WEBSITE_HOSTNAME") }
      : {}),
    ...(envGet("WEBSITE_SLOT_NAME")
      ? { slotName: envGet("WEBSITE_SLOT_NAME") }
      : {}),
    ...(region ? { region } : {}),
    ...(subscriptionId ? { subscriptionId } : {}),
    ...(resourceGroup ? { resourceGroup } : {}),
    ...(ownerName ? { ownerName } : {}),
    ...(ownerNameParsed && Object.keys(ownerNameParsed).length > 0
      ? { ownerNameParsed }
      : {}),
    ...(platform ? { platform } : {}),
    ...(deployment ? { deployment } : {}),
  });

  const privateIp = envGet("WEBSITE_PRIVATE_IP") ?? discoverPrivateIp();

  const instance = objectIfNotEmpty({
    ...(envGet("WEBSITE_INSTANCE_ID")
      ? { websiteInstanceId: envGet("WEBSITE_INSTANCE_ID") }
      : {}),
    ...(envGet("WEBSITE_ROLE_INSTANCE_ID")
      ? { websiteRoleInstanceId: envGet("WEBSITE_ROLE_INSTANCE_ID") }
      : {}),
    ...(envGet("WEBSITES_ROLE_WORKER_ID")
      ? { roleWorkerId: envGet("WEBSITES_ROLE_WORKER_ID") }
      : {}),
    ...(envGet("CONTAINER_NAME")
      ? { containerName: envGet("CONTAINER_NAME") }
      : {}),
    ...(envGet("HOSTNAME") ? { hostName: envGet("HOSTNAME") } : {}),
    ...(privateIp ? { privateIp } : {}),
    pid: Deno.pid,
    ...(tryCall(() => Deno.osUptime()) !== undefined
      ? { osUptimeSeconds: tryCall(() => Deno.osUptime()) }
      : {}),
  });

  const functionsHost = objectIfNotEmpty({
    ...(envGet("FUNCTIONS_EXTENSION_VERSION")
      ? { extensionVersion: envGet("FUNCTIONS_EXTENSION_VERSION") }
      : {}),
    ...(envGet("FUNCTIONS_WORKER_RUNTIME")
      ? { workerRuntime: envGet("FUNCTIONS_WORKER_RUNTIME") }
      : {}),
    ...(envGet("AZURE_FUNCTIONS_ENVIRONMENT") ||
        envGet("ASPNETCORE_ENVIRONMENT")
      ? {
        environmentName: envGet("AZURE_FUNCTIONS_ENVIRONMENT") ??
          envGet("ASPNETCORE_ENVIRONMENT"),
      }
      : {}),
    ...(parseIntEnv("FUNCTIONS_CUSTOMHANDLER_PORT")
      ? { customHandlerPort: parseIntEnv("FUNCTIONS_CUSTOMHANDLER_PORT") }
      : {}),
  });

  const functions = includeFunctionsList
    ? compileFunctionsDiagnostics(ctx)
    : undefined;

  const diagnostics: AzureFunctionsDiagnostics = {
    collectedAt,
    generationMs: Date.now() - genStartMs,
    runtime: {
      deno: {
        version: Deno.version.deno,
        v8: Deno.version.v8,
        typescript: Deno.version.typescript,
      },
      build: {
        os: Deno.build.os,
        arch: Deno.build.arch,
        target: Deno.build.target,
      },
    },
    azure: {
      functionsHost: functionsHost ?? {},
      ...(app ? { app: { ...app, ...(functions ? { functions } : {}) } } : {}),
      ...(instance ? { instance } : {}),
    },
  };

  // If async options are provided, try to fetch host status from Admin API.
  // Also auto-detect Azure environment and try to use AZURE_FUNCTIONS_MASTER_KEY env var.
  const isAzureHosted = !!envGet("WEBSITE_SITE_NAME");
  const masterKeyFromEnv = envGet("AZURE_FUNCTIONS_MASTER_KEY");
  const hasMasterKey = opts.functionsMasterKey ||
    (isAzureHosted && masterKeyFromEnv);

  if (hasMasterKey || opts.functionsHostBaseUrl) {
    const timeoutMs = opts.timeoutMs ?? 1500;

    const derivedBaseUrl = (() => {
      if (!req) return undefined;
      const u = tryCall(() => new URL(req.Url));
      if (!u) return undefined;
      return `${u.protocol}//${u.host}`;
    })();

    const hostBase = opts.functionsHostBaseUrl ?? derivedBaseUrl;
    if (hostBase) {
      // Use explicitly provided key, or fall back to env var if in Azure
      const effectiveMasterKey = opts.functionsMasterKey ??
        (isAzureHosted ? masterKeyFromEnv : undefined);

      const status = await fetchFunctionsHostStatus(hostBase, {
        functionsMasterKey: effectiveMasterKey,
        timeoutMs,
      });

      if (status) {
        return {
          ...diagnostics,
          azure: { ...diagnostics.azure, functionsHostStatus: status },
        };
      }
    }
  }

  return diagnostics;
}

import type { Context } from "../define.ts";
import type { AzureHttpRequestData } from "../invoke.ts";
import type { FunctionDefinition } from "../define.ts";

const MB = 1024 * 1024;
const toMB = (n: number) => `${(n / MB).toFixed(2)} MB`;

function tryCall<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

const REDACT_ENV_KEY_RE = /(SECRET|KEY|TOKEN|PASSWORD)/i;

function safeEnvObject(): Record<string, string> | null {
  const env = tryCall(() => Deno.env.toObject());
  if (!env) return null;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (!REDACT_ENV_KEY_RE.test(k)) out[k] = v;
  }
  return out;
}

/**
 * Compiles system diagnostics data.
 */
export function compileDiagnostics(
  request: AzureHttpRequestData,
  ctx: Context,
): object {
  const genStartMs = Date.now();
  const nowIso = new Date().toISOString();

  const memUsage = Deno.memoryUsage();
  const sysMem = tryCall(() => Deno.systemMemoryInfo());
  const netIfaces = tryCall(() => Deno.networkInterfaces()) ?? [];

  const functions = ctx.app.list();

  return {
    metadata: {
      timestamp: nowIso,
      generatedAt: nowIso,
      azfuncDeno: true,
      url: request.Url,
    },
    runtime: {
      deno: {
        version: Deno.version.deno,
        v8: Deno.version.v8,
        typescript: Deno.version.typescript,
      },
      os: Deno.build.os,
      arch: Deno.build.arch,
      target: Deno.build.target,
      vendor: Deno.build.vendor,
    },
    process: {
      pid: Deno.pid,
      uid: tryCall(() => Deno.uid()),
      gid: tryCall(() => Deno.gid()),
      executablePath: Deno.execPath(),
      mainModule: Deno.mainModule,
      args: Deno.args,
    },
    uptime: {
      systemUptime: Deno.osUptime(),
      startTime: new Date(Date.now() - Deno.osUptime() * 1000).toISOString(),
    },
    memory: {
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      rss: memUsage.rss,
      formatted: {
        heapTotal: toMB(memUsage.heapTotal),
        heapUsed: toMB(memUsage.heapUsed),
        external: toMB(memUsage.external),
        rss: toMB(memUsage.rss),
      },
    },
    systemMemory: sysMem
      ? {
        free: sysMem.free,
        available: sysMem.available,
        total: sysMem.total,
        usedPercent: ((1 - sysMem.free / sysMem.total) * 100).toFixed(2),
        freeFormatted: toMB(sysMem.free),
        availableFormatted: toMB(sysMem.available),
        totalFormatted: toMB(sysMem.total),
      }
      : null,
    cpu: {
      cores: navigator.hardwareConcurrency ?? "unknown",
    },
    network: {
      interfaces: netIfaces,
      addrCount: netIfaces.length,
    },
    env: safeEnvObject(),
    function: {
      name: ctx.functionName,
    },
    request: {
      url: request.Url,
      method: request.Method,
      headers: request.Headers,
      query: request.Query,
      params: request.Params,
    },
    azureFunctions: {
      version: tryCall(() => Deno.env.get("FUNCTIONS_EXTENSION_VERSION")) ??
        "unknown",
      appName: tryCall(() => Deno.env.get("WEBSITE_SITE_NAME")) ?? "unknown",
      subscriptionId: tryCall(() => Deno.env.get("WEBSITE_SubscriptionId")) ??
        "unknown",
      runtime: tryCall(() => Deno.env.get("FUNCTIONS_WORKER_RUNTIME")) ??
        "deno",
      platform: {
        platformVersion:
          tryCall(() => Deno.env.get("WEBSITE_PLATFORM_VERSION")) ?? null,
        sku: tryCall(() => Deno.env.get("WEBSITE_SKU")) ?? null,
        bitness: tryCall(() => Deno.env.get("SITE_BITNESS")) ?? null,
        computeMode: tryCall(() => Deno.env.get("WEBSITE_COMPUTE_MODE")) ??
          null,
        volumeType: tryCall(() => Deno.env.get("WEBSITE_VOLUME_TYPE")) ?? null,
      },
      instance: {
        instanceId: tryCall(() => Deno.env.get("WEBSITE_INSTANCE_ID")) ??
          "unknown",
        roleInstanceId:
          tryCall(() => Deno.env.get("WEBSITE_ROLE_INSTANCE_ID")) ?? null,
        workerId: tryCall(() => Deno.env.get("WEBSITES_ROLE_WORKER_ID")) ??
          "unknown",
        containerName: tryCall(() => Deno.env.get("CONTAINER_NAME")) ?? null,
        hostname: tryCall(() => Deno.env.get("WEBSITE_HOSTNAME")) ?? "unknown",
        privateIp: tryCall(() => Deno.env.get("WEBSITE_PRIVATE_IP")) ?? null,
      },
      region: {
        name: tryCall(() => Deno.env.get("REGION_NAME")) ??
          tryCall(() => Deno.env.get("WEBSITE_REGION")) ?? "unknown",
      },
      resource: {
        resourceGroup: tryCall(() => Deno.env.get("WEBSITE_RESOURCE_GROUP")) ??
          null,
        slotName: tryCall(() => Deno.env.get("WEBSITE_SLOT_NAME")) ?? null,
        deploymentId: tryCall(() => Deno.env.get("WEBSITE_DEPLOYMENT_ID")) ??
          null,
      },
      environment: {
        environment:
          tryCall(() => Deno.env.get("AZURE_FUNCTIONS_ENVIRONMENT")) ??
            "unknown",
        requestId: tryCall(() => Deno.env.get("FUNCTIONS_REQUEST_ID")) ?? null,
        dnsServer: tryCall(() => Deno.env.get("WEBSITE_DNS_SERVER")) ?? null,
      },
      storage: {
        contentShare: tryCall(() => Deno.env.get("WEBSITE_CONTENTSHARE")) ??
          null,
        runFromPackage:
          tryCall(() => Deno.env.get("WEBSITE_RUN_FROM_PACKAGE")) ?? null,
        webJobsStorageConfigured: !!tryCall(() =>
          Deno.env.get("AzureWebJobsStorage")
        ),
        webJobsStorage: tryCall(() => Deno.env.get("AzureWebJobsStorage"))
          ? "[REDACTED]"
          : "not configured",
        featureFlags: tryCall(() => Deno.env.get("AzureWebJobsFeatureFlags")) ??
          "none",
      },
      scaling: {
        workerProcessCount:
          tryCall(() => Deno.env.get("FUNCTIONS_WORKER_PROCESS_COUNT")) ?? null,
        maxScaleOut:
          tryCall(() =>
            Deno.env.get("WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT")
          ) ?? null,
        coldStartEnabled:
          tryCall(() => Deno.env.get("WEBSITE_USE_PLACEHOLDER")) ?? null,
      },
      managedIdentity: {
        endpoint: tryCall(() => Deno.env.get("IDENTITY_ENDPOINT")) ?? null,
        headerConfigured: !!tryCall(() => Deno.env.get("IDENTITY_HEADER")),
      },
      healthCheck: {
        warmupPath: tryCall(() => Deno.env.get("WEBSITE_WARMUP_PATH")) ?? null,
        maxPingFailures:
          tryCall(() => Deno.env.get("WEBSITE_HEALTHCHECK_MAXPINGFAILURES")) ??
            null,
        maxUnhealthyPercent:
          tryCall(() =>
            Deno.env.get("WEBSITE_HEALTHCHECK_MAXUNHEALTHYWORKERPERCENT")
          ) ?? null,
      },
    },
    customHandler: {
      port: tryCall(() => Deno.env.get("FUNCTIONS_CUSTOMHANDLER_PORT")) ??
        "8080",
      pid: Deno.pid,
      uptime: Deno.osUptime(),
    },
    configuration: {
      version: "2.0",
      extensionBundleVersion: "[4.0.0, 5.0.0)",
    },
    invocation: {
      invocationId: request.Headers?.["x-azure-functions-invocation-id"]?.[0] ??
        request.Headers?.["invocationid"]?.[0] ?? null,
      executionContextId:
        request.Headers?.["x-azure-functions-execution-context-id"]?.[0] ??
          request.Headers?.["executioncontextid"]?.[0] ?? null,
    },
    bindings: {
      input: null,
      output: null,
    },
    health: {
      status: "healthy",
      checks: {
        memory: memUsage.rss < 1024 * 1024 * 1024,
        runtime: typeof Deno.version.deno === "string",
        storageConfigured: !!tryCall(() => Deno.env.get("AzureWebJobsStorage")),
      },
    },
    functions: {
      totalCount: functions.length,
      names: functions.map((fn: FunctionDefinition) => fn.name),
    },
    diagnosticsGenerationMs: Date.now() - genStartMs,
  };
}

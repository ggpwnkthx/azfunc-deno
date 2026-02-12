import {
  AzureFunctionsApp,
  bindings,
  defineHttpFunction,
  type HttpContext,
} from "@azure/functions";

const app = new AzureFunctionsApp();
app.register(
  defineHttpFunction({
    dir: "api",
    functionJson: {
      bindings: [
        bindings.httpTrigger({
          name: "req",
          route: "{*route}",
          authLevel: "anonymous",
        }),
        bindings.httpOut({ name: "res" }),
      ],
    },
    handler(request: Request, ctx: HttpContext): Response {
      const routeRaw = ctx.params.route ?? "";
      const route = "/" + routeRaw.replace(/^\/+/, "");

      // Diagnostic endpoint
      if (route === "/diagnostics" || routeRaw === "diagnostics") {
        const startTime = Date.now();

        const memUsage = Deno.memoryUsage();
        const sysMem = Deno.systemMemoryInfo();

        const functions = app.list();

        const diagnostics = {
          metadata: {
            timestamp: new Date().toISOString(),
            generatedAt: new Date().toISOString(),
            azfuncDeno: true,
            url: request.url,
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
            uid: Deno.uid(),
            gid: Deno.gid(),
            executablePath: Deno.execPath(),
            mainModule: Deno.mainModule,
            args: Deno.args,
          },
          uptime: {
            systemUptime: Deno.osUptime(),
            startTime: new Date(Date.now() - Deno.osUptime() * 1000)
              .toISOString(),
          },
          memory: {
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            rss: memUsage.rss,
            formatted: {
              heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
              heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
              external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
              rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
            },
          },
          systemMemory: sysMem
            ? {
              free: sysMem.free,
              available: sysMem.available,
              total: sysMem.total,
              usedPercent: ((1 - sysMem.free / sysMem.total) * 100).toFixed(
                2,
              ),
              freeFormatted: `${(sysMem.free / 1024 / 1024).toFixed(2)} MB`,
              availableFormatted: `${
                (sysMem.available / 1024 / 1024).toFixed(2)
              } MB`,
              totalFormatted: `${(sysMem.total / 1024 / 1024).toFixed(2)} MB`,
            }
            : null,
          cpu: {
            cores: navigator.hardwareConcurrency ?? "unknown",
          },
          network: {
            interfaces: Deno.networkInterfaces(),
            addrCount: Deno.networkInterfaces().length,
          },
          env: Object.fromEntries(
            Object.entries(Deno.env.toObject()).filter(([k]) =>
              !k.includes("SECRET") && !k.includes("KEY") &&
              !k.includes("PASSWORD")
            ),
          ),
          function: {
            name: ctx.functionDir,
            routePrefix: ctx.routePrefix,
            rawPathname: ctx.rawPathname,
            params: ctx.params,
          },
          request: {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            contentLength: request.headers.get("content-length"),
            contentType: request.headers.get("content-type"),
            referrer: request.referrer,
            credentials: request.credentials,
            mode: request.mode,
          },
          azureFunctions: {
            version: Deno.env.get("FUNCTIONS_EXTENSION_VERSION") ?? "unknown",
            appName: Deno.env.get("WEBSITE_SITE_NAME") ?? "unknown",
            subscriptionId: Deno.env.get("WEBSITE_SubscriptionId") ??
              "unknown",
            runtime: Deno.env.get("FUNCTIONS_WORKER_RUNTIME") ?? "deno",
            platform: {
              platformVersion: Deno.env.get("WEBSITE_PLATFORM_VERSION") ??
                null,
              sku: Deno.env.get("WEBSITE_SKU") ?? null,
              bitness: Deno.env.get("SITE_BITNESS") ?? null,
              computeMode: Deno.env.get("WEBSITE_COMPUTE_MODE") ?? null,
              volumeType: Deno.env.get("WEBSITE_VOLUME_TYPE") ?? null,
            },
            instance: {
              instanceId: Deno.env.get("WEBSITE_INSTANCE_ID") ?? "unknown",
              roleInstanceId: Deno.env.get("WEBSITE_ROLE_INSTANCE_ID") ?? null,
              workerId: Deno.env.get("WEBSITES_ROLE_WORKER_ID") ?? "unknown",
              containerName: Deno.env.get("CONTAINER_NAME") ?? null,
              hostname: Deno.env.get("WEBSITE_HOSTNAME") ?? "unknown",
              privateIp: Deno.env.get("WEBSITE_PRIVATE_IP") ?? null,
            },
            region: {
              name: Deno.env.get("REGION_NAME") ??
                Deno.env.get("WEBSITE_REGION") ?? "unknown",
            },
            resource: {
              resourceGroup: Deno.env.get("WEBSITE_RESOURCE_GROUP") ?? null,
              slotName: Deno.env.get("WEBSITE_SLOT_NAME") ?? null,
              deploymentId: Deno.env.get("WEBSITE_DEPLOYMENT_ID") ?? null,
            },
            environment: {
              environment: Deno.env.get("AZURE_FUNCTIONS_ENVIRONMENT") ??
                "unknown",
              requestId: Deno.env.get("FUNCTIONS_REQUEST_ID") ?? null,
              dnsServer: Deno.env.get("WEBSITE_DNS_SERVER") ?? null,
            },
            storage: {
              contentShare: Deno.env.get("WEBSITE_CONTENTSHARE") ?? null,
              runFromPackage: Deno.env.get("WEBSITE_RUN_FROM_PACKAGE") ?? null,
              webJobsStorageConfigured: !!Deno.env.get("AzureWebJobsStorage"),
              webJobsStorage: Deno.env.get("AzureWebJobsStorage")
                ? "[REDACTED]"
                : "not configured",
              featureFlags: Deno.env.get("AzureWebJobsFeatureFlags") ?? "none",
            },
            scaling: {
              workerProcessCount:
                Deno.env.get("FUNCTIONS_WORKER_PROCESS_COUNT") ??
                  null,
              maxScaleOut: Deno.env.get(
                "WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT",
              ) ?? null,
              coldStartEnabled: Deno.env.get("WEBSITE_USE_PLACEHOLDER") ?? null,
            },
            managedIdentity: {
              endpoint: Deno.env.get("IDENTITY_ENDPOINT") ?? null,
              headerConfigured: !!Deno.env.get("IDENTITY_HEADER"),
            },
            healthCheck: {
              warmupPath: Deno.env.get("WEBSITE_WARMUP_PATH") ?? null,
              maxPingFailures: Deno.env.get(
                "WEBSITE_HEALTHCHECK_MAXPINGFAILURES",
              ) ?? null,
              maxUnhealthyPercent: Deno.env.get(
                "WEBSITE_HEALTHCHECK_MAXUNHEALTHYWORKERPERCENT",
              ) ?? null,
            },
          },
          customHandler: {
            port: Deno.env.get("FUNCTIONS_CUSTOMHANDLER_PORT") ?? "8080",
            pid: Deno.pid,
            uptime: Deno.osUptime(),
          },
          configuration: {
            version: "2.0",
            extensionBundleVersion: "[4.0.0, 5.0.0)",
          },
          invocation: {
            invocationId:
              request.headers.get("x-azure-functions-invocation-id") ??
                request.headers.get("invocationid") ?? null,
            executionContextId:
              request.headers.get("x-azure-functions-execution-context-id") ??
                request.headers.get("executioncontextid") ?? null,
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
              storageConfigured: !!Deno.env.get("AzureWebJobsStorage"),
            },
          },
          functions: {
            totalCount: functions.length,
            names: functions.map((fn) => fn.dir),
          },
          diagnosticsGenerationMs: Date.now() - startTime,
        };

        return Response.json(diagnostics, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      }

      const body = route === "/json" ? { hello: "world" } : {
        deno: { version: Deno.version.deno },
        request: { url: request.url, method: request.method },
        matched: {
          function: ctx.functionDir,
          routePrefix: ctx.routePrefix,
          rawPathname: ctx.rawPathname,
          params: ctx.params,
        },
      };

      return Response.json(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    },
  }),
);

export default app;

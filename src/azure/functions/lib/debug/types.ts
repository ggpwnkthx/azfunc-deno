export type WebsiteOwnerNameParsed = {
  subscriptionId?: string;
  /**
   * The raw segment after "<subscriptionId>+" (if present).
   * Docs say this contains subscriptionId + resourceGroup + webspace, but the exact format
   * can vary by plan/runtime. Kept as an opaque string for safety.
   */
  ownerSegment?: string;
  /**
   * Best-effort parse when ownerSegment ends with "...webspace".
   * This is heuristic and may be absent or imperfect.
   */
  inferred?: {
    resourceGroupCandidate?: string;
    regionCandidate?: string;
  };
};

/** What we return to callers (intentionally compact). */
export type AzureFunctionsDiagnostics = {
  collectedAt: string;
  generationMs: number;

  runtime: {
    deno: { version: string; v8: string; typescript: string };
    build: { os: string; arch: string; target: string };
  };

  azure: {
    functionsHost: {
      extensionVersion?: string;
      workerRuntime?: string;
      environmentName?: string;
      customHandlerPort?: number;
    };

    http?: {
      routePrefix: string;
      sources?: { env?: string; hostJson?: string; default?: "api" };
    };

    app?: {
      name?: string;
      hostname?: string;
      slotName?: string;
      region?: string;

      subscriptionId?: string;
      resourceGroup?: string;

      ownerName?: string;
      ownerNameParsed?: WebsiteOwnerNameParsed;

      platform?: {
        sku?: string;
        computeMode?: string;
        platformVersion?: string;
        bitness?: string;
        volumeType?: string;
      };

      deployment?: {
        deploymentId?: string;
        runFromPackage?: string;
        contentShare?: string;
      };
    };

    instance?: {
      websiteInstanceId?: string;
      websiteRoleInstanceId?: string;
      roleWorkerId?: string;

      containerName?: string;
      hostName?: string;

      privateIp?: string;

      pid: number;
      osUptimeSeconds?: number;
    };
  };

  request?: {
    url: string;
    method: string;
    path: string;
    host?: string;
    userAgent?: string;
    forwardedFor?: string;
    traceparent?: string;
  };

  functions?: {
    totalCount: number;
    list: Array<{
      name: string;
      triggerType?: string;
      triggerName?: string;
      bindingCount: number;
    }>;
    summary: { triggerTypes: Record<string, number> };
  };
};

export type FunctionsHostStatus = {
  id: string;
  state: string;
  version: string;
  versionDetails?: string;
};

export type CompileDiagnosticsOptions = {
  /**
   * If true, include the function registry list/summary.
   * Default: true
   */
  includeFunctionsList?: boolean;

  /**
   * Override host.json path if your cwd isn't the Functions root.
   */
  hostJsonPath?: string;

  /**
   * If provided, we'll attempt to call GET /admin/host/status using this key
   * (sent as x-functions-key). Without it, Azure-hosted calls will usually be 401.
   */
  functionsMasterKey?: string;

  /**
   * Override base URL for the Functions Host (e.g. "http://127.0.0.1:7071" locally).
   * If omitted, we try to derive it from the HTTP trigger Url.
   */
  functionsHostBaseUrl?: string;

  /** Default: 1500ms */
  timeoutMs?: number;
};

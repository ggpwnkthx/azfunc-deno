import { bindings } from "../src/azure/bindings.ts";
import { defineTriggerFunction } from "../src/azure/define.ts";
import { tryParseJson } from "../src/azure/lib/json.ts";

export const queueTrigger = defineTriggerFunction({
  dir: "queue_trigger",
  functionJson: {
    bindings: [
      bindings.queueTrigger({
        name: "item",
        queueName: "test-in",
        connection: "AzureWebJobsStorage",
      }),
      bindings.queueOut({
        name: "$return",
        queueName: "test-out",
        connection: "AzureWebJobsStorage",
      }),
    ],
  },
  handler(payload) {
    const p = payload as { Data?: Record<string, unknown> };

    let queueItem: unknown = p.Data?.item ??
      (p.Data ? Object.values(p.Data)[0] : undefined);

    // Normalize input: Azure Functions may JSON-encode queue items
    if (typeof queueItem === "string") {
      const trimmed = queueItem.trim();
      const looksJson =
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"));

      if (looksJson) {
        const parsed = tryParseJson(queueItem);
        if (parsed !== undefined) queueItem = parsed;
      }
    }

    const outputValue = typeof queueItem === "string"
      ? queueItem.toUpperCase()
      : queueItem;

    return Response.json({
      Outputs: {
        $return: outputValue,
      },
    });
  },
});

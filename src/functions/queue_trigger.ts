import {
  bind,
  defineTriggerFunction,
  type InvokeRequest,
  type InvokeResponse,
  type JsonValue,
  tryParseJson,
} from "@azure/functions";

type QueueTriggerData = {
  item: JsonValue;
};

type QueueTriggerResponse = InvokeResponse<Record<string, never>, string>;

function toQueueMessage(value: JsonValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default defineTriggerFunction<
  InvokeRequest<QueueTriggerData>,
  QueueTriggerResponse
>({
  name: "queue_trigger",
  bindings: [
    bind.storage.queue.trigger({
      name: "item",
      queueName: "test-in",
      connection: "AzureWebJobsStorage",
    }),
    bind.storage.queue.output({
      name: "$return",
      queueName: "test-out",
      connection: "AzureWebJobsStorage",
    }),
  ],
  handler(payload: InvokeRequest<QueueTriggerData>): QueueTriggerResponse {
    let queueItem = payload.Data.item;

    // Normalize input: Azure Functions may JSON-encode queue items as strings
    if (typeof queueItem === "string") {
      const trimmed = queueItem.trim();
      const looksJson = (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"));

      if (looksJson) {
        const parsed = tryParseJson(queueItem);
        if (parsed !== undefined) queueItem = parsed as JsonValue;
      }
    }

    const outputValue = queueItem;

    // If output binding name is "$return", the custom handler must set ReturnValue.
    return {
      ReturnValue: toQueueMessage(outputValue),
    };
  },
});

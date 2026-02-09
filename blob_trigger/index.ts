import { bindings, defineTriggerFunction } from "@azure/functions";

export const blobTrigger = defineTriggerFunction({
  dir: "blob_trigger",
  functionJson: {
    bindings: [
      bindings.blobTrigger({
        name: "myBlob",
        path: "blobs/{name}",
        connection: "AzureWebJobsStorage",
      }),
      bindings.blobOut({
        name: "outputBlob",
        path: "blobs-out/{name}",
        connection: "AzureWebJobsStorage",
      }),
    ],
  },
  handler(payload: unknown) {
    const p = payload as {
      Data?: { myBlob?: unknown };
      Metadata?: { blobTrigger?: string };
    };

    const blobContent = p.Data?.myBlob;
    const blobName = p.Metadata?.blobTrigger?.split("/").pop() ?? "unknown";

    return new Response(
      JSON.stringify({
        Outputs: {
          outputBlob: blobContent,
        },
        Logs: [`Processed blob: ${blobName}`],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },
});

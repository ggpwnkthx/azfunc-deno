import { bind, defineFunction } from "@azure/functions";

export default defineFunction({
  name: "blob_trigger",
  bindings: [
    bind.storage.blob.trigger({
      name: "myBlob",
      path: "blobs/{name}",
      connection: "AzureWebJobsStorage",
    }),
    bind.storage.blob.output({
      name: "outputBlob",
      path: "blobs-out/{name}",
      connection: "AzureWebJobsStorage",
    }),
  ],
  handler(payload) {
    const blobContent = payload.Data.myBlob;

    const blobName =
      (payload.Metadata.blobTrigger as string | undefined)?.split("/").pop()
        ?.trim() ||
      "unknown";

    return {
      Outputs: {
        outputBlob: blobContent,
      },
      Logs: [`Processed blob: ${blobName}`],
    };
  },
});

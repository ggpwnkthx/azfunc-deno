import {
  bind,
  defineTriggerFunction,
  type InvokeRequest,
  type InvokeResponse,
  type JsonValue,
} from "@azure/functions";

type BlobTriggerData = {
  myBlob: JsonValue;
};

type BlobTriggerMetadata = {
  blobTrigger?: string;
};

type BlobTriggerResponse = InvokeResponse<{
  outputBlob: JsonValue;
}>;

export default defineTriggerFunction<
  InvokeRequest<BlobTriggerData, BlobTriggerMetadata>,
  BlobTriggerResponse
>({
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
  handler(
    payload: InvokeRequest<BlobTriggerData, BlobTriggerMetadata>,
  ): BlobTriggerResponse {
    const blobContent = payload.Data.myBlob;

    const blobName = payload.Metadata.blobTrigger?.split("/").pop()?.trim() ||
      "unknown";

    return {
      Outputs: {
        outputBlob: blobContent,
      },
      Logs: [`Processed blob: ${blobName}`],
    };
  },
});

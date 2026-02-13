import {
  bindings,
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
  config: {
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

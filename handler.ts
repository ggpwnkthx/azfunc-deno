import { AzureFunctionsApp } from "@azure/functions";

import api from "./src/functions/api.ts";
import blobTrigger from "./src/functions/blob_trigger.ts";
import queueTrigger from "./src/functions/queue_trigger.ts";

const app = new AzureFunctionsApp();
app.register(api);
app.register(blobTrigger);
app.register(queueTrigger);

if (import.meta.main) {
  await app.serve();
}

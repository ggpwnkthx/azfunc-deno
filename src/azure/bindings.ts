export type Direction = "in" | "out";

export type AuthLevel = "anonymous" | "function" | "admin";

export type Binding =
  | HttpTriggerBinding
  | HttpOutputBinding
  | BlobTriggerBinding
  | BlobOutputBinding
  | QueueTriggerBinding
  | QueueOutputBinding;

export interface FunctionJson {
  bindings: Binding[];
}

export interface HttpTriggerBinding {
  authLevel: AuthLevel;
  type: "httpTrigger";
  direction: "in";
  name: string;
  route: string;
  methods?: readonly string[];
}

export interface HttpOutputBinding {
  type: "http";
  direction: "out";
  name: string;
}

export interface BlobTriggerBinding {
  name: string;
  type: "blobTrigger";
  direction: "in";
  path: string;
  connection: string;
}

export interface BlobOutputBinding {
  name: string;
  type: "blob";
  direction: "out";
  path: string;
  connection: string;
}

export interface QueueTriggerBinding {
  name: string;
  type: "queueTrigger";
  direction: "in";
  queueName: string;
  connection: string;
}

export interface QueueOutputBinding {
  name: string; // can be "$return"
  type: "queue";
  direction: "out";
  queueName: string;
  connection: string;
}

// Small helpers to build bindings without repeating literal objects.
export const bindings = {
  httpTrigger(args: {
    name: string;
    route: string;
    authLevel?: AuthLevel;
    methods?: readonly string[];
  }): HttpTriggerBinding {
    return {
      authLevel: args.authLevel ?? "anonymous",
      type: "httpTrigger",
      direction: "in",
      name: args.name,
      route: args.route,
      ...(args.methods ? { methods: args.methods } : {}),
    };
  },

  httpOut(args: { name: string }): HttpOutputBinding {
    return { type: "http", direction: "out", name: args.name };
  },

  blobTrigger(args: {
    name: string;
    path: string;
    connection: string;
  }): BlobTriggerBinding {
    return {
      name: args.name,
      type: "blobTrigger",
      direction: "in",
      path: args.path,
      connection: args.connection,
    };
  },

  blobOut(args: {
    name: string;
    path: string;
    connection: string;
  }): BlobOutputBinding {
    return {
      name: args.name,
      type: "blob",
      direction: "out",
      path: args.path,
      connection: args.connection,
    };
  },

  queueTrigger(args: {
    name: string;
    queueName: string;
    connection: string;
  }): QueueTriggerBinding {
    return {
      name: args.name,
      type: "queueTrigger",
      direction: "in",
      queueName: args.queueName,
      connection: args.connection,
    };
  },

  queueOut(args: {
    name: string; // "$return" allowed
    queueName: string;
    connection: string;
  }): QueueOutputBinding {
    return {
      name: args.name,
      type: "queue",
      direction: "out",
      queueName: args.queueName,
      connection: args.connection,
    };
  },
} as const;

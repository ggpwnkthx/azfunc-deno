import type { BindingFromApi, InBinding, OutBinding } from "./types.ts";
import { defineInBinding, defineOutBinding } from "./types.ts";

/* ------------------------------ Base types ------------------------------ */

type CommandType = "text" | "storedProcedure";

/* ------------------------- Mobile / DocumentDB -------------------------- */

export type MobileTableInputBinding = InBinding<"mobileTable", {
  tableName: string;
  connection: string;
  apiKey: string;
  id?: string;
}>;

export type MobileTableOutputBinding = OutBinding<"mobileTable", {
  tableName: string;
  connection: string;
  apiKey: string;
}>;

export type DocumentDBInputBinding = InBinding<"documentDB", {
  connection: string;
  databaseName: string;
  collectionName: string;
  id?: string;
  sqlQuery?: string;
}>;

export type DocumentDBOutputBinding = OutBinding<"documentDB", {
  connection: string;
  databaseName: string;
  collectionName: string;
  createIfNotExists?: boolean;
}>;

/* ---------------------------- SQL / Kusto / MySQL ----------------------- */

type SqlLikeTriggerBinding<TType extends "sqlTrigger" | "mysqlTrigger"> =
  InBinding<TType, { tableName: string; connectionStringSetting: string }>;

type SqlLikeInputBinding<TType extends "sql" | "mysql"> = InBinding<
  TType,
  {
    connectionStringSetting: string;
    commandText: string;
    commandType?: CommandType;
    parameters?: string;
  }
>;

type SqlLikeOutputBinding<TType extends "sql" | "mysql"> = OutBinding<
  TType,
  { connectionStringSetting: string; commandText: string }
>;

export type SqlTriggerBinding = SqlLikeTriggerBinding<"sqlTrigger">;
export type SqlInputBinding = SqlLikeInputBinding<"sql">;
export type SqlOutputBinding = SqlLikeOutputBinding<"sql">;

export type MySqlTriggerBinding = SqlLikeTriggerBinding<"mysqlTrigger">;
export type MySqlInputBinding = SqlLikeInputBinding<"mysql">;
export type MySqlOutputBinding = SqlLikeOutputBinding<"mysql">;

export type KustoInputBinding = InBinding<"kusto", {
  connection: string;
  database: string;
  managedServiceIdentity?: string;
  kqlCommand: string;
  kqlParameters?: string;
}>;

export type KustoOutputBinding = OutBinding<"kusto", {
  connection: string;
  database: string;
  managedServiceIdentity?: string;
  tableName: string;
  mappingRef?: string;
  dataFormat?: string;
}>;

/* ------------------------------- Grouped API ---------------------------- */

const mobileTableIn = defineInBinding<MobileTableInputBinding>("mobileTable");
const mobileTableOut = defineOutBinding<MobileTableOutputBinding>(
  "mobileTable",
);

const documentDbIn = defineInBinding<DocumentDBInputBinding>("documentDB");
const documentDbOut = defineOutBinding<DocumentDBOutputBinding>("documentDB");

const sqlTrigger = defineInBinding<SqlTriggerBinding>("sqlTrigger");
const sqlIn = defineInBinding<SqlInputBinding>("sql");
const sqlOut = defineOutBinding<SqlOutputBinding>("sql");

const kustoIn = defineInBinding<KustoInputBinding>("kusto");
const kustoOut = defineOutBinding<KustoOutputBinding>("kusto");

const mysqlTrigger = defineInBinding<MySqlTriggerBinding>("mysqlTrigger");
const mysqlIn = defineInBinding<MySqlInputBinding>("mysql");
const mysqlOut = defineOutBinding<MySqlOutputBinding>("mysql");

export const database = {
  mobileTable: {
    input: mobileTableIn.build,
    output: mobileTableOut.build,
  },

  documentDB: {
    input: documentDbIn.build,
    output: documentDbOut.build,
  },

  sql: {
    trigger: sqlTrigger.build,
    input: sqlIn.build,
    output: sqlOut.build,
  },

  kusto: {
    input: kustoIn.build,
    output: kustoOut.build,
  },

  mysql: {
    trigger: mysqlTrigger.build,
    input: mysqlIn.build,
    output: mysqlOut.build,
  },
} as const;

export type DatabaseBinding = BindingFromApi<typeof database>;

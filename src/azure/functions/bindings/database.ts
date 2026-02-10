import type { BindingBase } from "./types.ts";

/* ------------------------- Mobile / DocumentDB --------------------------- */

export interface MobileTableInputBinding extends BindingBase {
  type: "mobileTable";
  direction: "in";
  tableName: string;
  connection: string;
  apiKey: string;
  id?: string;
}

export interface MobileTableOutputBinding extends BindingBase {
  type: "mobileTable";
  direction: "out";
  tableName: string;
  connection: string;
  apiKey: string;
}

export interface DocumentDBInputBinding extends BindingBase {
  type: "documentDB";
  direction: "in";
  connection: string;
  databaseName: string;
  collectionName: string;
  id?: string;
  sqlQuery?: string;
}

export interface DocumentDBOutputBinding extends BindingBase {
  type: "documentDB";
  direction: "out";
  connection: string;
  databaseName: string;
  collectionName: string;
  createIfNotExists?: boolean;
}

/* ---------------------------- SQL / Kusto / MySQL ------------------------ */

export interface SqlTriggerBinding extends BindingBase {
  type: "sqlTrigger";
  direction: "in";
  tableName: string;
  connectionStringSetting: string;
}

export interface SqlInputBinding extends BindingBase {
  type: "sql";
  direction: "in";
  connectionStringSetting: string;
  commandText: string;
  commandType?: "text" | "storedProcedure";
  parameters?: string;
}

export interface SqlOutputBinding extends BindingBase {
  type: "sql";
  direction: "out";
  connectionStringSetting: string;
  commandText: string; // upsert target (schema describes as table name)
}

export interface KustoInputBinding extends BindingBase {
  type: "kusto";
  direction: "in";
  connection: string;
  database: string;
  managedServiceIdentity?: string;
  kqlCommand: string;
  kqlParameters?: string;
}

export interface KustoOutputBinding extends BindingBase {
  type: "kusto";
  direction: "out";
  connection: string;
  database: string;
  managedServiceIdentity?: string;
  tableName: string;
  mappingRef?: string;
  dataFormat?: string;
}

export interface MySqlTriggerBinding extends BindingBase {
  type: "mysqlTrigger";
  direction: "in";
  tableName: string;
  connectionStringSetting: string;
}

export interface MySqlInputBinding extends BindingBase {
  type: "mysql";
  direction: "in";
  connectionStringSetting: string;
  commandText: string;
  commandType?: "text" | "storedProcedure";
  parameters?: string;
}

export interface MySqlOutputBinding extends BindingBase {
  type: "mysql";
  direction: "out";
  connectionStringSetting: string;
  commandText: string; // upsert target (schema describes as table name)
}

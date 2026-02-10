import type { BindingBase } from "./types.ts";

/* ---------------------- Notification / Email bindings -------------------- */

export interface NotificationHubOutputBinding extends BindingBase {
  type: "notificationHub";
  direction: "out";
  tagExpression: string;
  hubName: string;
  connection: string;
  platform?: "apns" | "adm" | "gcm" | "wns" | "mpns";
}

export interface TwilioSmsOutputBinding extends BindingBase {
  type: "twilioSms";
  direction: "out";
  accountSid: string;
  authToken: string;
  to: string;
  from: string;
  body?: string;
}

export interface SendGridOutputBinding extends BindingBase {
  type: "sendGrid";
  direction: "out";
  apiKey: string;
  to: string;
  from: string;
  subject: string;
  text: string;
}

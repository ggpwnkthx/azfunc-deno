import type { BindingFromApi, OutBinding } from "./types.ts";
import { defineOutBinding } from "./types.ts";

export type NotificationHubOutputBinding = OutBinding<"notificationHub", {
  tagExpression: string;
  hubName: string;
  connection: string;
  platform?: "apns" | "adm" | "gcm" | "wns" | "mpns";
}>;

export type TwilioSmsOutputBinding = OutBinding<"twilioSms", {
  accountSid: string;
  authToken: string;
  to: string;
  from: string;
  body?: string;
}>;

export type SendGridOutputBinding = OutBinding<"sendGrid", {
  apiKey: string;
  to: string;
  from: string;
  subject: string;
  text: string;
}>;

const notificationHub = defineOutBinding<NotificationHubOutputBinding>(
  "notificationHub",
);
const twilioSms = defineOutBinding<TwilioSmsOutputBinding>("twilioSms");
const sendGrid = defineOutBinding<SendGridOutputBinding>("sendGrid");

export const isNotificationHubOutputBinding = notificationHub.is;
export const isTwilioSmsOutputBinding = twilioSms.is;
export const isSendGridOutputBinding = sendGrid.is;

export const notifications = {
  notificationHub: notificationHub.build,
  twilioSms: twilioSms.build,
  sendGrid: sendGrid.build,
} as const;

export type NotificationBinding = BindingFromApi<typeof notifications>;

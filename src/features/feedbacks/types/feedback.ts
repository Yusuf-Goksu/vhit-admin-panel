import { Timestamp } from "firebase/firestore";

export type FeedbackStatus = "open" | "reviewing" | "resolved" | "closed";
export type FeedbackPriority = "low" | "normal" | "high";

export type FeedbackType =
  | "bug"
  | "suggestion"
  | "performance"
  | "test"
  | "appointment"
  | "patient"
  | "account"
  | "other";

export type FeedbackItem = {
  id: string;
  ticketCode: string;

  userId: string;
  clinicId: string;
  userEmail: string;
  userFullName: string;

  type: FeedbackType;
  subject: string;
  message: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;

  allowContact: boolean;

  source: string;
  screenName: string;

  appVersion: string;
  buildNumber: string;
  platform: string;
  deviceManufacturer?: string | null;
  deviceModel?: string | null;
  osVersion?: string | null;

  attachmentUrl?: string | null;
  attachmentPath?: string | null;
  attachmentFileName?: string | null;
  attachmentContentType?: string | null;

  adminNote?: string | null;
  resolvedAt?: Timestamp | null;
  closedAt?: Timestamp | null;

  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;

  lastMessage?: string | null;
  lastMessageAt?: Timestamp | null;
  lastMessageSenderRole?: "user" | "admin" | "system" | null;

  unreadForUser: boolean;
  unreadForAdmin: boolean;
  messageCount: number;
};

export type FeedbackMessage = {
  id: string;

  senderId: string;
  senderName: string;
  senderRole: "user" | "admin" | "system";

  message: string;

  attachmentUrl?: string | null;
  attachmentPath?: string | null;
  attachmentFileName?: string | null;
  attachmentContentType?: string | null;

  createdAt?: Timestamp | null;
};
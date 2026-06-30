import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { adminFetch } from "@/lib/admin-api";
import { db } from "@/lib/firebase";
import { FeedbackItem, FeedbackMessage, FeedbackStatus } from "../types/feedback";

export async function getFeedbacks(): Promise<FeedbackItem[]> {
  const snapshot = await getDocs(
    query(collection(db, "feedbacks"), orderBy("lastMessageAt", "desc"))
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<FeedbackItem, "id">),
  }));
}

export async function getFeedbackById(id: string): Promise<FeedbackItem | null> {
  const snapshot = await getDoc(doc(db, "feedbacks", id));

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<FeedbackItem, "id">),
  };
}

export type FeedbackUserContact = {
  fullName: string;
  email: string;
  phone: string;
};

export async function getFeedbackUserContact(userId: string): Promise<FeedbackUserContact | null> {
  if (!userId) return null;

  const snapshot = await getDoc(doc(db, "users", userId));

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Record<string, unknown>;

  return {
    fullName: String(data.fullName ?? data.displayName ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? data.phoneNumber ?? ""),
  };
}

export function watchFeedbackMessages(
  feedbackId: string,
  callback: (messages: FeedbackMessage[]) => void
) {
  return onSnapshot(
    query(
      collection(db, "feedbacks", feedbackId, "messages"),
      orderBy("createdAt", "asc")
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<FeedbackMessage, "id">),
        }))
      );
    }
  );
}

export async function sendAdminMessage({
  feedbackId,
  adminName,
  message,
}: {
  feedbackId: string;
  adminId: string;
  adminName: string;
  message: string;
}) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Mesaj boş olamaz.");
  }

  await adminFetch("/api/admin/feedbacks/send-message", {
    body: {
      feedbackId,
      adminName,
      message: trimmedMessage,
    },
  });
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
) {
  await adminFetch("/api/admin/feedbacks/update-status", {
    body: {
      feedbackId,
      status,
    },
  });
}

export async function updateFeedbackAdminNote(
  feedbackId: string,
  adminNote: string
) {
  await adminFetch("/api/admin/feedbacks/update-note", {
    body: {
      feedbackId,
      adminNote,
    },
  });
}

export async function markFeedbackAsReadByAdmin(feedbackId: string) {
  await adminFetch("/api/admin/feedbacks/mark-read", {
    body: {
      feedbackId,
    },
  });
}

export async function deleteFeedbackMessage(feedbackId: string, messageId: string) {
  await adminFetch("/api/admin/feedbacks/delete-message", {
    body: { feedbackId, messageId },
  });
}

export async function deleteFeedback(feedbackId: string) {
  await adminFetch("/api/admin/feedbacks/delete", {
    body: { feedbackId },
  });
}

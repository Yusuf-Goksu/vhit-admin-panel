import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

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
  adminId,
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

  const feedbackRef = doc(db, "feedbacks", feedbackId);
  const messageRef = doc(collection(db, "feedbacks", feedbackId, "messages"));

  const batch = writeBatch(db);

  batch.set(messageRef, {
  senderId: adminId,
  senderName: "v-HIT Destek",
  senderRole: "admin",
  message: trimmedMessage,
  attachmentUrl: null,
  attachmentPath: null,
  attachmentFileName: null,
  attachmentContentType: null,
  createdAt: serverTimestamp(),
});

  batch.update(feedbackRef, {
    lastMessage: trimmedMessage,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderRole: "admin",
    unreadForUser: true,
    unreadForAdmin: false,
    messageCount: increment(1),
    status: "reviewing",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
) {
  const payload: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "resolved") {
    payload.resolvedAt = serverTimestamp();
    payload.closedAt = null;
  } else if (status === "closed") {
    payload.closedAt = serverTimestamp();
  } else {
    payload.resolvedAt = null;
    payload.closedAt = null;
  }

  await updateDoc(doc(db, "feedbacks", feedbackId), payload);
}

export async function updateFeedbackAdminNote(
  feedbackId: string,
  adminNote: string
) {
  await updateDoc(doc(db, "feedbacks", feedbackId), {
    adminNote: adminNote.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function markFeedbackAsReadByAdmin(feedbackId: string) {
  await updateDoc(doc(db, "feedbacks", feedbackId), {
    unreadForAdmin: false,
    updatedAt: serverTimestamp(),
  });
}
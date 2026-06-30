"use client";

import { useParams } from "next/navigation";

import FeedbackDetailPage from "@/features/feedbacks/components/FeedbackDetailPage";

export default function FeedbackDetailRoutePage() {
  const params = useParams<{ id: string }>();

  return <FeedbackDetailPage feedbackId={params.id} />;
}

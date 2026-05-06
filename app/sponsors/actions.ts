"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { isHoneypotTripped } from "@/lib/honeypot";
import {
  sendSponsorRequestConfirmation,
  sendSponsorRequestNotification,
} from "@/lib/email";

const PACKAGE_LABELS: Record<string, string> = {
  gold: "Gold (€250)",
  silver: "Silver (€150)",
  other: "Anders / nog niet zeker",
};

export async function submitSponsorRequest(formData: FormData) {
  if (isHoneypotTripped(formData)) {
    redirect("/sponsors?aangevraagd=1&sectie=aanvragen");
  }

  const nameVal = formData.get("name");
  const emailVal = formData.get("email");
  const messageVal = formData.get("message");
  const packageVal = formData.get("package");

  if (!nameVal || typeof nameVal !== "string" || !emailVal || typeof emailVal !== "string") {
    redirect("/sponsors?error=invalid&sectie=aanvragen");
  }

  const name = nameVal.trim();
  const email = emailVal.trim();
  const userMessage = messageVal && typeof messageVal === "string" ? messageVal.trim() : "";
  const packageKey = typeof packageVal === "string" ? packageVal : "";
  const packageLabel = PACKAGE_LABELS[packageKey] ?? null;
  const userMessageOrNull = userMessage || null;

  const storedMessage = [
    packageLabel ? `Gekozen pakket: ${packageLabel}` : null,
    userMessageOrNull,
  ]
    .filter(Boolean)
    .join("\n\n") || null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sponsor_requests")
    .insert({ name, email, message: storedMessage });

  if (error) {
    console.error("Sponsor request error:", error);
    redirect("/sponsors?error=server&sectie=aanvragen");
  }

  await Promise.all([
    sendSponsorRequestNotification({
      name,
      email,
      packageLabel,
      message: userMessageOrNull,
    }),
    sendSponsorRequestConfirmation({
      to: email,
      name,
      packageLabel,
      message: userMessageOrNull,
    }),
  ]);

  redirect("/sponsors?aangevraagd=1&sectie=aanvragen");
}

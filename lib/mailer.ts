import "server-only";
import type { EmailMessage } from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function mailerFrom(): string {
  return process.env.EMAIL_FROM || "GigleNode <onboarding@resend.dev>";
}

/**
 * Tries to deliver queued mail through Resend. Without RESEND_API_KEY the
 * outbox stays queued and the admin panel says so — no fake "sent" state.
 */
export async function deliverEmails(
  messages: EmailMessage[],
): Promise<{ id: string; ok: boolean; error?: string }[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return messages.map((m) => ({ id: m.id, ok: false, error: "RESEND_API_KEY is not configured" }));

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const message of messages) {
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: mailerFrom(),
          to: [message.to],
          subject: message.subject,
          text: message.body,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        results.push({ id: message.id, ok: true });
      } else {
        const detail = (await response.text()).slice(0, 220);
        results.push({ id: message.id, ok: false, error: `Resend ${response.status}: ${detail}` });
      }
    } catch (error) {
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      results.push({ id: message.id, ok: false, error: detail.slice(0, 220) });
    }
  }
  return results;
}

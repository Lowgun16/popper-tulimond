import twilio from "twilio";

function client() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const c = client();
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!c || (!from && !messagingServiceSid)) {
    console.warn("[sms] Twilio not configured; skipping send to", to);
    return false;
  }
  try {
    await c.messages.create(
      messagingServiceSid
        ? { to, body, messagingServiceSid }
        : { to, body, from: from! }
    );
    return true;
  } catch (err) {
    console.error("[sms] send error:", err);
    return false;
  }
}

export async function sendSmsBatch(
  recipients: Array<{ to: string; body: string }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (const r of recipients) {
    const ok = await sendSms(r.to, r.body);
    ok ? sent++ : failed++;
  }
  return { sent, failed };
}

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import { Resend } from "resend";
import { render } from "@react-email/render";
import AdminLoginLink from "@/emails/AdminLoginLink";

const EXPIRY_MINUTES = 15;

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const users = await sql`
    SELECT id, name, email FROM admin_users
    WHERE lower(email) = lower(${email}) AND active = true
  `;

  // Always return 200 — don't reveal whether the email exists
  if (users.length === 0) return NextResponse.json({ ok: true });

  const user = users[0];
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO admin_login_links (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${user.id}, ${expiresAt.toISOString()})
  `;

  const origin = req.nextUrl.origin;
  const loginUrl = `${origin}/admin/login?token=${token}`;

  const html = await render(AdminLoginLink({ loginUrl, name: user.name }));
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.FROM_EMAIL ?? "noreply@poppertulimond.com",
    to: user.email,
    subject: "Your Popper Tulimond sign-in link",
    html,
  });

  if (error) {
    console.error("[login-link] Resend error:", error);
    return NextResponse.json({ error: "Failed to send email. Check server logs." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type OtpMode = "signin" | "signup";

function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("Missing SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM");
  }

  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      mode?: OtpMode;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const mode: OtpMode = body.mode === "signup" ? "signup" : "signin";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const linkResult =
      mode === "signup"
        ? await admin.auth.admin.generateLink({ type: "signup", email })
        : await admin.auth.admin.generateLink({ type: "magiclink", email });
    const { data, error } = linkResult;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const otp = data.properties?.email_otp;
    if (!otp) {
      return NextResponse.json(
        { error: "Could not generate OTP" },
        { status: 500 }
      );
    }

    const { from, transporter } = getMailer();
    const subject = mode === "signup" ? "Your sign-up code" : "Your sign-in code";
    await transporter.sendMail({
      from,
      to: email,
      subject,
      text: `Your one-time code is: ${otp}\n\nThis code expires soon.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;">
          <p>Your one-time code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:12px 0;">${otp}</p>
          <p>This code expires soon.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

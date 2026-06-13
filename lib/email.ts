// import nodemailer from "nodemailer";

// /**
//  * Sends the OTP email. If SMTP credentials are configured in the environment a
//  * real email is sent (free via a Gmail App Password). Otherwise we fall back to
//  * logging the code to the server console so the flow is fully testable in dev
//  * without any external setup.
//  *
//  * Returns { delivered } so the API can tell the client whether a real email went
//  * out. In dev with no SMTP, the OTP is also surfaced to the client for testing.
//  */
// export async function sendOtpEmail(
//   to: string,
//   otp: string
// ): Promise<{ delivered: boolean }> {
//   // Accept either SMTP_* or EMAIL_* (Gmail) naming; default host to Gmail.
//   const user = process.env.SMTP_USER || process.env.EMAIL_USER;
//   const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
//   const host = process.env.SMTP_HOST || "smtp.gmail.com";
//   const port = Number(process.env.SMTP_PORT) || 587;

//   if (!user || !pass) {
//     console.log(
//       `\n========================================\n` +
//         `[RideHub] Email not configured (no SMTP).\n` +
//         `OTP for ${to} is: ${otp}\n` +
//         `========================================\n`
//     );
//     return { delivered: false };
//   }

//   const transporter = nodemailer.createTransport({
//     host,
//     port,
//     secure: port === 465,
//     auth: { user, pass },
//   });

//   await transporter.sendMail({
//     from: `"RideHub" <${user}>`,
//     to,
//     subject: "Your RideHub verification code",
//     html: `
//       <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
//         <h2 style="color:#1e293b;margin:0 0 8px">Verify your email</h2>
//         <p style="color:#64748b;margin:0 0 24px">Use the code below to finish creating your RideHub account. It expires in 10 minutes.</p>
//         <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:20px;border-radius:12px">${otp}</div>
//         <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">If you didn't request this, you can ignore this email.</p>
//       </div>
//     `,
//   });

//   return { delivered: true };
// }

import { Resend } from "resend";

export async function sendOtpEmail(
  to: string,
  otp: string
): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `\n========================================\n` +
        `[RideHub] Email not configured (no RESEND_API_KEY).\n` +
        `OTP for ${to} is: ${otp}\n` +
        `========================================\n`
    );
    return { delivered: false };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "onboarding@resend.dev", // free testing address from Resend
    to,
    subject: "Your RideHub verification code",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
        <h2 style="color:#1e293b;margin:0 0 8px">Verify your email</h2>
        <p style="color:#64748b;margin:0 0 24px">Use the code below to finish creating your RideHub account. It expires in 10 minutes.</p>
        <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:20px;border-radius:12px">${otp}</div>
        <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  return { delivered: true };
}
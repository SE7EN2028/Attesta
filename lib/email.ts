type SendReportReadyEmailInput = {
  to: string;
  clientName: string;
  companyName: string;
  meetingTitle: string;
  reportUrl: string;
};

export async function sendReportReadyEmail(
  input: SendReportReadyEmailInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY is not configured." };
  }

  const html = buildReportReadyHtml(input);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          email: process.env.EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME ?? "Attesta",
        },
        to: [{ email: input.to, name: input.clientName }],
        subject: `Your report is ready — ${input.meetingTitle}`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error.";
    return { ok: false, error: message };
  }
}

export async function sendSignInLinkEmail(input: {
  to: string;
  url: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY is not configured." };
  }

  const html = buildSignInLinkHtml(input.url);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          email: process.env.EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME ?? "Attesta",
        },
        to: [{ email: input.to }],
        subject: "Your Attesta sign-in link",
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error.";
    return { ok: false, error: message };
  }
}

function buildSignInLinkHtml(url: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
      <p>Click below to sign in to Attesta. This link is valid for 20 minutes and
         can be used once.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 20px;
         background:#111;color:#fff;text-decoration:none;border-radius:6px;">
         Sign in to Attesta</a></p>
      <p style="color:#666;font-size:13px;">If the button doesn't work, copy this link:<br/>
         ${url}</p>
      <p style="color:#666;font-size:13px;">If you didn't request this, you can ignore this email.</p>
    </div>`;
}

function buildReportReadyHtml(input: SendReportReadyEmailInput): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
      <p>Hi ${escapeHtml(input.clientName)},</p>
      <p>Your compliance report for <strong>${escapeHtml(input.meetingTitle)}</strong>
         (${escapeHtml(input.companyName)}) is finalized and ready to view.</p>
      <p><a href="${input.reportUrl}" style="display:inline-block;padding:10px 20px;
         background:#111;color:#fff;text-decoration:none;border-radius:6px;">
         View your report</a></p>
      <p style="color:#666;font-size:13px;">If the button doesn't work, copy this link:<br/>
         ${input.reportUrl}</p>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

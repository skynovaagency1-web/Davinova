/** Resend transactional email adapter. Configure a verified sender/domain before launch. */
export async function sendTransactionalEmail(
  input: {to:string;subject:string;html:string}, apiKey?: string, from?: string, replyTo = 'contact@davinova.com',
): Promise<void> {
  if (!apiKey?.trim()) throw new Error('RESEND_API_KEY is not configured.');
  if (!from?.trim() || !/^[^<>]+<[^<>@\s]+@[^<>@\s]+>$/i.test(from.trim())) {
    throw new Error('EMAIL_FROM must be a verified sender such as Davinova <orders@your-domain.com>.');
  }
  if (!input.to.trim() || !input.subject.trim() || !input.html.trim()) throw new Error('Recipient, subject and HTML are required.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: from, to: [input.to], reply_to: replyTo, subject: input.subject, html: input.html }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Resend rejected the email (HTTP ' + response.status + '): ' + detail.slice(0, 200));
  }
}

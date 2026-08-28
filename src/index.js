const ALLOWED_ORIGINS = new Set(['https://abu-saleh-photography.pages.dev']);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store', ...extra }
  });
}

function originAllowed(request, env) {
  const origin = request.headers.get('Origin');
  const configured = env.ALLOWED_ORIGIN?.trim();
  if (!origin) return true;
  return origin === configured || ALLOWED_ORIGINS.has(origin);
}

function validEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export default {
  async fetch(request, env) {
    const corsOrigin = env.ALLOWED_ORIGIN || 'https://abu-saleh-photography.pages.dev';
    const baseHeaders = { 'access-control-allow-origin': corsOrigin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
    if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, baseHeaders);
    if (!originAllowed(request, env)) return json({ error: 'Forbidden' }, 403, baseHeaders);
    if (!['application/json','application/json; charset=UTF-8'].includes((request.headers.get('content-type') || '').toLowerCase())) return json({ error: 'JSON required' }, 415, baseHeaders);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 12000) return json({ error: 'Request too large' }, 413, baseHeaders);

    let data;
    try { data = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, baseHeaders); }
    const name = String(data?.name || '').trim();
    const email = String(data?.email || '').trim();
    const message = String(data?.message || '').trim();
    if (name.length < 2 || name.length > 80 || email.length > 254 || !validEmail(email) || message.length < 10 || message.length > 2000) return json({ error: 'Invalid form data' }, 400, baseHeaders);

    if (env.TURNSTILE_SECRET) {
      const token = String(data?.turnstileToken || '');
      if (!token) return json({ error: 'Verification required' }, 400, baseHeaders);
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get('CF-Connecting-IP') }) });
      const result = await verify.json();
      if (!result.success) return json({ error: 'Verification failed' }, 403, baseHeaders);
    }

    if (!env.RESEND_API_KEY || !env.CONTACT_TO) return json({ error: 'Contact service is not configured' }, 503, baseHeaders);
    const emailResponse = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.CONTACT_FROM || 'Photography Website <onboarding@resend.dev>', to: [env.CONTACT_TO], reply_to: email, subject: `Photography inquiry from ${name}`, text: `Name: ${name}\nEmail: ${email}\n\n${message}` }) });
    if (!emailResponse.ok) return json({ error: 'Unable to deliver inquiry' }, 502, baseHeaders);
    return json({ ok: true, message: 'Inquiry sent' }, 200, baseHeaders);
  }
};

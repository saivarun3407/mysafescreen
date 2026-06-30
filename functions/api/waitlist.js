// Cloudflare Pages Function — POST /api/waitlist
//
// Captures a waitlist email. Two independent sinks, both optional; whichever is
// configured is used, and the form works even if neither is:
//
//   1. Resend Audience (recommended) — set these as Pages env vars / secrets:
//        RESEND_API_KEY       (secret)  e.g. re_xxx
//        RESEND_AUDIENCE_ID             the audience UUID from resend.com/audiences
//      Adds the email as a contact you can later email a launch broadcast to.
//
//   2. Cloudflare KV (belt & suspenders) — bind a KV namespace named WAITLIST.
//
// If neither is set the signup is accepted and logged, so the UX never breaks.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addToResend(env, email, request) {
  if (!env?.RESEND_API_KEY || !env?.RESEND_AUDIENCE_ID) return { tried: false };
  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      }
    );
    // Resend returns 422 if the contact already exists — treat as success.
    if (res.ok || res.status === 422) return { tried: true, ok: true };
    const detail = await res.text();
    console.error('resend add contact failed', res.status, detail);
    return { tried: true, ok: false };
  } catch (err) {
    console.error('resend request error', err);
    return { tried: true, ok: false };
  }
}

async function addToKV(env, email, request) {
  if (!env?.WAITLIST) return { tried: false };
  try {
    const record = {
      email,
      ts: new Date().toISOString(),
      ref: request.headers.get('referer') || null,
    };
    await env.WAITLIST.put(`email:${email}`, JSON.stringify(record));
    return { tried: true, ok: true };
  } catch (err) {
    console.error('waitlist KV put failed', err);
    return { tried: true, ok: false };
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_body' }, 400);
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ ok: false, error: 'invalid_email' }, 422);
  }

  const [resend, kv] = await Promise.all([
    addToResend(env, email, request),
    addToKV(env, email, request),
  ]);

  if (!resend.tried && !kv.tried) {
    console.log('waitlist signup (no sink configured):', email);
  }

  // Surface a hard failure only if a configured sink actually errored and no
  // sink succeeded — otherwise the visitor is genuinely on the list.
  const anyTried = resend.tried || kv.tried;
  const anyOk = resend.ok || kv.ok;
  if (anyTried && !anyOk) {
    return json({ ok: false, error: 'storage_failed' }, 502);
  }

  return json({ ok: true });
}

// Non-POST methods → 405.
export async function onRequestGet() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

// Cloudflare Pages Function — POST /api/waitlist
//
// Stores a waitlist email. If a KV namespace named WAITLIST is bound (see
// README), emails persist there. Otherwise it accepts the email gracefully so
// the form still works in any environment.
//
// Bind KV in the Cloudflare dashboard:
//   Pages project → Settings → Functions → KV namespace bindings
//   Variable name: WAITLIST  →  (your KV namespace)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Persist to KV if available.
  if (env?.WAITLIST) {
    try {
      const record = {
        email,
        ts: new Date().toISOString(),
        ref: request.headers.get('referer') || null,
      };
      // Key on email so re-submits dedupe.
      await env.WAITLIST.put(`email:${email}`, JSON.stringify(record));
    } catch (err) {
      // Don't surface storage errors to the visitor; the intent is captured.
      console.error('waitlist KV put failed', err);
    }
  } else {
    console.log('waitlist signup (no KV bound):', email);
  }

  return json({ ok: true });
}

// Reject other methods cleanly.
export async function onRequest({ request }) {
  if (request.method === 'POST') return; // handled above
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

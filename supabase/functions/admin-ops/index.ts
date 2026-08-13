// supabase/functions/admin-ops/index.ts
// Privileged admin operations — uses service role key.
// Called only by authenticated admin users; role is verified server-side.
import { createClient } from 'npm:@supabase/supabase-js';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL       = Deno.env.get('FROM_EMAIL') ?? 'noreply@dutchexampro.com';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── Auth: verify caller is an active admin ────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: authErr } = await serviceClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  // Check admin role
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    return json({ error: 'Forbidden — admin only' }, 403);
  }

  // ── Route by action ───────────────────────────────────────────────────────
  let body: { action: string; [key: string]: unknown };
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400); }

  const { action } = body;

  // ── List users ────────────────────────────────────────────────────────────
  if (action === 'listUsers') {
    const { data: profiles, error } = await serviceClient
      .from('user_profiles')
      .select('user_id, email, role, is_active, last_login_at, created_at, deactivated_at')
      .order('created_at', { ascending: false });

    if (error) return json({ error: error.message }, 500);

    // Get word counts per user
    const { data: wordCounts } = await serviceClient
      .from('user_words')
      .select('user_id')
      .in('user_id', (profiles ?? []).map((p: { user_id: string }) => p.user_id));

    const countMap: Record<string, number> = {};
    (wordCounts ?? []).forEach((r: { user_id: string }) => {
      countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1;
    });

    const users = (profiles ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      word_count: countMap[p.user_id as string] ?? 0,
    }));

    return json({ users });
  }

  // ── Invite user ───────────────────────────────────────────────────────────
  if (action === 'inviteUser') {
    const { email } = body as { action: string; email: string };
    if (!email) return json({ error: 'email required' }, 400);

    const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email);
    if (error) return json({ error: error.message }, 400);
    return json({ user: data.user });
  }

  // ── Send email campaign ───────────────────────────────────────────────────
  if (action === 'sendEmail') {
    const { campaignId, subject, body: emailBody, recipientIds } = body as {
      action: string; campaignId: string; subject: string;
      body: string; recipientIds: string[];
    };

    if (!campaignId || !subject || !emailBody || !recipientIds?.length) {
      return json({ error: 'campaignId, subject, body, recipientIds required' }, 400);
    }

    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY secret not configured' }, 503);
    }

    // Get emails for recipient user IDs
    const { data: profiles } = await serviceClient
      .from('user_profiles')
      .select('email')
      .in('user_id', recipientIds)
      .eq('is_active', true);

    const emails = (profiles ?? [])
      .map((p: { email: string }) => p.email)
      .filter(Boolean);

    if (!emails.length) return json({ error: 'No valid recipient emails found' }, 400);

    // Mark campaign as sending
    await serviceClient.from('email_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    // Send via Resend
    let sentCount = 0;
    let failed = false;
    let errorMsg = '';

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          emails.map(to => ({
            from: FROM_EMAIL,
            to,
            subject,
            html: emailBody.replace(/\n/g, '<br>'),
          }))
        ),
      });

      const result = await res.json();
      if (!res.ok) {
        failed = true;
        errorMsg = result.message ?? 'Resend API error';
      } else {
        sentCount = emails.length;
      }
    } catch (err) {
      failed = true;
      errorMsg = err instanceof Error ? err.message : 'Network error';
    }

    // Update campaign status
    await serviceClient.from('email_campaigns').update({
      status:          failed ? 'failed' : 'sent',
      recipient_count: sentCount,
      sent_at:         failed ? null : new Date().toISOString(),
      error_message:   failed ? errorMsg : null,
      updated_at:      new Date().toISOString(),
    }).eq('id', campaignId);

    if (failed) return json({ error: errorMsg }, 502);
    return json({ sent: sentCount });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});

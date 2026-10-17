// supabase/functions/admin-signup/index.ts
// Deno TypeScript Edge Function for secure administrator registration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { display_name, email, password, keyphrase } = await req.json();

    const expectedKeyphrase = Deno.env.get('ADMIN_KEYPHRASE');
    if (!expectedKeyphrase || !keyphrase || !safeCompare(keyphrase.trim(), expectedKeyphrase.trim())) {
      return new Response(
        JSON.stringify({ code: 'INVALID_KEYPHRASE', message: 'INVALID_KEYPHRASE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedName = (display_name ?? '').trim();
    const trimmedEmail = (email ?? '').trim().toLowerCase();

    if (!trimmedName || trimmedName.length > 60) {
      return new Response(
        JSON.stringify({ code: 'VALIDATION', message: 'Display name must be 1-60 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({ code: 'VALIDATION', message: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ code: 'VALIDATION', message: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user in Supabase Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        display_name: trimmedName,
      },
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('unique') || msg.includes('email_taken')) {
        return new Response(
          JSON.stringify({ code: 'EMAIL_TAKEN', message: 'EMAIL_TAKEN' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ code: 'UNKNOWN', message: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert app_user record with role = admin
    const { error: insertError } = await supabaseAdmin.from('app_user').insert({
      auth_id: userData.user.id,
      role: 'admin',
      display_name: trimmedName,
      studentid: null,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ code: 'UNKNOWN', message: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userData.user.id }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ code: 'UNKNOWN', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

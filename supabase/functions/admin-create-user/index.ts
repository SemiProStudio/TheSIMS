// =============================================================================
// Admin Create User Edge Function
//
// Creates a user account via the service-role admin API on behalf of a
// caller who holds admin_users EDIT. This replaces the client-side signUp
// path, which depended on PUBLIC signups being enabled — meaning anyone with
// the app's anon key could mint an account without touching the UI. With
// this function deployed, "Allow new users to sign up" can be switched OFF
// in the dashboard and Add User keeps working.
//
// Also applies the chosen role server-side: handle_new_user hardcodes
// role_user on signup (fail-safe by design), so the role is set with the
// service client immediately after creation — the client no longer needs a
// second, RLS-gated update.
//
// verify_jwt = true: the gateway rejects requests without a valid JWT before
// this code runs; decodeAuthClaims then identifies the caller for the
// permission check.
// =============================================================================

import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  getSupabaseClient,
  decodeAuthClaims,
} from '../_shared/utils.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, name, roleId } = await req.json();

    if (!email || !password || !name) {
      return errorResponse('Missing required fields: email, password, name');
    }

    const claims = decodeAuthClaims(req);
    if (!claims?.sub) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = await getSupabaseClient();

    // ------------------------------------------------------------------------
    // Authorization: caller must hold admin_users EDIT — the same key that
    // gates the Add User button, the users RLS write policies, and the
    // role-change trigger. verify_jwt alone would let ANY signed-in user
    // (including read-only Viewers) create accounts.
    // ------------------------------------------------------------------------
    const { data: caller } = await supabase
      .from('users')
      .select('role_id, roles ( permissions )')
      .eq('id', claims.sub)
      .maybeSingle();

    const callerPerms = (caller as { roles?: { permissions?: Record<string, string> } } | null)
      ?.roles?.permissions;
    if (callerPerms?.admin_users !== 'edit') {
      console.warn(`Rejected user creation by non-admin caller ${claims.sub}`);
      return errorResponse('Creating users requires user-administration access', 403);
    }

    // ------------------------------------------------------------------------
    // Create the account. email_confirm: true — an admin-created account is
    // usable immediately; there is no self-service signup email loop.
    // handle_new_user fires on the auth.users insert and creates the profile
    // row (as role_user).
    // ------------------------------------------------------------------------
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role_id: roleId },
    });

    if (createError) {
      // Surface GoTrue's message (duplicate email, weak password, ...)
      return errorResponse(createError.message || 'Failed to create user', 400);
    }

    const newUserId = created.user?.id;

    // ------------------------------------------------------------------------
    // Apply the chosen role. Validate it exists first — a typo'd roleId must
    // not strand the account half-configured without a signal.
    // ------------------------------------------------------------------------
    let roleApplied = false;
    if (newUserId && roleId && roleId !== 'role_user') {
      const { data: role } = await supabase
        .from('roles')
        .select('id')
        .eq('id', roleId)
        .maybeSingle();

      if (role) {
        const { error: roleError } = await supabase
          .from('users')
          .update({ role_id: roleId })
          .eq('id', newUserId);
        roleApplied = !roleError;
        if (roleError) {
          console.error(`Role ${roleId} could not be applied to ${newUserId}:`, roleError.message);
        }
      } else {
        console.warn(`Unknown roleId ${roleId} requested for new user ${newUserId}`);
      }
    } else if (roleId === 'role_user' || !roleId) {
      roleApplied = true; // handle_new_user already set role_user
    }

    console.log(`User ${newUserId} created by ${claims.sub} (role ${roleId}, applied: ${roleApplied})`);
    return jsonResponse({
      user: { id: newUserId, email: created.user?.email },
      roleApplied,
    });
  } catch (err) {
    console.error('admin-create-user failed:', err);
    return errorResponse('Internal error', 500);
  }
});

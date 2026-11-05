import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ignoredCleanupCodes = new Set(['42P01', '42703', 'PGRST204'])

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

function isIgnorableCleanupError(error: { code?: string; message?: string }) {
  if (error.code && ignoredCleanupCodes.has(error.code)) return true
  return /does not exist|schema cache/i.test(error.message || '')
}

function avatarPathFromPublicUrl(url?: string | null) {
  if (!url) return null
  const marker = '/storage/v1/object/public/avatars/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  const pathWithQuery = url.slice(markerIndex + marker.length)
  const path = pathWithQuery.split('?')[0]
  try {
    return decodeURIComponent(path)
  } catch (_err) {
    return path
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  try {
    const token = getBearerToken(req)
    if (!token) {
      return jsonResponse({ error: 'missing_authorization' }, 401)
    }

    let payload: { confirm?: boolean } = {}
    try {
      payload = await req.json()
    } catch (_err) {
      payload = {}
    }

    if (payload.confirm !== true) {
      return jsonResponse({ error: 'confirmation_required' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'server_not_configured' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return jsonResponse({ error: 'invalid_user' }, 401)
    }

    const userId = userData.user.id
    const cleanupLog: Array<{ target: string; count?: number | null; skipped?: boolean }> = []

    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle()

    const deleteRows = async (table: string, column: string) => {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq(column, userId)

      if (error) {
        if (isIgnorableCleanupError(error)) {
          cleanupLog.push({ target: `${table}.${column}`, skipped: true })
          return
        }
        throw new Error(`${table}.${column}: ${error.message}`)
      }

      cleanupLog.push({ target: `${table}.${column}`, count })
    }

    const avatarPaths = new Set<string>()
    const profileAvatarPath = avatarPathFromPublicUrl(profile?.avatar_url)
    if (profileAvatarPath) avatarPaths.add(profileAvatarPath)

    const { data: folderFiles, error: folderListError } = await supabase.storage
      .from('avatars')
      .list(userId, { limit: 1000 })

    if (!folderListError && folderFiles) {
      folderFiles
        .filter((file) => !!file.name)
        .forEach((file) => avatarPaths.add(`${userId}/${file.name}`))
    }

    const { data: rootFiles, error: rootListError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1000, search: userId })

    if (!rootListError && rootFiles) {
      rootFiles
        .filter((file) => !!file.name && file.name.startsWith(userId))
        .forEach((file) => avatarPaths.add(file.name))
    }

    if (avatarPaths.size > 0) {
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([...avatarPaths])

      if (removeError) {
        console.warn('[delete-account] avatar cleanup failed:', removeError.message)
      } else {
        cleanupLog.push({ target: 'storage.avatars', count: avatarPaths.size })
      }
    }

    await deleteRows('user_follows', 'follower_id')
    await deleteRows('user_follows', 'following_id')
    await deleteRows('user_blocks', 'blocker_id')
    await deleteRows('user_blocks', 'blocked_id')

    await deleteRows('creator_code_redemptions', 'user_id')
    await deleteRows('creator_picks', 'user_id')
    await deleteRows('daily_consumption', 'user_id')
    await deleteRows('product_suggestions', 'user_id')
    await deleteRows('push_tokens', 'user_id')
    await deleteRows('snus_favorites', 'user_id')
    await deleteRows('snus_order_clicks', 'user_id')
    await deleteRows('usage_logs', 'user_id')
    await deleteRows('user_ages', 'user_id')
    await deleteRows('user_badges', 'user_id')
    await deleteRows('user_collections', 'user_id')
    await deleteRows('profiles', 'id')

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteUserError) {
      throw new Error(`auth.users: ${deleteUserError.message}`)
    }

    console.log(`[delete-account] deleted user ${userId}`)
    return jsonResponse({ success: true, cleanup: cleanupLog })
  } catch (err) {
    console.error('[delete-account] error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})

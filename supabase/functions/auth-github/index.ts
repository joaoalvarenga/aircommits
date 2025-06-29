import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const schema = url.searchParams.get('schema');
    if (!code) {
        let state = '';
        if (schema) {
          state = `&state=${schema}`
        }
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${Deno.env.get('GITHUB_CLIENT_ID')}&scope=read:user,user:email${state}`;
        return Response.redirect(githubUrl, 302);
    }

    const state = url.searchParams.get('state');

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: Deno.env.get('GITHUB_CLIENT_ID'),
        client_secret: Deno.env.get('GITHUB_CLIENT_SECRET'),
        code,
      }),
    })

    const tokenData = await tokenResponse.json()
    const { access_token } = tokenData

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve access token' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user information from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${access_token}`,
      },
    })

    const userData = await userResponse.json()
    const { id, login, avatar_url } = userData

    // Get user emails
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${access_token}`,
      },
    })

    const emailsData = await emailsResponse.json()
    const primaryEmail = emailsData.find((email: any) => email.primary)?.email || ''

    // Create Supabase client
    const supabaseClient = createClient(
Deno.env.get("SUPABASE_URL") ?? "",
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
{ global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } } });

    // Find or create user in database
    let { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('github_id', id.toString())
      .single()

    if (userError && userError.code !== 'PGRST116') {
      throw userError
    }

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient
        .from('users')
        .insert({
          github_id: id.toString(),
          username: login,
          email: primaryEmail,
          avatar: avatar_url,
          access_token: access_token
        })
        .select()
        .single()

      if (createError) throw createError
      user = newUser
    } else {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabaseClient
        .from('users')
        .update({
          username: login,
          email: primaryEmail,
          avatar: avatar_url,
          access_token: access_token
        })
        .eq('github_id', id.toString())
        .select()
        .single()

      if (updateError) throw updateError
      user = updatedUser
    }

    // Create JWT token
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-default-jwt-secret'
    const token = await createJWT({
      id: user.id,
      github_id: user.github_id,
      username: user.username
    }, jwtSecret)

    const extensionUri = state ? `${state}://${Deno.env.get('EXTENSION_AUTH_URI')}` : `vscode://${Deno.env.get('EXTENSION_AUTH_URI')}`;

    return Response.redirect(
      `${extensionUri}?token=${token}`, 302);

  } catch (error) {
    console.error('Authentication error:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred during authentication' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const claims = {
    ...payload,
    iat: now,
    exp: now + (365 * 24 * 60 * 60) // 7 days
  }

  const encodedHeader = btoa(JSON.stringify(header))
  const encodedClaims = btoa(JSON.stringify(claims))
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${encodedHeader}.${encodedClaims}`)
  )

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `${encodedHeader}.${encodedClaims}.${encodedSignature}`
} 
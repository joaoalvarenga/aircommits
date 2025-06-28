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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } } });

    if (req.method === 'GET') {
      // Get signals with optional filters
      const url = new URL(req.url)
      const airport = url.searchParams.get('airport')
      const flight = url.searchParams.get('flight')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabaseClient
        .from('signals')
        .select(`
          id,
          airport,
          flight,
          message,
          latitude,
          longitude,
          timestamp,
          users!inner(id, username, avatar)
        `)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (airport) {
        query = query.ilike('airport', `%${airport}%`)
      }
      if (flight) {
        query = query.ilike('flight', `%${flight}%`)
      }

      const { data: signals, error } = await query

      if (error) throw error

      const formattedSignals = signals?.map(signal => ({
        id: signal.id,
        userId: signal.users.id,
        username: signal.users.username,
        userAvatar: signal.users.avatar,
        airport: signal.airport,
        flight: signal.flight,
        location: signal.latitude && signal.longitude ? {
          latitude: parseFloat(signal.latitude),
          longitude: parseFloat(signal.longitude)
        } : undefined,
        timestamp: signal.timestamp,
        message: signal.message
      })) || []

      return new Response(
        JSON.stringify(formattedSignals),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (req.method === 'POST') {
      // Create a new signal
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'No token provided' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-default-jwt-secret'
      const decoded = await verifyJWT(token, jwtSecret)
      
      if (!decoded) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { airport, flight, latitude, longitude } = await req.json()

      // Get user from database
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', decoded.id)
        .single()

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const message = `Working from ${airport || flight}`;

      // Create signal
      const { data: signal, error: signalError } = await supabaseClient
        .from('signals')
        .insert({
          user_id: user.id,
          airport,
          flight,
          message,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        })
        .select(`
          id,
          airport,
          flight,
          message,
          latitude,
          longitude,
          timestamp,
          users!inner(id, username, avatar)
        `)
        .single()

      if (signalError) throw signalError

      const formattedSignal = {
        id: signal.id,
        userId: signal.users.id,
        username: signal.users.username,
        userAvatar: signal.users.avatar,
        airport: signal.airport,
        flight: signal.flight,
        location: signal.latitude && signal.longitude ? {
          latitude: parseFloat(signal.latitude),
          longitude: parseFloat(signal.longitude)
        } : undefined,
        timestamp: signal.timestamp,
        message: signal.message
      }

      return new Response(
        JSON.stringify(formattedSignal),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error handling signals:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    
    // Verify signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0))
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(`${headerB64}.${payloadB64}`)
    )

    if (!isValid) return null

    // Decode payload
    const payload = JSON.parse(atob(payloadB64))
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null

    return payload
  } catch (error) {
    return null
  }
} 
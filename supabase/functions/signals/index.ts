import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate flight code format
function isValidFlightCode(flight: string): boolean {
  // Example: "LA1234"
  const regex = /^[A-Z]{2}\d{4}$/;
  return regex.test(flight);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } } });

    const {data: {user}} = await supabaseClient.auth.getUser(token);

    if (req.method === 'GET') {
      // Get signals with optional filters
      const url = new URL(req.url)
      const airport = url.searchParams.get('airport')
      const flight = url.searchParams.get('flight')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      // Check if this is a request for user's own signals
      if (url.pathname.endsWith('/my')) {
        // Get user's signals
        const { data: signals, error } = await supabaseClient
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
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(limit)

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
      }

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
      const { airport, flight, latitude, longitude } = await req.json()
      if (flight && !isValidFlightCode(flight)) {
        return new Response(
          JSON.stringify({ error: 'Invalid flight code format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      let airportName = airport;
      if (airport) {
        const { data: existingAirport, error: airportError } = await supabaseClient
          .from('airports')
          .select('name, code')
          .eq('code', airport)
          .single()

        if (airportError || !existingAirport) {
          return new Response(
            JSON.stringify({ error: 'Airport not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        airportName = existingAirport.name;
      }

      const now = new Date();
      const minutesAgo = new Date(now.getTime() - (15 * 60 * 1000));

      // Get lastSignal from database
      const { data: lastSignal } = await supabaseClient
        .from('signals')
        .select('timestamp')
        .gte('timestamp', minutesAgo.toISOString())
        .single()

      if (lastSignal) {
        return new Response(
          JSON.stringify({ error: 'Wait for the next signal' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const message = `Working from ${airportName || flight}`;

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
    } else if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const signalId = url.pathname.split('/').pop()

      if (!signalId) {
        return new Response(
          JSON.stringify({ error: 'Signal ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if the signal belongs to the user
      const { data: signal, error: signalError } = await supabaseClient
        .from('signals')
        .select('user_id')
        .eq('id', signalId)
        .single()

      if (signalError || !signal) {
        return new Response(
          JSON.stringify({ error: 'Signal not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (signal.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to delete this signal' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete the signal
      const { error: deleteError } = await supabaseClient
        .from('signals')
        .delete()
        .eq('id', signalId)

      if (deleteError) throw deleteError

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200,
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
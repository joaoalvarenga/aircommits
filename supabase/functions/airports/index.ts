import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Haversine formula to calculate distance between two points on Earth
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
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

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    if (req.method === 'GET') {
      if (path === 'search') {
        // Search airports
        const query = url.searchParams.get('q')
        
        if (!query || query.length < 2) {
          return new Response(
            JSON.stringify([]),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { data: airports, error } = await supabaseClient
          .from('airports')
          .select('*')
          .or(`code.ilike.%${query}%,name.ilike.%${query}%,city.ilike.%${query}%`)
          .order('name', { ascending: true })
          .limit(10)

        if (error) throw error

        return new Response(
          JSON.stringify(airports || []),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      } else if (path === 'nearby') {
        // Get nearby airports using Haversine formula
        const lat = url.searchParams.get('lat')
        const lng = url.searchParams.get('lng')
        const radius = url.searchParams.get('radius') || '50'
        
        if (!lat || !lng) {
          return new Response(
            JSON.stringify({ error: 'Latitude and longitude are required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const latNum = parseFloat(lat)
        const lngNum = parseFloat(lng)
        const radiusNum = parseFloat(radius)

        // Get airports within a rough bounding box first, then filter by exact distance
        const { data: airports, error } = await supabaseClient
          .from('airports')
          .select('*')
          .gte('latitude', latNum - 1)
          .lte('latitude', latNum + 1)
          .gte('longitude', lngNum - 1)
          .lte('longitude', lngNum + 1)

        if (error) throw error

        // Filter airports by exact Haversine distance and add distance to each airport
        const nearbyAirports = (airports || [])
          .map(airport => ({
            ...airport,
            distance: haversineDistance(latNum, lngNum, airport.latitude, airport.longitude)
          }))
          .filter(airport => airport.distance <= radiusNum)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10)

        return new Response(
          JSON.stringify({ airports: nearbyAirports }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      } else {
        // Get all airports
        const { data: airports, error } = await supabaseClient
          .from('airports')
          .select('*')
          .order('name', { ascending: true })
          .limit(100)

        if (error) throw error

        return new Response(
          JSON.stringify(airports || []),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error handling airports:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
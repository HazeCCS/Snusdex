import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Body lesen
    const { collection_id } = await req.json()
    if (!collection_id) {
      return new Response(
        JSON.stringify({ error: 'collection_id fehlt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Client-IP aus Request-Header ermitteln
    //    Supabase leitet die originale IP in X-Forwarded-For weiter
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : null

    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      console.log('[geo-lookup] Lokale/unbekannte IP, überspringe:', ip)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'local ip' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. IP-Geolocation via ip-api.com (kostenlos, kein API-Key nötig)
    //    Felder: status, country, countryCode, regionName, city, timezone
    const geoRes = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,timezone`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!geoRes.ok) {
      throw new Error(`ip-api.com Fehler: ${geoRes.status}`)
    }

    const geo = await geoRes.json()

    if (geo.status !== 'success') {
      console.warn('[geo-lookup] Geo-Lookup fehlgeschlagen:', geo)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'geo lookup failed', geo }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Supabase Admin-Client (Service Role Key für DB-Schreibzugriff)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 5. user_collections-Zeile mit Geodaten updaten
    const { error: updateError } = await supabase
      .from('user_collections')
      .update({
        country_code: geo.countryCode,   // 'DE', 'AT', 'CH', ...
        country_name: geo.country,        // 'Germany', 'Austria', ...
        region:       geo.regionName,     // 'Bavaria', 'Vienna', ...
        city:         geo.city,           // 'Munich', ...
        timezone:     geo.timezone,       // 'Europe/Berlin', ...
      })
      .eq('id', collection_id)

    if (updateError) {
      throw new Error(`DB-Update Fehler: ${updateError.message}`)
    }

    console.log(`[geo-lookup] ✅ collection_id=${collection_id} → ${geo.city}, ${geo.countryCode}`)

    return new Response(
      JSON.stringify({
        success: true,
        collection_id,
        geo: {
          country_code: geo.countryCode,
          country_name: geo.country,
          region:       geo.regionName,
          city:         geo.city,
          timezone:     geo.timezone,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[geo-lookup] Fehler:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

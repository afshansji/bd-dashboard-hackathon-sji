import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Auth function up and running!")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { method } = req
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (method === 'POST') {
      if (action === 'login') {
        const { email, password } = await req.json()
        
        console.log('Login attempt for:', email)

        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.error('Login error:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        console.log('Login successful for:', email)
        return new Response(
          JSON.stringify({ 
            user: data.user,
            session: data.session 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      if (action === 'signup') {
        const { email, password, firstName, lastName } = await req.json()
        
        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ error: 'Invalid email format' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }
        
        console.log('Signup attempt for:', email)

        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName
              // NOTE: Role is NOT set here - it's handled by database trigger
            }
          }
        })

        if (error) {
          console.error('Signup error:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        console.log('Signup successful for:', email)
        return new Response(
          JSON.stringify({ 
            user: data.user,
            session: data.session 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      if (action === 'logout') {
        const authHeader = req.headers.get('Authorization')
        if (authHeader) {
          supabaseClient.auth.setSession({
            access_token: authHeader.replace('Bearer ', ''),
            refresh_token: ''
          })
        }

        const { error } = await supabaseClient.auth.signOut()

        if (error) {
          console.error('Logout error:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        console.log('Logout successful')
        return new Response(
          JSON.stringify({ message: 'Logout successful' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
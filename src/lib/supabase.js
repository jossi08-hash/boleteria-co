import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ssyelddmusabkxwijghn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzeWVsZGRtdXNhYmt4d2lqZ2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDA1MzcsImV4cCI6MjA5NzcxNjUzN30.esM99AhCE_7GnEETjaemlDwKiim0eMxSrYti1B_qzRA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
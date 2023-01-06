import {createClient} from '@supabase/supabase-js'


const supabaseURL = 'https://kzzztofriokcwofxeblg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6enp0b2ZyaW9rY3dvZnhlYmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzE3NTYxMDgsImV4cCI6MTk4NzMzMjEwOH0.PpTr598zk50hGyIzU4RfnJ0Du3GCCxN5Eb67g8vq4Y4';

export const supabase = createClient(supabaseURL, supabaseAnonKey)
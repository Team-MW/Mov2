import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const url = env.SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY;
console.log('Testing connection to:', url);
const supabase = createClient(url, anonKey);

async function run() {
  const { data, error } = await supabase.from('actus').select('*').limit(1);
  if (error) {
    console.error('Error fetching actus:', error);
  } else {
    console.log('Successfully fetched actus:', data);
  }
}
run();

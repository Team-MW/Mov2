import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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
const supabase = createClient(url, anonKey);

async function run() {
  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .ilike('slug', '%agneau%');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Agneau Promos found:', data);
  }
}
run();

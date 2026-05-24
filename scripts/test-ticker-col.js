import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const url = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Testing column ticker_semaine in table promos...');
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data, error } = await supabase.from('promos').select('id, ticker_semaine').limit(1);
  if (error) {
    console.error('Error fetching promos:', error.message);
  } else {
    console.log('Successfully fetched ticker_semaine from promos:', data);
  }
}
run();

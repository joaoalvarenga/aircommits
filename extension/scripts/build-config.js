const fs = require('fs');
const path = require('path');

// Read the current config file
const configPath = path.join(__dirname, '..', 'src', 'config.ts');
const config = fs.readFileSync(configPath, 'utf8');

// Get the environment variable or use default
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'public-anon-key';

// Replace the placeholder with the actual URL
const newConfig = config.replace(
  /export const SUPABASE_URL =[^;]*;/,
  `export const SUPABASE_URL = '${supabaseUrl}';`
).replace(
  /export const SUPABASE_ANON_KEY =[^;]*;/,
  `export const SUPABASE_ANON_KEY = '${supabaseAnonKey}';`
)

// Write the updated config back
fs.writeFileSync(configPath, newConfig);

console.log(`Updated config.ts with SUPABASE_URL: ${supabaseUrl}`); 
console.log(`Updated config.ts with SUPABASE_ANON_KEY: ${supabaseAnonKey}`); 
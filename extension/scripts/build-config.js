const fs = require('fs');
const path = require('path');

// Read the current config file
const configPath = path.join(__dirname, '..', 'src', 'config.ts');
const config = fs.readFileSync(configPath, 'utf8');

// Get the environment variable or use default
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';

// Replace the placeholder with the actual URL
const newConfig = config.replace(
  /export const SUPABASE_URL = process\.env\.SUPABASE_URL \|\| '[^']*';/,
  `export const SUPABASE_URL = '${supabaseUrl}';`
);

// Write the updated config back
fs.writeFileSync(configPath, newConfig);

console.log(`Updated config.ts with SUPABASE_URL: ${supabaseUrl}`); 
import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from './supabaseDb.js';

async function setup() {
  console.log('Setting up admin tables...\n');

  // Test if tables exist by trying to query them
  const tables = ['store_packages', 'board_themes', 'token_styles'];

  for (const table of tables) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.log(`[ERROR] Table "${table}" error: ${error.message}`);
      console.log(`   You need to create this table in the Supabase SQL Editor.`);
    } else {
      console.log(`[OK] Table "${table}" exists (${data.length} rows found)`);
    }
  }

  console.log('\nNo default data inserted - create packages and boards from the admin panel.');

  console.log('\nDone!');
  process.exit(0);
}

setup();

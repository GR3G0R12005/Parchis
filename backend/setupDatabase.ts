import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabaseDb.js';

async function setupDatabase() {
  console.log('🔧 Setting up database schema...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'supabase_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📋 Executing schema...\n');

    // Execute the schema
    const { error } = await supabaseAdmin.rpc('exec', { sql: schema });

    if (error) {
      // Try splitting by semicolons and executing one by one
      console.log('⚠️  Full schema execution failed, trying individual statements...\n');

      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabaseAdmin.rpc('exec', { sql: statement });
          if (!stmtError) {
            successCount++;
            console.log('✓', statement.substring(0, 60) + '...');
          } else {
            errorCount++;
            console.log('⚠️', statement.substring(0, 60) + '... (Error: ' + stmtError.message + ')');
          }
        } catch (e: any) {
          errorCount++;
          console.log('⚠️', statement.substring(0, 60) + '... (Error: ' + e.message + ')');
        }
      }

      console.log(`\n📊 Results: ${successCount} successful, ${errorCount} failed/skipped\n`);
    } else {
      console.log('✅ Schema executed successfully!\n');
    }

    console.log('✅ Database setup complete!');
    console.log('\n⚡ Now run this to create the admin user:');
    console.log('   npx tsx createAdmin.ts\n');

    process.exit(0);

  } catch (e: any) {
    console.error('❌ Error:', e.message);
    console.error('\n📝 Note: The RPC method may not be available.');
    console.error('   Please execute the schema manually in Supabase Dashboard.');
    console.error('   Then run: npx tsx createAdmin.ts\n');
    process.exit(1);
  }
}

setupDatabase();

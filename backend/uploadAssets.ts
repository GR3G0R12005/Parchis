import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabaseDb.js';

async function uploadAssets() {
  try {
    console.log('📦 Starting asset upload to Supabase Storage...\n');

    // Create bucket if it doesn't exist
    const buckets = await supabaseAdmin.storage.listBuckets();
    const assetsBucketExists = buckets.data?.some(b => b.name === 'assets');

    if (!assetsBucketExists) {
      console.log('📁 Creating "assets" bucket...');
      await supabaseAdmin.storage.createBucket('assets', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      console.log('✅ Bucket created\n');
    } else {
      console.log('✅ Bucket already exists\n');
    }

    // Upload files
    const files = [
      {
        localPath: 'C:/Users/Angel/OneDrive/Documents/Trabajo-T-ECO/Ludo/frontend/public/assets/tablero.png',
        storagePath: 'boards/tablero.png',
        description: 'Main Parchís board',
      },
      {
        localPath: 'C:/Users/Angel/OneDrive/Documents/Trabajo-T-ECO/Ludo/frontend/public/assets/board.svg',
        storagePath: 'boards/board.svg',
        description: 'SVG board backup',
      },
      {
        localPath: 'C:/Users/Angel/OneDrive/Documents/Trabajo-T-ECO/Ludo/frontend/public/music/Parchis_Dreams.mp3',
        storagePath: 'music/Parchis_Dreams.mp3',
        description: 'Background music',
      },
      {
        localPath: 'C:/Users/Angel/OneDrive/Documents/Trabajo-T-ECO/Ludo/frontend/public/music/movimiento-fichas.mp3',
        storagePath: 'music/movimiento-fichas.mp3',
        description: 'Token movement sound',
      },
      {
        localPath: 'C:/Users/Angel/OneDrive/Documents/Trabajo-T-ECO/Ludo/frontend/public/music/movimiento-dados.mp3',
        storagePath: 'music/movimiento-dados.mp3',
        description: 'Dice roll sound',
      },
    ];

    for (const file of files) {
      const filePath = file.localPath;

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(file.storagePath);

      console.log(`📤 Uploading ${file.description}...`);

      const { error } = await supabaseAdmin.storage
        .from('assets')
        .upload(file.storagePath, fileBuffer, {
          upsert: true,
          contentType: getContentType(filePath),
        });

      if (error) {
        console.log(`❌ Failed: ${error.message}`);
      } else {
        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/assets/${file.storagePath}`;
        console.log(`✅ Uploaded: ${publicUrl}\n`);
      }
    }

    console.log('🎉 Asset upload complete!');
    console.log('\n📋 Update these URLs in your code:');
    console.log('   Board: /assets/boards/tablero.png');
    console.log('   Music: /assets/music/Parchisi_Dreams.mp3');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  return types[ext] || 'application/octet-stream';
}

uploadAssets();

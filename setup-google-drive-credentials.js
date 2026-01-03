#!/usr/bin/env node

/**
 * Helper script to extract Google Drive service account credentials
 * and add them to .env file
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔧 Google Drive Credentials Setup');
  console.log('================================\n');

  // Check if service account JSON file exists
  const possiblePaths = [
    'service-account.json',
    'google-service-account.json',
    'service-account-key.json',
    'gdrive-service-account.json',
  ];

  let serviceAccountPath = null;
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      serviceAccountPath = filePath;
      break;
    }
  }

  let clientEmail = null;
  let privateKey = null;

  if (serviceAccountPath) {
    console.log(`✅ Found service account file: ${serviceAccountPath}\n`);
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      if (serviceAccount.client_email && serviceAccount.private_key) {
        console.log('✅ Extracted credentials from service account file\n');
        clientEmail = serviceAccount.client_email;
        privateKey = serviceAccount.private_key;
      } else {
        console.log('⚠️  Service account file doesn\'t have client_email and private_key at root level\n');
      }
    } catch (error) {
      console.log(`❌ Error reading service account file: ${error.message}\n`);
    }
  }

  // If not found, ask user to provide credentials
  if (!clientEmail || !privateKey) {
    console.log('📝 Please provide Google Drive service account credentials:\n');
    
    if (!clientEmail) {
      clientEmail = await question('Enter GOOGLE_DRIVE_CLIENT_EMAIL (service account email): ');
    }
    
    if (!privateKey) {
      console.log('\nEnter GOOGLE_DRIVE_PRIVATE_KEY (full private key):');
      console.log('(Paste the entire key including BEGIN/END lines, press Enter twice when done)');
      const lines = [];
      let emptyLineCount = 0;
      
      while (true) {
        const line = await question('');
        if (line.trim() === '') {
          emptyLineCount++;
          if (emptyLineCount >= 2) break;
        } else {
          emptyLineCount = 0;
          lines.push(line);
        }
      }
      privateKey = lines.join('\n');
    }
  }

  if (!clientEmail || !privateKey) {
    console.log('\n❌ Credentials are required. Exiting.');
    rl.close();
    process.exit(1);
  }

  // Read existing .env file
  const envPath = '.env';
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if credentials already exist
  const hasClientEmail = envContent.includes('GOOGLE_DRIVE_CLIENT_EMAIL');
  const hasPrivateKey = envContent.includes('GOOGLE_DRIVE_PRIVATE_KEY');

  if (hasClientEmail || hasPrivateKey) {
    console.log('\n⚠️  Google Drive credentials already exist in .env');
    const overwrite = await question('Do you want to update them? (y/n): ');
    
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n✅ Keeping existing credentials.');
      rl.close();
      process.exit(0);
    }

    // Remove existing entries
    envContent = envContent
      .split('\n')
      .filter(line => 
        !line.trim().startsWith('GOOGLE_DRIVE_CLIENT_EMAIL') && 
        !line.trim().startsWith('GOOGLE_DRIVE_PRIVATE_KEY')
      )
      .join('\n');
  }

  // Format private key for .env (escape newlines)
  const formattedPrivateKey = privateKey
    .split('\n')
    .join('\\n')
    .replace(/"/g, '\\"');

  // Add credentials to .env
  const newCredentials = `
# Google Drive Service Account (for file uploads and downloads)
GOOGLE_DRIVE_CLIENT_EMAIL="${clientEmail}"
GOOGLE_DRIVE_PRIVATE_KEY="${formattedPrivateKey}"
`;

  // Append to .env
  envContent = envContent.trim() + '\n' + newCredentials;

  // Write back to .env
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('\n✅ Google Drive credentials added to .env file!');
  console.log('\n📋 Summary:');
  console.log(`   Client Email: ${clientEmail}`);
  console.log(`   Private Key: ${privateKey.substring(0, 50)}...`);
  console.log('\n🔄 Next Steps:');
  console.log('   1. Restart your server: killall -9 node && PORT=5001 npm run start:dev');
  console.log('   2. Test the download endpoint');
  console.log('   3. Check server logs for "Google Drive API initialized" message');

  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});


// Check what folders are accessible with the current OAuth token
const { google } = require('googleapis');
const fs = require('fs');

const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

async function checkAccessibleFolders() {
  try {
    console.log('🔍 Checking accessible Google Drive folders\n');
    
    // Load credentials and token
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    
    // Initialize OAuth2 client
    const { client_id, client_secret } = credentials.web;
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials(token);
    
    // Initialize Drive API
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // List all folders
    console.log('📁 Listing accessible folders...');
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id,name,webViewLink,parents)',
      pageSize: 20,
    });
    
    const folders = response.data.files;
    console.log(`\n✅ Found ${folders.length} accessible folders:\n`);
    
    folders.forEach((folder, index) => {
      console.log(`${index + 1}. ${folder.name}`);
      console.log(`   ID: ${folder.id}`);
      console.log(`   URL: ${folder.webViewLink}`);
      if (folder.parents && folder.parents.length > 0) {
        console.log(`   Parent: ${folder.parents[0]}`);
      }
      console.log('');
    });
    
    // Check if our target folder is in the list
    const targetFolderId = '1Amq5HzoVdKaRp0gtzIkKg4aibIexOePz';
    const targetFolder = folders.find(f => f.id === targetFolderId);
    
    if (targetFolder) {
      console.log('🎉 Target folder found in accessible folders!');
      console.log(`   Name: ${targetFolder.name}`);
      console.log(`   URL: ${targetFolder.webViewLink}`);
    } else {
      console.log('⚠️  Target folder not found in accessible folders.');
      console.log('   This might be because:');
      console.log('   1. The folder ID is incorrect');
      console.log('   2. The folder is not shared with the OAuth app');
      console.log('   3. The folder is in a different Google account');
    }
    
    // Also check root level files
    console.log('\n📄 Checking root level files...');
    const rootResponse = await drive.files.list({
      q: "parents in 'root'",
      fields: 'files(id,name,mimeType,webViewLink)',
      pageSize: 10,
    });
    
    const rootFiles = rootResponse.data.files;
    console.log(`Found ${rootFiles.length} items in root:\n`);
    
    rootFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.mimeType})`);
      console.log(`   ID: ${file.id}`);
      console.log(`   URL: ${file.webViewLink}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error checking folders:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 The token has expired. You need to refresh it.');
      console.log('   Run the OAuth setup again or use the OAuth Playground method.');
    }
  }
}

// Run the check
checkAccessibleFolders();

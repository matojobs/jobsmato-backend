// Create a new Jobsmato folder using OAuth and test upload
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

async function createJobsmatoFolder() {
  try {
    console.log('🏗️  Creating Jobsmato folder and testing upload\n');
    
    // Load credentials and token
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    
    // Initialize OAuth2 client
    const { client_id, client_secret } = credentials.web;
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials(token);
    
    // Initialize Drive API
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Create a new Jobsmato folder in root
    console.log('1. Creating Jobsmato folder...');
    const folderResponse = await drive.files.create({
      requestBody: {
        name: 'Jobsmato File Storage',
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id,name,webViewLink',
    });
    
    const folderId = folderResponse.data.id;
    console.log('✅ Successfully created Jobsmato folder!');
    console.log(`   Folder ID: ${folderId}`);
    console.log(`   Folder Name: ${folderResponse.data.name}`);
    console.log(`   Folder URL: ${folderResponse.data.webViewLink}\n`);
    
    // Create a subfolder for uploads
    console.log('2. Creating uploads subfolder...');
    const subfolderResponse = await drive.files.create({
      requestBody: {
        name: 'Uploads',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId],
      },
      fields: 'id,name,webViewLink',
    });
    
    console.log('✅ Successfully created uploads subfolder!');
    console.log(`   Subfolder ID: ${subfolderResponse.data.id}`);
    console.log(`   Subfolder URL: ${subfolderResponse.data.webViewLink}\n`);
    
    // Test file upload
    console.log('3. Testing file upload...');
    const testContent = 'This is a test file for Jobsmato OAuth integration.';
    const testFileResponse = await drive.files.create({
      requestBody: {
        name: 'test-upload.txt',
        parents: [subfolderResponse.data.id],
      },
      media: {
        mimeType: 'text/plain',
        body: testContent,
      },
      fields: 'id,name,webViewLink,size',
    });
    
    console.log('✅ Successfully uploaded test file!');
    console.log(`   File ID: ${testFileResponse.data.id}`);
    console.log(`   File URL: ${testFileResponse.data.webViewLink}\n`);
    
    // Clean up test file
    await drive.files.delete({
      fileId: testFileResponse.data.id,
    });
    console.log('✅ Test file cleaned up\n');
    
    console.log('🎉 Jobsmato folder setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   📁 Main Folder ID: ${folderId}`);
    console.log(`   📁 Main Folder URL: ${folderResponse.data.webViewLink}`);
    console.log(`   📁 Uploads Subfolder ID: ${subfolderResponse.data.id}`);
    console.log(`   📁 Uploads Subfolder URL: ${subfolderResponse.data.webViewLink}`);
    console.log('\n💡 Update your upload service to use this folder ID:');
    console.log(`   TARGET_FOLDER_ID = '${folderId}'`);
    
    // Save the folder ID to a config file
    const config = {
      folderId: folderId,
      uploadsSubfolderId: subfolderResponse.data.id,
      folderUrl: folderResponse.data.webViewLink,
      uploadsUrl: subfolderResponse.data.webViewLink,
      createdAt: new Date().toISOString()
    };
    
    const configPath = path.join(__dirname, '..', 'config', 'jobsmato-folder-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('\n✅ Configuration saved to config/jobsmato-folder-config.json');
    
    return config;
    
  } catch (error) {
    console.error('❌ Error creating Jobsmato folder:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 The token has expired. You need to refresh it.');
      console.log('   Please run the OAuth setup again.');
    }
    
    return null;
  }
}

// Run the setup
createJobsmatoFolder();

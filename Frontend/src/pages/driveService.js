const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

const KEY_FILE_PATH = path.join(__dirname, '../service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const uploadToDrive = async (backupData, type = 'manual') => {
  if (!fs.existsSync(KEY_FILE_PATH)) {
    throw new Error('service-account.json not found in Backend folder');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });

  // Filename includes type (daily, weekly, monthly)
  const filename = `backup-${type}-${new Date().toISOString().split('T')[0]}.json`;
  const fileContent = JSON.stringify(backupData, null, 2);

  // Create a stream from the string
  const stream = new Readable();
  stream.push(fileContent);
  stream.push(null);

  const fileMetadata = {
    name: filename,
    mimeType: 'application/json',
  };

  const media = {
    mimeType: 'application/json',
    body: stream,
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name',
  });

  return response.data;
};

module.exports = { uploadToDrive };
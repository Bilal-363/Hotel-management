const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

const KEY_FILE_PATH = path.join(__dirname, '../service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const deleteOldBackups = async (drive, type, newFileId) => {
  try {
    // Find all files of this type (daily/weekly/monthly) excluding the one we just created
    const response = await drive.files.list({
      q: `name contains 'backup-${type}-' and mimeType = 'application/json' and trashed = false and not id = '${newFileId}'`,
      fields: 'files(id, name)',
    });

    const files = response.data.files;
    if (files && files.length > 0) {
      console.log(`Cleaning up ${files.length} old ${type} backups...`);
      for (const file of files) {
        try {
          await drive.files.delete({ fileId: file.id });
          console.log(`Deleted old backup: ${file.name}`);
        } catch (e) {
          console.error(`Failed to delete ${file.name}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error.message);
  }
};

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

  // If this is an automated backup (daily/weekly/monthly), delete older versions
  if (type !== 'manual') {
    await deleteOldBackups(drive, type, response.data.id);
  }

  return response.data;
};

const listBackups = async () => {
  if (!fs.existsSync(KEY_FILE_PATH)) {
    throw new Error('service-account.json not found in Backend folder');
  }
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: SCOPES });
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    q: "name contains 'backup-' and mimeType = 'application/json' and trashed = false",
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
    pageSize: 20
  });
  return response.data.files;
};

const getFileContent = async (fileId) => {
  if (!fs.existsSync(KEY_FILE_PATH)) throw new Error('service-account.json not found');
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: SCOPES });
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
  return response.data;
};

const isDriveConfigured = () => {
  return fs.existsSync(KEY_FILE_PATH);
};

module.exports = { uploadToDrive, listBackups, getFileContent, isDriveConfigured };
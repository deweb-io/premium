// Handle files stored on Google Cloud Storage.
const dotenv = require('dotenv');
const storage = require('@google-cloud/storage');

dotenv.config();

const bucket = new storage.Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
}).bucket(process.env.GCP_BUCKET_NAME);

const getPublicUrl = (path) => `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${path}`;
const getSignedUrl = async(path) => (await bucket.file(path).getSignedUrl({
    action: 'read', expires: Date.now() + 5 * 60 * 1000
}))[0];

exports = module.exports = {getPublicUrl, getSignedUrl};

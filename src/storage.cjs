const storage = require('@google-cloud/storage');
const dotenv = require('dotenv');

dotenv.config();

// GOOGLE_APPLICATION_CREDENTIALS must be a secret environment variable.
exports.bucket = new storage.Storage({projectId: process.env.GCP_PROJECT_ID,
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)}).bucket(process.env.GCP_BUCKET_NAME);

exports.uploadHandler = async(file) => {
    return new Promise((resolve, reject) => {
        const gcsFile = exports.bucket.file(`videbate/${file.originalname}`);
        const stream = gcsFile.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });
        stream.on('error', (err) => {
            reject(err);
        });

        stream.on('finish', (err) => {
            resolve(`file ${file.originalname} uploaded to google cloud storage`);
        });

        stream.end(file.buffer);
    });
};

// Interface with external multi-vendor/tenant marketplace.
const jwt = require('fast-jwt');

const db = require('./db.cjs');
const storage = require('./storage.cjs');

// TODO: Get public key from https://www.googleapis.com/oauth2/v3/certs, cache it, and turn this into a verifier.
const verifyAuth = jwt.createDecoder();

// TODO: Check product permissions - throw an error on failure.
const checkProductPermissions = async(product, authToken) => {
    const auth = verifyAuth(authToken);
    console.warn(`not verifying user ${auth.email} has access to product ${product.path}`);
};

const getProduct = async(filePath, authToken) => {
    const product = await db.getProduct(filePath);
    product.previewUrl = storage.getPublicUrl(product.preview);
    try {
        await checkProductPermissions(product, authToken);
        product.signedUrl = await storage.getSignedUrl(filePath);
    } catch(_) {
        // Ignore.
    }
    return product;
};

exports = module.exports = {getProduct};

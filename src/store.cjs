// Interface with external multi-vendor/tenant marketplace.
const db = require('./db.cjs');
const storage = require('./storage.cjs');

// TODO: Implement token validation.
const validateToken = (token) => true;

// TODO: Check product permissions.
const checkProductPermissions = (product, authToken) => true;

const getProduct = async(filePath, authToken) => {
    const product = await db.getProduct(filePath);
    product.previewUrl = storage.getPublicUrl(product.preview);
    if(validateToken(authToken) && checkProductPermissions(product, authToken)) {
        product.signedUrl = await storage.getSignedUrl(filePath);
    }
    return product;
};

exports = module.exports = {getProduct};

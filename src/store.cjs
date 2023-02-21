// Interface with external multi-vendor/tenant marketplace.
const axios = require('axios');
const jwt = require('fast-jwt');
const wooCommerceApi = require('@woocommerce/woocommerce-rest-api');

const db = require('./db.cjs');
const storage = require('./storage.cjs');

// Get the configuration from the environment.
const wooCommerce = new wooCommerceApi.default({
    url: 'https://subbscribe.com',
    consumerKey: 'ck_04c6b43ee315c573ad8219a2f09eebb9929cd73b',
    consumerSecret: 'cs_c1ab3443f5ffbb8fd8e6977c7b95b8d2afe265e5',
    wpAPI: true,
    version: 'wc/v3'
});

const JWT_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Verify the auth token and return the decoded data.
const verifyAuth = async(authToken) => jwt.createVerifier({
    key: (await axios.get(JWT_CERTS_URL)).data[
        jwt.createDecoder({complete: true})(authToken).header.kid
    ]
})(authToken);

// Check if a product has been purchased by a user.
const checkPurchase = async(wooCommerceProductId, wordpressUserId) => (await wooCommerce.get('orders', {
    product: wooCommerceProductId,
    customer: wordpressUserId,
    status: 'completed'
})).data.length > 0;

// Get product information by slug, adding a signedUrl if the user has purchased it.
const getProduct = async(slug, authToken) => {
    const product = (await wooCommerce.get('products', {slug})).data[0];
    if(!product) {
        const error = new Error(`no product with slug ${slug}`);
        error.statusCode = 404;
        throw error;
    }

    let user;
    try {
        user = await verifyAuth(authToken);

        // TODO: Get wordpress user id from the auth token data.
        // For now it just checks if the user is me.
        if(user.blockchainId.indexOf('3950249048075650071') === -1) {
            throw new Error('not me');
        }
        user.id = '231779357';
    } catch(_) {
        user = {id: 0};
    }

    // Should be replaced with actual GCS path (and preview!) from the product.
    const filePath = 'videbate/video.mp4';

    const dbProduct = await db.getProduct(filePath);
    if(await checkPurchase(product.id, user.id)) {
        dbProduct.signedUrl = await storage.getSignedUrl(filePath);
    } else {
        dbProduct.previewUrl = await storage.getPublicUrl(dbProduct.preview);
    }

    return dbProduct;
};

exports = module.exports = {getProduct, wooCommerce};

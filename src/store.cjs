// Interface with external multi-vendor/tenant marketplace.
const axios = require('axios');
const jwt = require('fast-jwt');
const ssh = require('ssh2');
const wooCommerceApi = require('@woocommerce/woocommerce-rest-api');

const db = require('./db.cjs');
const storage = require('./storage.cjs');

const STORE_BASE_URL = 'https://subbscribe.com';
const JWT_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const WOOCOMMERCE_CONSUMER_KEY = 'ck_ab50535052f77c85ea2693c79eb43bc76d4df7ff';
const WOOCOMMERCE_CONSUMER_SECRET = 'cs_31c8abf18a9b06acf3932accb26b47381287034b';
const WOOCOMMERCE_API_VERSION = 'wc/v3';
const WORDPRESS_ADMIN_USERNAME = 'bbsmanager';
const WORDPRESS_ADMIN_PASSWORD = 'verysecretpas';

// An http status code aware error.
const HttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// Get the configuration from the environment.
const wooCommerce = new wooCommerceApi.default({
    url: STORE_BASE_URL,
    consumerKey: WOOCOMMERCE_CONSUMER_KEY,
    consumerSecret: WOOCOMMERCE_CONSUMER_SECRET,
    version: WOOCOMMERCE_API_VERSION,
    wpAPI: true
});

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
        throw HttpError(404, `no product with slug ${slug}`);
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

// Upsert a bbs user as a WooCommerce customer.
const upsertUser = async(authToken) => {
    let bbsUser;
    try {
        bbsUser = await verifyAuth(authToken);
    } catch(_) {
        throw HttpError(401, 'unauthorized');
    }

    const commonId = bbsUser.blockchainId[0];

    let wooCommerceUser = await wooCommerce.get('customers', {username: commonId});
    if(wooCommerceUser.data.length === 1) {
        wooCommerceUser = wooCommerceUser.data[0];
    } else {
        wooCommerceUser = (await wooCommerce.post('customers', {
            email: `${commonId}@bbs.network`,
            username: commonId,
            password: Math.random().toString(36).slice(-8)
        })).data;
    }
    return wooCommerceUser;
};

// Get a one-time login link for a user, creating the user if he doesn't exist.
// Requires the one-time-login plugin to be installed on the wordpress site.
// https://github.com/danielbachhuber/one-time-login
const getLoginUrl = async(authToken, redirectUrl) => {
    const wooCommerceUser = await upsertUser(authToken);
    return new Promise((resolve, reject) => {
        const connection = new ssh.Client();
        connection.on('ready', () => {
            connection.exec(`wp user one-time-login ${wooCommerceUser.email}`, (error, stream) => {
                if(error) {
                    return reject(error);
                }
                let output = '';
                stream.on('close', (code, signal) => {
                    connection.end();
                    resolve(`${output}&redirect_to=${encodeURIComponent(redirectUrl)}`);
                }).on('data', (data) => {
                    output += data;
                }).stderr.on('data', (data) => {
                    reject(new Error(`ssh command returned an error: ${data}`));
                });
            });
        }).connect({
            host: 'sftp.wp.com',
            port: 22,
            username: 'subbscribecom.wordpress.com',
            password: 'ax6oan9jsGaI3uqiVBmk'
        });
    });
};

exports = module.exports = {getProduct, getLoginUrl, wooCommerce};

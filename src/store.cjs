// Interface with external multi-vendor/tenant marketplace.
const axios = require('axios');
const jwt = require('fast-jwt');
const wooCommerceApi = require('@woocommerce/woocommerce-rest-api');

const db = require('./db.cjs');
const storage = require('./storage.cjs');

// Get the configuration from the environment.
const STORE_BASE_URL = process.env.STORE_BASE_URL;
const JWT_CERTS_URL = process.env.JWT_CERTS_URL;
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
const WOOCOMMERCE_API_VERSION = 'wc/v3';

// An http status code aware error.
const HttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// Initialize the WooCommerce API only when required, because it slows down local development.
const wooCommerce = new Proxy({}, {get(target, property) {
    return (target.wooCommerceCache ? target.wooCommerceCache : (target.wooCommerceCache = new wooCommerceApi.default({
        url: STORE_BASE_URL,
        consumerKey: WOOCOMMERCE_CONSUMER_KEY,
        consumerSecret: WOOCOMMERCE_CONSUMER_SECRET,
        version: WOOCOMMERCE_API_VERSION,
        wpAPI: true
    })))[property];
}});

// Verify the auth token and return the decoded data.
const verifyAuth = async(authToken) => {
    try {
        return jwt.createVerifier({
            key: (await axios.get(JWT_CERTS_URL)).data[
                jwt.createDecoder({complete: true})(authToken).header.kid
            ]
        })(authToken).blockchainId[0];
    } catch(_) {
        throw HttpError(401, 'invalid auth token');
    }
};

// Get a WooCommerce customer by BBS ID that is the email.
const getCustomer = async(bbsId) => {
    const customers = (await wooCommerce.get('customers', {email: `${bbsId}@bbs.network`})).data;
    if(customers.length === 0) {
        throw HttpError(404, `no customer with BBS ID ${bbsId}`);
    }
    return customers[0];
};

// Get a WooCommerce product by slug.
const getProduct = async(slug) => {
    const products = (await wooCommerce.get('products', {slug})).data;
    if(products.length === 0) {
        throw HttpError(404, `no product with slug ${slug}`);
    }
    return products[0];
};

// Check if a product has been purchased by a user.
const checkPurchase = async(wooCommerceProductId, wooCommerceCustomerId) => (await wooCommerce.get('orders', {
    product: wooCommerceProductId,
    customer: wooCommerceCustomerId,
    status: 'completed'
})).data.length > 0;

// Get product access information by slug.
const getProductAccess = async(slug, authToken) => {
    let product = await getProduct(slug);

    // Should be replaced with actual GCS path (and preview!) from the product.
    const filePath = 'videbate/video.mp4';
    product = {...product, ...(await db.getProduct(filePath))};

    try {
        const customer = await getCustomer(await verifyAuth(authToken));
        if(await checkPurchase(product.id, customer.id)) {
            product.signedUrl = await storage.getSignedUrl(filePath);
        } else {
            throw new Error('unauthorized');
        }
    } catch(_) {
        product.previewUrl = await storage.getPublicUrl(product.preview);
    }

    return product;
};

// Upsert a bbs user as a WooCommerce customer with a fresh password.
const upsertUser = async(authToken) => {
    let username;
    try {
        username = await verifyAuth(authToken);
    } catch(_) {
        throw HttpError(401, 'unauthorized');
    }

    const password = Math.random().toString(36).slice(-8);
    let customer;
    try {
        customer = await getCustomer(username);
        customer.password = password;
    } catch(_) {
        customer = (await wooCommerce.post('customers', {
            username, password, email: `${username}@bbs.network`
        })).data;
    }
    if(customer.password === password) {
        await wooCommerce.put(`customers/${customer.id}`, {password});
    } else {
        customer.password = password;
    }

    return customer;
};

// Get a one-time login link for a user, creating the user if he doesn't exist.
// If the auth token is invalid returns the product page.
// Requires the simple-JWT-login plugin to be installed on the wordpress site.
// https://wordpress.org/plugins/simple-jwt-login/
const getLoginUrl = async(slug, authToken) => {
    try {
        const customer = await upsertUser(authToken);
        const token = (await axios.post(`${STORE_BASE_URL}/?rest_route=/simple-jwt-login/v1/auth`, {
            username: customer.username, password: customer.password
        })).data.data.jwt;
        return [
            `${STORE_BASE_URL}/?rest_route=/simple-jwt-login/v1/autologin&JWT=${token}`,
            `&redirectUrl=${encodeURIComponent(`${STORE_BASE_URL}/product/${slug}`)}`
        ].join('');
    } catch(_) {
        return `${STORE_BASE_URL}/product/${slug}`;
    }
};

exports = module.exports = {getProductAccess, getLoginUrl, wooCommerce};

// Interface with external multi-vendor/tenant marketplace.
const axios = require('axios');
const jwt = require('fast-jwt');
const wooCommerceApi = require('@woocommerce/woocommerce-rest-api');

// Get the configuration from the environment.
const STORE_BASE_URL = process.env.STORE_BASE_URL;
const JWT_CERTS_URL = process.env.JWT_CERTS_URL;
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
const WOOCOMMERCE_API_VERSION = 'wc/v3';

const SUBSCRIPTION_NAME_DELIMITER = '_';

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
    if(process.env.JWT_POLICY === 'fake') {
        console.warn('not verifying JWT');
        return authToken;
    }
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
    // Might need to support other roles in the future
    // https://woocommerce.com/posts/a-guide-to-woocommerce-user-roles-permissions-and-security/
    const customers = (await wooCommerce.get('customers', {email: `${bbsId}@bbs.network`})).data;
    if(customers.length === 0) {
        throw HttpError(404, `no customer with BBS ID ${bbsId}`);
    }
    return customers[0];
};

// Extract the relevant data from a WooCommerce product.
// This function also validates the data, because if there is anything missing we will get an error.
const extractProductData = (product) => {
    const productDataBase = {
        id: product.id, slug: product.slug, permalink: product.permalink,
        image: product.images[0].src
    };

    // if the product is part of a subscription, extract the subscription slug and file.
    if(product.slug.indexOf(SUBSCRIPTION_NAME_DELIMITER) > -1) {
        productDataBase['subscriptionSlug'] = product.slug.slice(0, product.slug.indexOf(SUBSCRIPTION_NAME_DELIMITER));
        productDataBase['file'] = product.downloads[0].file;
    }

    return productDataBase;
};

// Get a WooCommerce product by slug.
const getProduct = async(slug) => {
    const products = (await wooCommerce.get('products', {slug})).data;
    if(products.length === 0) {
        throw HttpError(404, `no product with slug ${slug}`);
    }
    try {
        return extractProductData(products[0]);
    } catch(_) {
        throw HttpError(406, `invalid product with slug ${slug}`);
    }
};

// Check if a product has been purchased by a user.
const checkPurchase = async(wooCommerceProductId, wooCommerceCustomerId) => {
    const orders = (await wooCommerce.get('orders', {
        product: wooCommerceProductId, customer: wooCommerceCustomerId, status: 'completed'
    })).data;
    let orderId;
    try {
        orderId = orders[0].id;
    } catch(_) {
        return false;
    }

    // Validate subscription is active.
    // Note: the api doesn't filter by parent_id as expected, so we have to do it manually.
    const activeSubscriptions = (await wooCommerce.get('subscriptions', {'status': 'active'})).data;
    return (activeSubscriptions.filter((subscription) => subscription.parent_id === orderId)).length > 0;
};

// Get product information by slug, taking access into account
// (i.e. removing private data if the user hasn't purchased the product).
// Note: this only checks for purchases of the subscription, not the individual product.
const getProductAccess = async(slug, authToken) => {
    const [product, bbsId] = await Promise.all([getProduct(slug), verifyAuth(authToken)]);
    try {
        if(!product.subscriptionSlug) {
            throw new Error(`slug ${slug} is not part of a subscription`);
        }
        const [subscription, customer] = await Promise.all([getProduct(product.subscriptionSlug), getCustomer(bbsId)]);
        if(!await checkPurchase(subscription.id, customer.id)) {
            throw new Error('unauthorized');
        }
    } catch(_) {
        delete product.file;
    }
    return {...product};
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

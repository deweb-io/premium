// Fastify routes.
const fs = require('fs');

const db = require('./db.cjs');
const store = require('./store.cjs');

const parcelTemplate = fs.readFileSync('./site/premium.js.template', 'utf8');

module.exports = async(fastify, _) => {
    // Setup CORS.
    fastify.register(require('@fastify/cors'), {origin: 'http://localhost:3000'});

    // Configure swagger if needed.
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(require('@fastify/swagger'), {swagger: {info: {
            title: 'Premium', description: fs.readFileSync('./README.md', 'utf8'), version: '0.1.0'
        }}});
        await fastify.register(require('@fastify/swagger-ui'), {routePrefix: '/doc'});
    }

    // A health check - let's make it a bit more thorough.
    fastify.get('/health', async(_, response) => await db.health());

    // A helper function to register routes with optional trailing slashes.
    const optionalTrailingSlash = (method, path, schema, handler) => ['', '/'].forEach((suffix) => {
        fastify[method](`${path}${suffix}`, {schema}, handler);
    });

    // Return a product player for a given slug.
    optionalTrailingSlash('get', '/product/:slug', {schema: {
        params: {slug: {type: 'string'}}
    }}, async(request, response) => response.type('application/javascript').send(parcelTemplate.replace(
        'const slug = null;', `const slug = '${request.params.slug}';`).replace(
        'const premiumServer = null;', `const premiumServer = '${process.env.PREMIUM_SERVICE_ENDPOINT}';`)
    ));


    // Get product details for a given slug and auth token (which will include a signed URL if authorized).
    optionalTrailingSlash('post', '/product/:slug', {schema: {
        params: {slug: {type: 'string'}},
        body: {type: 'object', properties: {authToken: {type: 'string'}}}
    }}, async(request, response) => response.send(
        await store.getProductAccess(request.params.slug, request.body.authToken)
    ));

    // Get a one-time login URL for a given auth token and product slug to redirect to after login.
    optionalTrailingSlash('post', '/login/:slug', {schema: {
        params: {slug: {type: 'string'}},
        body: {type: 'object', properties: {authToken: {type: 'string'}}}
    }}, async(request, response) => response.send(JSON.stringify({
        url: await store.getLoginUrl(request.params.slug, request.body.authToken)
    })));

    // A route for static serving files from the `site` directory - will be removed in production.
    fastify.get('/site/:path', async(request, response) => {
        const path = `/site/${request.params.path}`;
        try {
            const content = fs.readFileSync(`.${path}`, 'utf8');
            if(path.endsWith('.js')) response.type('application/javascript');
            else if(path.endsWith('.html')) response.type('text/html');
            else throw new Error('unknown file type');
            return response.send(content);
        } catch(_) {
            return response.code(404).type('text/plain').send('file not found');
        }
    });
};

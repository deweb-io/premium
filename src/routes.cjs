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

    // Return a player for a given filePath.
    fastify.get('/player', {
        schema: {querystring: {filePath: {type: 'string'}}}
    }, async(request, response) => response.type('application/javascript').send(parcelTemplate.replace(
        'const filePath = null;', `const filePath = '${request.query.filePath}';`
    )));

    // Get product details for a given filePath and auth token (which will include a signed URL if authorized).
    fastify.post('/productDetails', {
        schema: {body: {type: 'object', properties: {filePath: {type: 'string'}, authToken: {type: 'string'}}}}
    }, async(request, response) => response.send(
        await store.getProduct(request.body.filePath, request.body.authToken)
    ));

    // A route for static serving files from the `site` directory.
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

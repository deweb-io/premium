const fs = require('fs');

const db = require('./db.cjs');

module.exports = async(fastify, _) => {
    // Configure swagger if needed.
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(require('@fastify/swagger'), {swagger: {info: {
            title: 'Premium', description: fs.readFileSync('./README.md', 'utf8'), version: '0.1.0'
        }}});
        await fastify.register(require('@fastify/swagger-ui'), {routePrefix: '/doc'});
    }

    // A health check - let's make it a bit more thorough.
    fastify.get('/health', async(_, reply) => await db.health());

    // A route for static serving files from the `site` directory.
    fastify.get('/site/:fileName', async(request, response) => {
        const path = `/site/${request.params.fileName}`;
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

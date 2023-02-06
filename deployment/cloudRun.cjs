const Fastify = require('fastify');

const routes = require('../src/routes.cjs');

(async function() {
    // We always use these values for Cloud Run - deployment will fail otherwise.
    const host = '0.0.0.0';
    const port = process.env.PORT;
    try {
        const fastify = new Fastify({logger: {level: process.env.FASTIFY_LOG_LEVEL}, trustProxy: true});
        await fastify.register(routes);
        const address = await fastify.listen({host, port});
        console.log(`Listening on ${address}`);
    } catch(error) {
        console.error(error);
        process.exit(1);
    }
})();

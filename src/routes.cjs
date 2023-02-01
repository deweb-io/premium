const fs = require('fs');

const multer = require('fastify-multer');

const db = require('./db.cjs');
const storage = require('./storage.cjs');

const uploadPreHandler = multer({storage: multer.memoryStorage()});

module.exports = async(fastify, _) => {
    // Configure swagger if needed.
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(require('@fastify/swagger'), {swagger: {info: {
            title: 'Videbate', description: fs.readFileSync('./README.md', 'utf8'), version: '0.1.0'
        }}});
        await fastify.register(require('@fastify/swagger-ui'), {routePrefix: '/doc'});
    }

    // Configure multipart/form-data parser
    await fastify.register(multer.contentParser);

    // A health check - let's make it a bit more thorough.
    fastify.get('/health', async(_, reply) => await db.health());

    // Create a new post.
    fastify.post('/new', {
        schema: {body: {type: 'object', properties: {
            id: {type: 'array', items: {type: 'string'}},
            videoUrl: {type: 'string'}
        }}}
    }, async(request, response) => response.code(201).send(await db.addPost(request.body.id, request.body.videoUrl)));

    // Get a post as JSON.
    fastify.get('/post/:partialPostId', {
        schema: {params: {type: 'object', properties: {partialPostId: {type: 'array', items: {type: 'string'}}}}}
    }, async(request, response) => response.send(
        // Post IDs are arrays, and as such are encoded as comma-separated strings in the URL.
        await db.getEnrichedPost(request.params.partialPostId[0].split(','))
    ));

    // Upload a video
    fastify.post('/upload', {preHandler: uploadPreHandler.single('video')}, async(request, response) => {
        const file = request.file;
        if(!file) {
            return response.status(400).type('text/plain').send('no file provided');
        }
        try {
            response.status(201).send(await storage.uploadHandler(file));
        } catch(error) {
            console.error(error);
            return response.status(500).send(error);
        }
    });

    // A route for static serving files from the `site` directory.
    fastify.get('/site/:fileName', async(request, response) => {
        const path = `/site/${request.params.fileName}`;
        try {
            const content = fs.readFileSync(`.${path}`, 'utf8');
            if(path.endsWith('.js')) response.type('application/javascript');
            else if(path.endsWith('.css')) response.type('text/css');
            else if(path.endsWith('.html')) response.type('text/html');
            else throw new Error('unknown file type');
            return response.send(content);
        } catch(_) {
            return response.code(404).type('text/plain').send('file not found');
        }
    });
};

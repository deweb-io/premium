const expect = require('chai').expect;

describe('Database', () => {
    require('dotenv').config();
    process.env.PGDATABASE = `${process.env.PGDATABASE}_test`;
    const db = require('./db.cjs');

    beforeEach(async() => {
        const consoleWarn = console.warn;
        console.warn = () => {};
        await db.refreshDatabase();
        console.warn = consoleWarn;
    });

    it('Health check', async() => {
        expect((await db.health())).to.equal('OK');
    });

    it('Product retrieval', async() => {
        try {
            await db.getProduct('nosuchpath');
            expect.fail();
        } catch(error) {
            expect(error.message).to.equal('no product with path nosuchpath');
        }

        const filePath = 'path/to/file';
        await db.psql`INSERT INTO files (path, type, preview) VALUES (
            ${filePath}, 'type', 'preview'
        )`;
        expect((await db.getProduct(filePath)).path).to.equal(filePath);
    });
});

describe('Storage', () => {
    it('getPublicUrl', () => {
        const storage = require('./storage.cjs');
        expect(storage.getPublicUrl('test')).to.equal(
            'https://storage.googleapis.com/creator-eco-stage.appspot.com/test'
        );
    });
    it('getSignedUrl', async() => {
        const storage = require('./storage.cjs');
        const signedUrl = await storage.getSignedUrl('test');
        expect(signedUrl.length).to.be.greaterThan(32);
    });
});

describe('Store', async() => {
    const store = require('./store.cjs');

    it('Product retrieval', async() => {
        // Mock storage.
        const storage = require('./storage.cjs');
        const originalGetPublicUrl = storage.getPublicUrl;
        const originalGetSignedUrl = storage.getSignedUrl;
        storage.getPublicUrl = () => 'publicUrl';
        storage.getSignedUrl = () => 'signedUrl';

        // Mock db.
        const db = require('./db.cjs');
        const originalGetProduct = db.getProduct;
        db.getProduct = () => ({
            path: 'path',
            created: 'created',
            updated: 'updated',
            type: 'type',
            preview: 'preview'
        });
        expect((await store.getProduct('test'))).to.deep.equal({
            path: 'path',
            created: 'created',
            updated: 'updated',
            type: 'type',
            preview: 'preview',
            previewUrl: 'publicUrl',
            signedUrl: 'signedUrl'
        });

        // Undo mocks (we should use a sandbox).
        storage.getPublicUrl = originalGetPublicUrl;
        storage.getSignedUrl = originalGetSignedUrl;
        db.getProduct = originalGetProduct;
    });
});

describe('Web server', () => {
    let server;
    const filePath = 'a test/file/path';

    before(async() => {
        // Run with swagger.
        process.env.FASTIFY_SWAGGER = 'true';
        server = require('fastify')({logger: false});
        server.register(require('./routes.cjs'));
    });

    it('Static endpoints', async() => {
        let response;
        response = await server.inject({method: 'GET', url: '/nosuchpath'});
        expect(response.statusCode).to.equal(404);
        response = await server.inject({method: 'GET', url: '/site/nosuchpath'});
        expect(response.statusCode).to.equal(404);

        // Mock fs to check for filetypes that don't exist in the site directory by default.
        const fs = require('fs');
        const oldReadFileSync = fs.readFileSync;
        fs.readFileSync = () => 'content';

        response = await server.inject({method: 'GET', url: '/site/test.js'});
        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-type']).to.equal('application/javascript');

        response = await server.inject({method: 'GET', url: '/site/file.nosuckextension'});
        expect(response.statusCode).to.equal(404);

        fs.readFileSync = oldReadFileSync;

        response = await server.inject({method: 'GET', url: '/site/dev.html'});
        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-type']).to.equal('text/html');
    });

    it('Health endpoint', async() => {
        const healthResponse = await server.inject({method: 'GET', url: '/health'});
        expect(healthResponse.statusCode).to.equal(200);
    });

    it('Player endpoint', async() => {
        const playerResponse = await server.inject({method: 'GET', url: `/player?filePath=${filePath}`});
        expect(playerResponse.statusCode).to.equal(200);
        expect(playerResponse.body).to.contain(`const filePath = '${filePath}';`);
    });

    it('Product details endpoint', async() => {
        const authToken = 'an auth token';
        let detailsResponse = await server.inject({
            method: 'POST', url: '/productDetails', payload: {filePath, authToken}
        });
        expect(detailsResponse.statusCode).to.equal(404);
        const store = require('./store.cjs');
        const oldGetProduct = store.getProduct;
        store.getProduct = () => ({});
        detailsResponse = await server.inject({
            method: 'POST', url: '/productDetails', payload: {filePath, authToken}
        });
        expect(detailsResponse.statusCode).to.equal(200);
        expect(detailsResponse.headers['content-type'].startsWith('application/json')).to.be.true;
        store.getProduct = oldGetProduct;
    });

    it('Player endpoint', async() => {
        const playerResponse = await server.inject({method: 'GET', url: `/player?filePath=${filePath}`});
        expect(playerResponse.statusCode).to.equal(200);
        expect(playerResponse.headers['content-type'].startsWith('application/javascript')).to.be.true;
        expect(playerResponse.body).to.contain(`const filePath = '${filePath}';`);
    });
});

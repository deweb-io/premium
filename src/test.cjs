const expect = require('chai').expect;

describe('Database dependant tests', () => { // We should mock the database for any non-db tests.
    require('dotenv').config();
    process.env.PGDATABASE = `${process.env.PGDATABASE}_test`;
    const db = require('./db.cjs');

    beforeEach(async() => {
        const consoleWarn = console.warn;
        console.warn = () => {};
        await db.refreshDatabase();
        console.warn = consoleWarn;
    });

    describe('Testing database', () => {
        it('Health check', async() => {
            expect((await db.health())).to.equal('OK');
        });
    });

    describe('Testing Web server', () => {
        let server;

        before(async() => {
            // Run with swagger.
            process.env.FASTIFY_SWAGGER = 'true';
            server = require('fastify')({logger: false});
            server.register(require('./routes.cjs'));
        });

        it('Health endpoint', async() => {
            const healthResponse = await server.inject({method: 'GET', url: '/health'});
            expect(healthResponse.statusCode).to.equal(200);
        });

        it('Static endpoints', async() => {
            let response;
            response = await server.inject({method: 'GET', url: '/nosuchpath'});
            expect(response.statusCode).to.equal(404);
            response = await server.inject({method: 'GET', url: '/site/nosuchpath'});
            expect(response.statusCode).to.equal(404);

            // Mock fs to check for unsupported file types.
            const fs = require('fs');
            const oldReadFileSync = fs.readFileSync;
            fs.readFileSync = () => 'content';
            response = await server.inject({method: 'GET', url: '/site/file.nosuckextension'});
            expect(response.statusCode).to.equal(404);
            fs.readFileSync = oldReadFileSync;

            response = await server.inject({method: 'GET', url: '/site/dev.html'});
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-type']).to.equal('text/html');
            response = await server.inject({method: 'GET', url: '/site/premium.js'});
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-type']).to.equal('application/javascript');
        });
    });
});

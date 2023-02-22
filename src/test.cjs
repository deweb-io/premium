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
    const storage = require('./storage.cjs');

    it('getPublicUrl', () => {
        expect(storage.getPublicUrl('test')).to.equal(
            'https://storage.googleapis.com/creator-eco-stage.appspot.com/test'
        );
    });

    it('getSignedUrl', async() => {
        const signedUrl = await storage.getSignedUrl('test');
        expect(signedUrl.length).to.be.greaterThan(32);
    });
});

describe('Mocked product retrieval', async() => {
    const store = require('./store.cjs');
    const jwt = require('fast-jwt');
    // Create an auth token.
    const asymPrivateKey = `
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCNvlu+AxbgkwfO
Kkyunjx2BrpamPin7PO+wKIQc1RU8390t9ebmhKfdCHQ573V1n/yeW7i0xrWvGc3
gku7nNmxAIafflaTX1DCTw6hsFTHsXtUoIJZUFTrMZjmNp1jAibUfIQdUDmztwsq
Fp7F+FQMoV5LzLSLuIZBiApJVA3OstpkEXgr0Alr1HKvSk4dZpY7xAGmNrBHTxQb
ps8Lp/vsY/Y9RuFCSv8uyTUMsLmn5HgGHTwUFOIkTBtkRniHbIicX7PhxbH9D+ZJ
TNl4LzbMrZIxu15KsK7leG+1soJr40l8KB5XFJBgGZqEf8DZX3pFkhN8B74o6rVX
22ckHhrTAgMBAAECggEAFv/OTxSdP69b0t4WNzdBxDzvPAgaQNU377m+EkFEa8xe
4Ad8mqjzYKAtZIJV0T7O3/9IONHcRv+nF+CyfSzEPe5B6dtMHPmYVw8Q5rd/6i8o
PeEVhXx9avRPRPuTqh8NQek6Xq9HzZtj2l51QNY8fRgp/s6mdQ1p63Qxhxh2bRVm
e0mVuS7t0krewkKThAOPmZ3vRaAICpeQTmJiPs9ed/DGZCB6b8DTqpGKGPOHqM8K
iWIdXfbxbvT1WUerHTyNqxs/eydXomaAFep7mgCiAynxThRXipqTSg+NKEn/8Cb3
FRdH3b0duEXZNGkd5hkAwT/SKualgCNfZbPV4ACZ4QKBgQDBKGxZPf6tijvJPa4z
VW7RDFaWXOqh33fuMqbxmopNYoSMnUP7TqcljA4/pCRPX147mpNCDu2CEYZ2MpOM
BFgDC3jJ2AtRhERAaNIBUQT47E2Y1tVI+4vpx7EJ+iej+hvtHuStuG4OtRqziaU0
LnKUM91RdOpHpL2i8ArxSf+96wKBgQC728gl1/3GWp9UPmWbarp84zigyepr2EYz
38llJAqJVlMzAQ4/WyBr7BP3nIIxdg4TY2LpNvqc1ntlAgIqQ2/ulXQ2fIo13hgw
0gWd7lhqLVDL2u5r//yFczhrFK8FrlOVqI6r3Vzm788OaAtdEZopLj5gm62z+1Hq
dyTG1waUuQKBgQCDuKFKqnBGwAHNVna5IwWTIaralzqacN5EXd5i3FR8OTbS/Vwi
wJxTipMc6z6nsg188AiD/9IP5QuhBxR/Y2bxjJ0uaFovmNdCZTjxFOMjLWItXDPO
tVvQbRFaEHF/7UumBG9F2IOVHAO9c5xpXVNdpZDDv8sUWE/KEZAkw6XXSQKBgAp7
jCKYd9++pM9ln/PZM8jOQRWvzrXv3pL8dNeA+FmLiJ76+xmL8zYyeTbC8/zgko6A
aD+NQtTHnyEWyJolIzTUACUeM/QnjYAD6C5U43ghSTXm5JEAOs4TjN1kzRNrE9zx
B+0NMCbu0MYEBkZOOiT8IJzxcvLtHjgQJ+w0iXh5AoGAbFVC+6S6wgFDOsxoIBKm
tB94DbW5PnmVTRRFJRSFY6QU+seJwNVe16foj+ttaGI9UbjDtwwaamA2TJ9Xrtux
OubN/vAPmnMAgaSPi8VoAPgU2EdmVcia08DPjGkRcVOEzuCm7jW0zo7xy3/LFC/y
3EInFTLfya+AUX82Am/CkVg=
-----END PRIVATE KEY-----
    `;
    const asymPublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjb5bvgMW4JMHzipMrp48
dga6Wpj4p+zzvsCiEHNUVPN/dLfXm5oSn3Qh0Oe91dZ/8nlu4tMa1rxnN4JLu5zZ
sQCGn35Wk19Qwk8OobBUx7F7VKCCWVBU6zGY5jadYwIm1HyEHVA5s7cLKhaexfhU
DKFeS8y0i7iGQYgKSVQNzrLaZBF4K9AJa9Ryr0pOHWaWO8QBpjawR08UG6bPC6f7
7GP2PUbhQkr/Lsk1DLC5p+R4Bh08FBTiJEwbZEZ4h2yInF+z4cWx/Q/mSUzZeC82
zK2SMbteSrCu5XhvtbKCa+NJfCgeVxSQYBmahH/A2V96RZITfAe+KOq1V9tnJB4a
0wIDAQAB
-----END PUBLIC KEY-----
    `;
    const header = {
        alg: 'RS256',
        kid: 'kid'
    };
    const payload = {
        sub: 'user',
        iss: 'https://subbscribe.com',
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        iat: Math.floor(Date.now() / 1000)
    };
    const authToken = jwt.createSigner({key: asymPrivateKey, header, algorithm: 'RS256'})({
        ...payload, blockchainId: ['3950249048075650071']
    });
    const unauthToken = jwt.createSigner({key: asymPrivateKey, header, algorithm: 'RS256'})({
        ...payload, blockchainId: ['123']
    });

    // Mocks.
    const mockedList = {};
    const storage = require('./storage.cjs');
    const db = require('./db.cjs');
    const axios = require('axios');

    before(async() => {
        // Mock storage.
        mockedList.storage = {getPublicUrl: storage.getPublicUrl, getSignedUrl: storage.getSignedUrl};
        storage.getPublicUrl = () => 'publicUrl';
        storage.getSignedUrl = () => 'signedUrl';

        // Mock db.
        mockedList.db = {getProduct: db.getProduct};
        db.getProduct = () => ({path: 'p', created: 'c', updated: 'u', type: 't', preview: 'p'});

        // Mock axios (for public key retrieval).
        mockedList.axios = {get: axios.get};
        axios.get = () => ({data: {notTheKid: 'notTheKey', [header.kid]: asymPublicKey}});

        // Mock store's wooCommerce API object.
        mockedList.store = {wooCommerce: store.wooCommerce};
        store.wooCommerce = {get: async(endpoint, args) => ({
            data: (args && args.slug && args.slug === '404') ? [] : ['mock']
        })};
    });

    after(async() => {
        // Undo mocks.
        storage.getPublicUrl = mockedList.storage.getPublicUrl;
        storage.getSignedUrl = mockedList.storage.getSignedUrl;
        db.getProduct = mockedList.db.getProduct;
        axios.get = mockedList.axios.get;
        store.wooCommerce = mockedList.store.wooCommerce;
    });

    describe('Store', async() => {
        const slug = 'popover-heavyweight-hooded-sweatshirt-in-red/';

        it('Product retrieval', async() => {
            try {
                await store.getProductAccess('404', authToken);
            } catch(error) {
                expect(error.message).to.equal('no product with slug 404');
            }
            expect((await store.getProductAccess(slug, 'bad token')).previewUrl).to.equal('publicUrl');
            expect((await store.getProductAccess(slug, unauthToken)).previewUrl).to.equal('publicUrl');
            expect((await store.getProductAccess(slug, authToken)).signedUrl).to.equal('signedUrl');
        }).timeout(10000);
    });

    describe('Web server', () => {
        let server;
        const slug = 'a test/file/path';

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
            const playerResponse = await server.inject({method: 'GET', url: `/player?slug=${slug}`});
            expect(playerResponse.statusCode).to.equal(200);
            expect(playerResponse.body).to.contain(`const slug = '${slug}';`);
        });

        it('Product details endpoint', async() => {
            let detailsResponse = await server.inject({
                method: 'POST', url: '/productDetails', payload: {slug: '404', authToken}
            });
            expect(detailsResponse.statusCode).to.equal(404);
            const store = require('./store.cjs');
            const oldGetProductAccess = store.getProductAccess;
            store.getProductAccess = () => ({});
            detailsResponse = await server.inject({
                method: 'POST', url: '/productDetails', payload: {slug, authToken}
            });
            expect(detailsResponse.statusCode).to.equal(200);
            expect(detailsResponse.headers['content-type'].startsWith('application/json')).to.be.true;
            store.getProductAccess = oldGetProductAccess;
        });

        it('Player endpoint', async() => {
            const playerResponse = await server.inject({method: 'GET', url: `/player?slug=${slug}`});
            expect(playerResponse.statusCode).to.equal(200);
            expect(playerResponse.headers['content-type'].startsWith('application/javascript')).to.be.true;
            expect(playerResponse.body).to.contain(`const slug = '${slug}';`);
        });

        it('Login endpoint', async() => {
            const linkResponse = await server.inject({method: 'POST', url: '/loginUrl', payload: {authToken}});
            expect(linkResponse.statusCode).to.equal(200);
        });
    });
});

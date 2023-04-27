require('dotenv').config();
const expect = require('chai').expect;

describe('Database', () => {
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
});

describe('Mocked product retrieval', () => {
    let store;
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
        iss: process.env.STORE_BASE_URL,
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        iat: Math.floor(Date.now() / 1000)
    };
    const subsNameDelimiter = '_';
    const authCustomer = '3950249048075650071';
    const customerId = '123';
    const subsOrderId = '1002334';
    const nonExistingCustomer = '404';

    // Subscriptions.
    const subsProductSlug = 'subscription';
    const notPurchedSubscription = 'not-purchased-subscription';

    // Slugs.
    const validSlug = `${subsProductSlug}${subsNameDelimiter}premium-video-test`;
    const notPurchasedSlug = `${notPurchedSubscription}${subsNameDelimiter}premium-video-test`;
    const unauthSlug = '403';
    const nonExistingSlug = '404';
    const invalidSlug = '406';
    const noParentSlug = 'no-parent';

    const authToken = jwt.createSigner({key: asymPrivateKey, header, algorithm: 'RS256'})({
        ...payload, blockchainId: [authCustomer]
    });
    const nonExistingToken = jwt.createSigner({key: asymPrivateKey, header, algorithm: 'RS256'})({
        ...payload, blockchainId: [nonExistingCustomer]
    });

    // Mocks.
    const mockedList = {};
    const axios = require('axios');
    const wooCommerceRestApi = require('@woocommerce/woocommerce-rest-api');

    before(async() => {
        // Mock axios (for public key retrieval).
        mockedList.axios = {get: axios.get, post: axios.post};
        axios.get = () => ({data: {notTheKid: 'notTheKey', [header.kid]: asymPublicKey}});
        axios.post = () => ({data: {data: {jwt: 'jwt'}}});

        // Mock wooCommerce API caller.
        const baseProduct = {
            id: 200, slug: validSlug, permalink: 'permalink',
            images: [{src: 'image'}], downloads: [{file: 'file'}]
        };

        // We need specific product IDs for the tests, and creating more products might be more readable.
        const subsProduct = {
            id: 100, slug: subsProductSlug, permalink: 'permalink',
            images: [{src: 'image'}], downloads: [{file: 'file'}]
        };

        const subsProductNotPurched = {
            id: 101, slug: notPurchedSubscription, permalink: 'permalink',
            images: [{src: 'image'}], downloads: [{file: 'file'}]
        };

        mockedList.store = {wooCommerceRestApiDefault: wooCommerceRestApi.default};
        wooCommerceRestApi.default = class{
            constructor() {
                this.get = (endpoint, args) => {
                    if(endpoint === 'customers') {
                        if(args.email.startsWith(nonExistingCustomer)) return {data: []};
                        if(args.email.startsWith(authCustomer)) return {data: [{id: customerId}]};
                    }
                    if(endpoint === 'products') {
                        if(args.slug === nonExistingSlug) return {data: []};
                        if(args.slug === invalidSlug) return {data: [{bad: 'property'}]};
                        if(args.slug === noParentSlug) return {data: [{...baseProduct, slug: noParentSlug}]};
                        if(args.slug === unauthSlug) return {data: [{...baseProduct}]};
                        if(args.slug === subsProductSlug) return {data: [{...subsProduct}]};
                        if(args.slug === notPurchasedSlug) return {data: [{...baseProduct, slug: notPurchasedSlug}]};
                        if(args.slug === notPurchedSubscription) return {data: [{...subsProductNotPurched}]};
                    }
                    if(endpoint === `products/${nonExistingSlug}`) return {data: {...baseProduct, slug: false}};
                    if(endpoint === `products/${unauthSlug}`) return {data: {...baseProduct, slug: unauthSlug}};
                    if(endpoint.startsWith('products/')) return {data: baseProduct};
                    if(endpoint === 'orders') {
                        if(args.product === unauthSlug) return {data: []};
                        if(args.product === subsProductNotPurched.id) return {data: []};
                        if(args.product === subsProduct.id) return {data: [{id: subsOrderId}]};
                    }
                    if(endpoint === 'subscriptions') {
                        return {data: [{parent_id: subsOrderId}]};
                    }
                    return {data: [baseProduct]};
                };
                this.put = () => ({data: {id: 201}});
                this.post = () => ({data: {id: 201}});
            }
        };

        // Finally import store.
        store = require('./store.cjs');
    });

    after(async() => {
        // Undo mocks.
        axios.get = mockedList.axios.get;
        axios.post = mockedList.axios.post;
        store.wooCommerceApi = mockedList.store.wooCommerceApi;
        wooCommerceRestApi.default = mockedList.store.wooCommerceRestApiDefault;
    });

    describe('Store', async() => {
        it('Product retrieval', async() => {
            try {
                await store.getProductAccess(nonExistingSlug, authToken);
                expect.fail();
            } catch(error) {
                expect(error.message).to.equal(`no product with slug ${nonExistingSlug}`);
            }

            try {
                await store.getProductAccess(invalidSlug, authToken);
                expect.fail();
            } catch(error) {
                expect(error.message).to.equal(`invalid product with slug ${invalidSlug}`);
            }

            try {
                await store.getProductAccess(validSlug, 'bad token');
                expect.fail();
            } catch(error) {
                expect(error.message).to.equal('invalid auth token');
            }

            expect((await store.getProductAccess(validSlug, authToken)).subscriptionSlug).to.equal(subsProductSlug);
            expect((await store.getProductAccess(validSlug, nonExistingToken)).image).to.equal('image');
            expect((await store.getProductAccess(validSlug, authToken)).file).to.equal('file');

            expect((await store.getProductAccess(noParentSlug, authToken)).subscriptionSlug).to.equal(undefined);
            expect((await store.getProductAccess(unauthSlug, authToken)).image).to.equal('image');

            expect((await store.getProductAccess(notPurchasedSlug, authToken)).file).to.equal(undefined);
            expect((await store.getProductAccess(notPurchasedSlug, authToken)).image).to.equal('image');

            // Test our fake JWT mode.
            process.env.JWT_POLICY = 'fake';
            expect((await store.getProductAccess(validSlug, authCustomer)).file).to.equal('file');
            process.env.JWT_POLICY = 'real';
        }).timeout(10000);
    });

    describe('Web server', () => {
        let server;

        before(async() => {
            // Run with swagger.
            process.env.FASTIFY_SWAGGER = 'true';
            server = require('fastify')({logger: false});
            server.register(require('./routes.cjs'));
        });

        it('Verify environment variables', async() => {
            const originalPremiumServiceEndpoint = process.env.PREMIUM_SERVICE_ENDPOINT;
            process.env.PREMIUM_SERVICE_ENDPOINT = '';
            delete require.cache[require.resolve('./routes.cjs')];
            try {
                require('./routes.cjs');
                expect.fail();
            } catch(error) {
                expect(error.message).to.equal('missing environment variable PREMIUM_SERVICE_ENDPOINT');
            }
            process.env.PREMIUM_SERVICE_ENDPOINT = originalPremiumServiceEndpoint;
        });

        it('Static endpoints', async() => {
            let response;
            response = await server.inject({method: 'GET', url: '/nosuchpath'});
            expect(response.statusCode).to.equal(404);
            response = await server.inject({method: 'GET', url: '/site/nosuchpath'});
            expect(response.statusCode).to.equal(404);

            // Mock fs to check for filetypes that don't exist in the site directory by default.
            const fs = require('fs');
            const originalReadFileSync = fs.readFileSync;
            fs.readFileSync = () => 'content';

            response = await server.inject({method: 'GET', url: '/site/test.js'});
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-type']).to.equal('application/javascript');

            response = await server.inject({method: 'GET', url: '/site/file.nosuckextension'});
            expect(response.statusCode).to.equal(404);

            fs.readFileSync = originalReadFileSync;

            response = await server.inject({method: 'GET', url: '/site/dev.html'});
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-type']).to.equal('text/html');
        });

        it('Health endpoint', async() => {
            const healthResponse = await server.inject({method: 'GET', url: '/health'});
            expect(healthResponse.statusCode).to.equal(200);
        });

        it('Product player endpoint', async() => {
            let playerResponse = await server.inject({method: 'GET', url: `/product/${validSlug}`});
            expect(playerResponse.statusCode).to.equal(200);
            expect(playerResponse.headers['content-type'].startsWith('application/javascript')).to.be.true;
            expect(playerResponse.body).to.contain(`const slug = '${validSlug}';`);
            expect(playerResponse.body).to.contain('const premiumServer = \'http');

            process.env.PREMIUM_SERVICE_ENDPOINT = 'https://premium-service-endpoint.com';
            playerResponse = await server.inject({method: 'GET', url: `/product/${validSlug}`});
            expect(playerResponse.body).to.contain(
                `const premiumServer = '${process.env.PREMIUM_SERVICE_ENDPOINT}';`);
            expect(playerResponse.body).to.not.contain(
                `const premiumServer = 'http://${process.env.FASTIFY_ADDRESS}:${process.env.FASTIFY_PORT}';`);
        });

        it('Product authentication endpoint', async() => {
            let detailsResponse = await server.inject({
                method: 'POST', url: `/product/${nonExistingSlug}`, payload: {authToken}
            });
            expect(detailsResponse.statusCode).to.equal(404);

            const store = require('./store.cjs');
            const originalGetProductAccess = store.getProductAccess;
            store.getProductAccess = () => ({});
            detailsResponse = await server.inject({
                method: 'POST', url: `/product/${validSlug}`, payload: {authToken}
            });
            expect(detailsResponse.statusCode).to.equal(200);
            expect(detailsResponse.headers['content-type'].startsWith('application/json')).to.be.true;
            store.getProductAccess = originalGetProductAccess;
        });

        it('Login endpoint', async() => {
            let linkResponse;
            linkResponse = await server.inject({method: 'POST', url: `/login/${validSlug}`, payload: {authToken}});
            expect(linkResponse.statusCode).to.equal(200);
            linkResponse = await server.inject({
                method: 'POST', url: `/login/${validSlug}`, payload: {authToken: nonExistingToken}
            });
            expect(linkResponse.statusCode).to.equal(200);
            linkResponse = await server.inject({
                method: 'POST', url: `/login/${validSlug}`, payload: {authToken: ''}
            });
            expect(linkResponse.statusCode).to.equal(200);
        }).timeout(5000);
    });
});

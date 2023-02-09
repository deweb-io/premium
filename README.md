# Premium

A BBS Core-UI plugin to handle premium content.

This plugin is, in fact, an integration between the Core-UI and an external multi-vendor/tenant digital-goods marketplace.

This external marketplace will probably be [Woocommerce](https://woocommerce.com/) with the [Product Vendors](https://woocommerce.com/es-es/products/product-vendors/) extension, but it can also be [Medusa](https://github.com/medusajs/medusa) with [Medusa Extender](https://github.com/adrien2p/medusa-extender) and [Medusa Marketplace Plugin](https://github.com/shahednasser/medusa-marketplace), or even [Ghost](https://ghost.org/).

The only requirements is that it exposes an API call that let's us check if a BBS user has purchased a specific product, and that it can give us access to the digital goods and their previews.

## BBS Core-UI Integration

The Premium integration should work similarly to Youtube video embedding, in that the posting user is expected to upload the premium digital asset from an independent domain and insert the obtained product link into a post. The only interaction between the Core-UI and the Premium service occurs when viewing posts that contain such links.

For this purpose the Premium service will expose the following endpoints:
* `GET:/health` - checks if everything is fine and dandy, so the Core-UI can disable the plugin if the service is unhealthy, and even notify the user)
* `GET:/view/:asset-ID` - returns a Single SPA compatible JS package (an AMD module which defines the Single SPA lifecycle stages) that deploys an interface for viewing the asset (this allows for seamless integration with the Core-UI Web app, and the mobile UI simply opens an iframe with the Web app) or its preview, depending on whether the logged in user has purchased it or not
* `GET:/view/:asset-ID?preview` - returns a preview image, so the Core-UI can display it in post lists and such

## Operation

We currently assume the files and previews are hosted on a Google Cloud Storage bucket that we have access to it. We also assume that the previews are public. This is rather easy to do on Woocommerce, Medusa and Ghost.

We run our own Premium server to bridge between the store and the BBS Core-UI, and we use an RDBMS (postgres) to manage the plugin private data. If we end up hosting our own store we may use the same RDBMS as it does, and maybe run our server from the same instance.

## BBS Network Integration

When loaded, the viewer component needs some way to prove to the Premium server that the current client session is actually run by a specific BBS user, so that the Premium server can check with the store that said user is allowed to view the requested content.

For this purpose we use a function from the [bbs-common library](https://github.com/deweb-io/bbs-common/), available on npm. By default, we use the latest version from [jsdelivr](https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@1.0.7/index.min.js). For convenience, you can keep your own version on `site/bbs-common.js` and it will be used instead.

We will also need to implement a way for the Premium server to query the external store. Until we decide on a store we will use a stub.

## Running Locally

Create an `.env` file with some basic params:

* `FASTIFY_ADDRESS`  - Host to serve from (defaults to 127.0.0.1)
* `FASTIFY_PORT`     - Port to serve from (defaults to 8000)
* `FASTIFY_SWAGGER`  - Serve swagger-UI from `/doc` (defaults to false)
* `PGHOST`           - Postgres host (defaults to localhost)
* `PGPORT`           - Postgres port (defualts to 5432)
* `PGDATABASE`       - Postgres database (schema) name (defaults to postgres)
* `PGUSERNAME`       - Postgres user name (defaults to user running the process)
* `PGPASSWORD`       - Postgres user password (defaults to no-password)

```sh
npm install         # Install dependencies
npm run refresh-db  # Initialize the database (drops and recreates the table)
npm run lint        # Run the linter
npm run test        # Run tests
npm run coverage    # Run tests and check coverage
npm run serve       # Run the Web server
npm run start       # Run the Web server in production mode (with all checks)
npm run dev         # Run the Web server in debug mode (auto reload and swagger enabled)
```

Once you run a server, you can access `/site/dev.html` which loads the `/site/premium.js` package as if it's a Single SPA component. If you have access to the `CreatorApp` repository you can run the `premium` branch and view any post with a link in the form `http://localhost:8000/player?filePath=videbate/video.mp4&premium=yes`.

## Deploy to GCP
Set deploy env in `deployment/cloudRunDeploy.sh` and run it.

## Using Cloud SQL (postgres)
First, create instance on google cloud.

In order to allow connection from cloud run follow the following:
https://towardsdatascience.com/how-to-connect-to-gcp-cloud-sql-instances-in-cloud-run-servies-1e60a908e8f2

In order to connect to postgres from local during development:
    1. add your ip to Authorized networks
    2. set `PGHOST` to equal the public ip of the postgress instance on GCP (and update other postgres related env if needed).

# Premium

A BBS Core-UI plugin to handle premium content.

## BBS Core-UI Integration

The Premium integration should work similarly to youtube video embedding, in that the posting user is expected to upload the premium digital asset from an independent domain and frontend, and insert the obtained link into a post. The only interaction between the Core-UI and the Premium service occurs when viewing posts that contain such links.

For this purpose the Premium service will expose the following endpoints:
* `GET:/health` - checks if everything is fine and dandy, so the Core-UI can disable the plugin if the service is unhealthy, and even notify the user)
* `GET:/view/:asset-ID` - returns a preview image (in the future may also return other file types), so the Core-UI can display it in post lists and such
* `POST:/view/:asset-ID` - returns a Single SPA compatible JS package with a deployable interface for viewing the asset (this allows for seamless integration with the Core-UI Web app, and the mobile UI simply opens an iframe with the Web app)

## Operation

The Premium operator operates a [Medusa](https://github.com/medusajs/medusa) server with [Medusa Extender](https://github.com/adrien2p/medusa-extender) and [Medusa Marketplace Plugin](https://github.com/shahednasser/medusa-marketplace). This allows the Premium operator to run an independent store front (we can build our own, but Medusa offers several FLOSS options, like [nexjs-starter](https://github.com/medusajs/nextjs-starter-medusa)) with any chosen payment system (e.g. Stripe with the [medusa-payment-stripe](https://github.com/medusajs/medusa/tree/master/packages/medusa-payment-stripe) module) and on any chosen storage infrastructure (for us it's [medusa-file-gcp](https://github.com/kingwill101/medusa-file-gcp)). All this goodness is probably best stuffed into a docker image and deployed on Cloud Run.

Hopefully, we will need a very small adaptation to the above in order to work with BBS, but we still don't know what will be the permission scheme. In the optimal scenario, the Core operator will handle permissions, and we will end up with a signed JWT that we can configure (or modify) Medusa to respect.

In addition, we will use the same RDBMS as Medusa (postgres) to preserve some BI data, just to show that we can.

## BBS Network Integration

We don't have any meaningful integrations with the network at this moment, but we are desperate to show how it's done, so in the above BI data will incorporate some BBS data. We will start with something symbolic, like the number of comments and upvotes on the post with the asset that is being viewed.

We use the [bbs-common library](https://github.com/deweb-io/bbs-common/), available on npm. By default, we use the latest version from [jsdelivr](https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@1.0.7/index.min.js). For convenience, you can keep your own version on `site/bbs-common.js` and it will be used instead.

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

## Deploy to GCP
Set deploy env in `deployment/cloudRunDeploy.sh` and run it.

## Using Cloud SQL (postgres)
First, create instance on google cloud.

In order to allow connection from cloud run follow the following:
https://towardsdatascience.com/how-to-connect-to-gcp-cloud-sql-instances-in-cloud-run-servies-1e60a908e8f2

In order to connect to postgres from local during development:
    1. add your ip to Authorized networks
    2. set `PGHOST` to equal the public ip of the postgress instance on GCP (and update other postgres related env if needed).

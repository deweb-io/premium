# Premium Plugin Service

A BBS Core-UI plugin to handle premium content.

This plugin is, in fact, an integration between the Core-UI and an external multi-vendor/tenant digital-goods marketplace.

We chose to use WooCommerce as an external store, but any store that can sell digital goods and has a decent API can be supported. The exact requirements are detailed below.

## Architecture

The main components of the system are:
* Digital Store - where users sell and buy digital goods
    * Let's users sell digital goods
        * This is basic WooCommerce functionality
    * Let's users buy digital goods
        * This is basic WooCommerce functionality
    * Let's the Premium Service associate BBS users to Digital Store users
        * To do this, we use the WooCommerce API to create Digital Store users that the Premium Service manages, and to generate auto-login URLs for them
    * Let's the Premium Service query the Digital Store and find out if a specific user purchased a specific good
        * This is basic WooCommerce functionality, but we may need to enhance it to supprot bundles
    * Let's the Premium Service access the digital goods on behalf of the BBS user associated with the Digital Store user
        * To do this, we will use a plugin that stores the digital goods on a GCS bucket which we own
* Core-UI - where users are offered digital goods and consume them
    * Let's users embed links to digital goods from the Digital Store
        * This is basic Core-UI functionality
    * Let's domain owners enable the Premium Service for the domain
        * Does this already exist, or does it need to be developed? Remember that since we don't have plugin meta-data in the post, and we don't want to send parameters in the request for the Premium UI, we need to extrapolate the address of the Single SPA package from the embed link, which should be part of the configuration
    * Let's community admins enable the Premium Service for the board (or for specific users on the board)
        * This needs to be developed, and can probably wait for a later phase
    * Loads the Premium Service for embedded links when the plugin is enabled
        * This is done with our existing Single SPA mechanism, and a crude version can be found in and `premium` branch on our Core-UI repo
* Premium Service - which integrates the Core-UI and the Digital Store
    * Provides a UI for accessing goods from the Digital Store which the Core-UI can load

### Digital Store Specifications

1. Install [WordPress](https://wordpress.org/) - this is the platform running the store's site.
1. Install [WooCommerce](https://woocommerce.com/) version 7.4.0 - this is a plugin that turns WordPress into a digital store.
1. Install [Simple JWT Login](https://wordpress.org/plugins/simple-jwt-login/) version 3.5.0 - let's us generate auto-login URLs.
    1. Enter a strong `JWT Decryption` Key (`General-3` in the plugin configuration menu).
    1. Set `Get JWT token from` to `1. REQUEST` only (just below `General-3` in the plugin configuration menu).
    1. Set `Allow Auto-Login` to `Yes` (top of `Login` in the plugin configuration menu).
    1. Check `Allow redirect to a specific URL if redirectUrl is present in the request` (bottom of `Login` in the plugin configuration menu).
    1. Set `Allow Authentication` to `Yes` (top of `Authentication` in the plugin configuration menu).
    1. Check all `JWT Payload parameters` (middle of `Authentication` in the plugin configuration menu).
1. Install other plugins and configure them - Yanis will go into further details.

### Core-UI Specifications

The Premium Service integration should work similarly to Youtube video embedding, in that the posting user is expected to upload the premium digital asset to the Digital Store from an independent domain and insert the obtained link into a post. The only interaction between the Core-UI and the Premium Service occurs when viewing posts that contain such links.

The links are in the form `https://<Digital Store>/product/<slug>` (the slug is a human readable string identifying the product). When such a link is rendered inside a post, and the plugin is enabled, the Core-UI simply mounts a Single SPA parcel from `https://<Premium Service>/player?slug=<slug>` and the Premium Service does the rest.

In order for the Premium Service to authenticate the BBS user running the Core-UI, the Premium UI parcel requires access to a signed auth token. For this purpose the `premium` branch of our Core-UI repo exposes the Firebase auth token through the `window.deWeb.getFirebaseIdToken` function, but we can also transfer it through a POST request when loading the parcel.

### Premium Service Specifications

The service exposes the following endpoints:
* `GET:/health` - checks if everything is fine and dandy, so the Core-UI can disable the plugin if the service is unhealthy, and even notify the user)
* `GET:/player?slug=<slug>` - returns a Single SPA compatible JS package (an AMD module which defines the Single SPA lifecycle stages) that deploys an interface for viewing the digital good or its preview, depending on whether the logged in user has purchased it or not (this allows for seamless integration with the Core-UI Web app, and the mobile UI simply opens an iframe with the Web app)
* `POST:/productDetails (filePath, authToken)` - returns a JSON with the asset's details, including a preview image and a signed URL to the asset if the authtoken is valid and identifies an authorized user
* `POST:/loginUrl (authToken, redirectUrl)` - returns a URL that performs automatic login to the Digital Store on the wanted page
* `GET:/site/<path>` - serves static assets for convenience when developing (will probably get removed in the future)

### The Full View Flow

1. The user views a post.
1. Core-UI identifies a linkTool with a link matching the pattern in the configuration and fetches the Premium UI from the Premium Service, passing it the product slug as part of the request URL, and mounts it.
    1. The Premium UI loads the bbs-common library and uses it to get the user's Firebase auth token.
    1. The Premium UI passes the Premium Service the product slug and the auth token.
    1. The Premium Service verifies the token, and checks if the matching customer in the store has purchased the digital good.
    1. The Premium Service returns the details of the digital good, including a link to the digital good if the customer has purchased it in the past.
1. If a link to the digital good is found, the Premium UI displays it and the user is happy. Otherwise, the Premium UI displays the preview image and listens for a click on it.
1. When the user clicks the preview:
    1. The Premium UI passes the Premium Service the product slug and the auth token (again).
    1. The Premium Service verifies the token and checks the store for a matching customer, creating one if necessary.
    1. The Premium Service gets an auto-login link from the store and returns it to the Premium UI.
1. The Premium UI opens the auto-login link, and opens a new browser window on the product page, in which the customer can purchase the digital good.

## Running Locally

Except for the service itself, running on Node 18, you will need to run a PostgreSQL RDBMS, which we will use for storing BI data, and an online WooCommerce site, as described above, at https://subbscribe.com (sorry, this is currently hard-coded).

Create an `.env` file with some basic params:

* `FASTIFY_ADDRESS`                 - Host to serve from (defaults to 127.0.0.1)
* `FASTIFY_PORT`                    - Port to serve from (defaults to 8000)
* `FASTIFY_SWAGGER`                 - Serve swagger-UI from `/doc` (defaults to false)
* `PGHOST`                          - Postgres host (defaults to localhost)
* `PGPORT`                          - Postgres port (defualts to 5432)
* `PGDATABASE`                      - Postgres database (schema) name (defaults to postgres)
* `PGUSERNAME`                      - Postgres user name (defaults to user running the process)
* `PGPASSWORD`                      - Postgres user password (defaults to no-password)
* `GCP_PROJECT_ID`                  - The ID of the GCP project which owns the GCS bucket storing the digital goods
* `GCP_BUCKET_NAME`                 - The name of the GCS bucket storing the digital goods
* `GOOGLE_APPLICATION_CREDENTIALS`  - Credential JSON for accessing the bucket

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

Once you run a server, you can access `/site/dev.html` which loads the `/site/premium.js.template` package as if it's a Single SPA component. If you have access to the `CreatorApp` repository you can run the `premium` branch and paste product links into posts and view them.

Note that the Premium UI uses the [bbs-common library](https://github.com/deweb-io/bbs-common/), available on npm. If no local copy is found, it will fetch the latest version from [jsdelivr](https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@latest/index.min.js). For convenience, you can keep a local copy on `site/bbs-common.js` which will be used instead.

## Deploy to GCP

Set deploy env in `deployment/cloudRunDeploy.sh` and run it.

## Using Cloud SQL (postgres)

First, create instance on google cloud.

In order to allow connection from cloud run follow the following:
https://towardsdatascience.com/how-to-connect-to-gcp-cloud-sql-instances-in-cloud-run-servies-1e60a908e8f2

In order to connect to postgres from local during development:
    1. add your ip to Authorized networks
    2. set `PGHOST` to equal the public ip of the postgress instance on GCP (and update other postgres related env if needed).

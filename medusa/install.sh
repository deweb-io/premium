#!/bin/bash -e

# export all variables from the env file.
set -o allexport
. .env
set +o allexport

# Verify existence of the Postgres credentials.
if [ "$2" ]; then
    POSTGRES_URL="$2"
else
    if [ "$PGUSERNAME" -a "$PGPASSWORD" -a "$PGHOST" -a "$PGPORT" -a "$PGDATABASE" ]; then
        POSTGRES_URL="postgresql://$PGUSERNAME:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
    else
        echo "provide postgres URL as second argument or set PGHOST, PGPORT, PGUSERNAME, PGPASSWORD, and PGDATABASE"
        exit 1
    fi
fi

# Set the working directory.
MEDUSA_PATH="${1:-./medusa}"
[ -d "$MEDUSA_PATH" ] && echo "$MEDUSA_PATH already exists" && exit 1
read -rn1 -p"install Medusa in $MEDUSA_PATH and $(echo "$POSTGRES_URL" | sed -E "s/:[^@]+@/:********@/")? [y/N] " q
[ "$q" != 'y' ] && echo 'aborting' && exit 1 || echo
mkdir -p "$MEDUSA_PATH"
cd "$MEDUSA_PATH"

## Create a Medusa environment (see here https://docs.medusajs.com/quickstart/quick-start/).
npm install --no-save @medusajs/medusa-cli
npx medusa new .

# Add Medusa extender (see here https://github.com/adrien2p/medusa-extender#existing-medusa-project).
npm install medusa-extender
npx medex init

## Add the Medusa Marketplace plugin (see here https://github.com/shahednasser/medusa-marketplace#installation).
npm install medusa-marketplace
export POSTGRES_URL
cat <<'EOF' | node
const fs = require('fs');

// Set the database and add the migration paths for the marketplace plugin.
const medusaConfig = './medusa-config.js';
fs.writeFileSync(medusaConfig, fs.readFileSync(medusaConfig, 'utf8').replace(
    /(module.exports[^}]*projectConfig[^}{]*{)[^}]*/, `$1
    database_type: 'postgres',
    database_url: '${process.env.POSTGRES_URL}',
    cli_migration_dirs: ['node_modules/medusa-marketplace/dist/**/*.migration.js'],
    store_cors: STORE_CORS,
    admin_cors: ADMIN_CORS
  `
));

// Import and load all the modules for the marketplace plugin.
const medusaMain = './src/main.ts';
fs.writeFileSync(medusaMain, `import {
    ProductModule, UserModule, StoreModule, OrderModule, InviteModule, RoleModule, PermissionModule
} from 'medusa-marketplace';\n${fs.readFileSync(medusaMain, 'utf8').replace(
    'load([ExampleModule])',
    'load([UserModule, ProductModule, StoreModule, OrderModule, InviteModule, RoleModule, PermissionModule])'
)}`);
EOF

# Seed and migrate the database.
npm run seed
npx medex migrate --run

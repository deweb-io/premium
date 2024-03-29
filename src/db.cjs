// Database initialization and access.
const postgres = require('postgres');

const psql = postgres({transform: postgres.toCamel});

// Database initialization.
const refreshDatabase = async() => {
    console.warn(`┌refreshing database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);

    console.warn('│┌clearing all tables');
    for(const row of await psql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`) {
        console.warn(`││┌dropping table ${row.tablename}`);
        // This trick is required to stop postgres.js from escaping the table name.
        const dropQuery = `DROP TABLE ${row.tablename}`;
        await psql({...[dropQuery], raw: [dropQuery]});
        console.warn(`││└dropped table ${row.tablename}`);
    }
    console.warn('│└all tables cleared');

    const fs = require('fs');
    const path = require('path');
    const migrationDirectory = './migrations';
    console.warn('│┌running migrations');
    for(let fileName of (
        (await fs.promises.readdir(migrationDirectory)).filter((fileName) => fileName.endsWith('.sql')).sort()
    )) {
        fileName = path.join(migrationDirectory, fileName);
        console.warn(`││┌running migration ${fileName}`);
        await psql.file(fileName);
        console.warn(`││└finished migration ${fileName}`);
    }
    console.warn('│└finished migrations');

    console.warn(`└database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE} refresehd`);
};

// Report database connection and health.
const health = async() => await psql`SELECT 1 FROM files LIMIT 1` && 'OK';

exports = module.exports = {psql, refreshDatabase, health};

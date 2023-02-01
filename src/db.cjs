const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config();
const psql = postgres({transform: postgres.toCamel});
exports.psql = psql;

// Database initialization.
exports.refreshDatabase = async() => {
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
exports.health = () => psql`SELECT 1 FROM posts LIMIT 1` && 'OK';

// Post ID conversion.
const ID_DELIMITER = ':';
const idFromDb = (dbId) => dbId.split(ID_DELIMITER);
const idToDb = (id) => id.join(ID_DELIMITER);
const partialIdToDb = (id) => `%${idToDb(id)}`;

// Database Integrity Protection
const getParentId = (id) => id.slice(0, -1);
const hasParent = async(id) => (await psql`SELECT 1 FROM posts WHERE id = ${idToDb(getParentId(id))}`).length === 1;
const validateId = async(id) => {
    if(id.length > 1) {
        if(new Set(id).size !== id.length) {
            throw new Error(`database integrity error: duplicate component(s) ${
                id.filter((component, index) => id.indexOf(component) !== index).join(', ')
            } in requested id ${id}`);
        }
        if(!await hasParent(id)) {
            throw new Error(
                `database integrity error: parent missing ${id.slice(0, -1)} for requested id ${id}`
            );
        }
    }
    return true;
};

// Posts should only ever be inserted with this function!
exports.addPost = async(id, videoUrl) => {
    await validateId(id);
    await psql`INSERT INTO posts(id, video_url) VALUES (${idToDb(id)}, ${videoUrl})`;
    return {id};
};

// Posts should only ever be updated with this function!
exports.updatePost = async(id, numComments) => await psql`UPDATE posts SET
    verified = CURRENT_TIMESTAMP,
    updated = CURRENT_TIMESTAMP,
    num_comments = ${numComments}
WHERE id = ${idToDb(id)}`;

exports.getPost = async(partialId) => {
    const posts = await psql`SELECT * FROM posts
        WHERE id LIKE ${partialIdToDb(partialId)}
        ORDER BY LENGTH(id), id
    `;
    if(posts.length === 0) {
        throw new Error(`no posts found for partial id ${partialId}`);
    }
    return {...posts[0], id: idFromDb(posts[0].id)};
};

exports.getChildren = async(id) => (await psql`SELECT id FROM posts
    WHERE id LIKE ${idToDb([...(id || []), '%'])}
    AND id NOT LIKE ${idToDb([...(id || []), '%', '%'])}
`).map((post) => idFromDb(post.id));

exports.getDecendants = async(id) => (await psql`SELECT id FROM posts
    WHERE id LIKE ${idToDb([...(id || []), '%'])}
`).map((post) => post.id);

exports.getSiblings = async(id) => {
    const children = await exports.getChildren(getParentId(id));
    const postIndex = children.findIndex((child) => idToDb(child) === idToDb(id));
    return {previousSiblings: children.slice(0, postIndex), nextSiblings: children.slice(postIndex + 1)};
};

exports.getEnrichedPost = async(partialId) => {
    const post = await exports.getPost(partialId);
    const children = await exports.getChildren(post.id);
    const siblings = await exports.getSiblings(post.id);
    return {...post, children, siblings};
};

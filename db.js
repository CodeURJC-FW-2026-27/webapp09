const { MongoClient } = require('mongodb');

let client;

async function connectToDatabase() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI is not configured. Set it in your environment or .env file.');
    }

    client = new MongoClient(uri);
    await client.connect();

    const databaseName = process.env.MONGODB_DB;
    return client.db(databaseName || undefined);
}

async function closeDatabase() {
    if (client) {
        await client.close();
    }
}

module.exports = { connectToDatabase, closeDatabase };
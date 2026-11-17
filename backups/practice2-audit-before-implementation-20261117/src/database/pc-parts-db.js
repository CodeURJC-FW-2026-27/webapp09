import { MongoClient } from 'mongodb';

const uri = 'mongodb://127.0.0.1:27017/';
const databaseName = 'pc_parts_catalog';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

let connectionPromise;

/**
 * Connect once and return the catalog database and its collection handles.
 * Reusing this promise prevents a new MongoClient from being created per request.
 */
export function connectPcPartsDB() {
    if (!connectionPromise) {
        connectionPromise = (async () => {
            await client.connect();

            const database = client.db(databaseName);
            await database.command({ ping: 1 });

            return {
                database,
                computers: database.collection('computers'),
                components: database.collection('components')
            };
        })().catch(error => {
            connectionPromise = undefined;
            throw new Error(
                `No se pudo conectar a MongoDB (${uri}, base ${databaseName}): ${error.message}`,
                { cause: error }
            );
        });
    }

    return connectionPromise;
}

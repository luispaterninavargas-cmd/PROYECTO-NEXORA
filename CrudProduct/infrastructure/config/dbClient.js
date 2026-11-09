import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME;

if (!MONGO_URI) {
    throw new Error("MONGO_URI no está configurada");
}

if (!DB_NAME) {
    throw new Error("MONGO_DB_NAME no está configurada");
}

const client = new MongoClient(MONGO_URI);

let db;

async function connect() {
    try {
        await client.connect();

        db = client.db(DB_NAME);

        console.log("MongoDB conectado correctamente");
        console.log(`Base de datos: ${DB_NAME}`);

        return db;

    } catch (error) {
        console.error("Error conectando a MongoDB:", error);
        process.exit(1);
    }
}

await connect();

export { client, db };

export default {
    client,
    get db() {
        return db;
    }
};
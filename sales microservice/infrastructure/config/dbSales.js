import 'dotenv/config';
import { MongoClient } from "mongodb";

class dbClient {
    constructor() {
        const queryString = process.env.URL_DB;

        this.client = new MongoClient(queryString);
        this.ready = this.conectBD();
    }

    async conectBD() {
        await this.client.connect();
        this.db = this.client.db('SalesDB');
        await this.db.collection("CART_ITEMS").createIndex(
            { id_users: 1, id_product: 1 },
            { unique: true }
        );
        console.log("Connected to Sales DB");
    }
}

export default new dbClient();

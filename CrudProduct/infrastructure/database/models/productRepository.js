import { ObjectId } from "mongodb";
import dbClient from "../../config/dbClient.js";

class ProductRepository {

    getCollection() {
        return dbClient.db.collection("productos");
    }

    async crearProducto(producto) {
        const collection = this.getCollection();

        const resultado = await collection.insertOne(producto);

        return {
            _id: resultado.insertedId,
            ...producto
        };
    }

    async getAll() {
        const collection = this.getCollection();

        return await collection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
    }

    async getOne(id) {

        if (!ObjectId.isValid(id)) {
            return null;
        }

        const collection = this.getCollection();

        return await collection.findOne({
            _id: new ObjectId(id)
        });
    }

    async getByCategory(categoria) {

        const collection = this.getCollection();

        return await collection.find({
            categoria: {
                $regex: `^${categoria}$`,
                $options: "i"
            }
        }).toArray();
    }

    async update(id, datosActualizados) {

        if (!ObjectId.isValid(id)) {
            return null;
        }

        const collection = this.getCollection();

        const resultado = await collection.findOneAndUpdate(
            {
                _id: new ObjectId(id)
            },
            {
                $set: datosActualizados
            },
            {
                returnDocument: "after"
            }
        );

        return resultado;
    }

    async adjustStock(id, quantity, operation) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        const amount = operation === "reserve" ? -quantity : quantity;
        const result = await this.getCollection().updateOne(
            {
                _id: new ObjectId(id),
                ...(operation === "reserve" ? { stock: { $gte: quantity } } : {})
            },
            { $inc: { stock: amount } }
        );

        return result.matchedCount > 0;
    }

    async eliminarProducto(id) {

        if (!ObjectId.isValid(id)) {
            return null;
        }

        const collection = this.getCollection();

        return await collection.findOneAndDelete({
            _id: new ObjectId(id)
        });
    }
}

export default new ProductRepository();
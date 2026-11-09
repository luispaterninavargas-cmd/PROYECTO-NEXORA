import { ObjectId } from "mongodb";
import dbClient from "../config/dbSales.js";

class SalesRepository {

  async create(sale) {

    await dbClient.ready;
    const salesCol = dbClient.db.collection("SALES");

    const result = await salesCol.insertOne(sale);

    return await salesCol.findOne({
      _id: result.insertedId
    });
  }


  async getAll() {

    await dbClient.ready;
    const salesCol = dbClient.db.collection("SALES");

    return await salesCol
      .find({})
      .sort({ fecha: -1 })
      .toArray();
  }


  async getByUserId(userId) {

    await dbClient.ready;
    const salesCol = dbClient.db.collection("SALES");

    return await salesCol
      .find({
        id_users: userId
      })
      .sort({ fecha: -1 })
      .toArray();
  }


  async getOne(id) {

    await dbClient.ready;
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const salesCol = dbClient.db.collection("SALES");

    return await salesCol.findOne({
      _id: new ObjectId(id)
    });
  }


  async update(id, sale) {

    await dbClient.ready;
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const salesCol = dbClient.db.collection("SALES");

    // Nunca permitir modificar el _id
    delete sale._id;

    const result = await salesCol.updateOne(
      {
        _id: new ObjectId(id)
      },
      {
        $set: sale
      }
    );

    return result;
  }

  async updateOrderStatus(id, currentStatus, nextStatus) {
    await dbClient.ready;
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const statusFilter = currentStatus === undefined
      ? { $exists: false }
      : currentStatus;
    return dbClient.db.collection("SALES").updateOne(
      { _id: new ObjectId(id), status: statusFilter },
      { $set: { status: nextStatus, updatedAt: new Date() } }
    );
  }

  async savePaymentPreference(id, preferenceId) {
    await dbClient.ready;
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return dbClient.db.collection("SALES").updateOne(
      { _id: new ObjectId(id), "payment.status": "pending" },
      {
        $set: {
          "payment.preferenceId": preferenceId,
          updatedAt: new Date()
        }
      }
    );
  }

  async updatePendingPayment(id, payment, orderStatus) {
    await dbClient.ready;
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const paymentFields = Object.fromEntries(
      Object.entries(payment).map(([key, value]) => [`payment.${key}`, value])
    );
    return dbClient.db.collection("SALES").updateOne(
      { _id: new ObjectId(id), "payment.status": "pending" },
      {
        $set: {
          ...paymentFields,
          status: orderStatus,
          updatedAt: new Date()
        }
      }
    );
  }


  async delete(id) {

    await dbClient.ready;
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const salesCol = dbClient.db.collection("SALES");

    return await salesCol.deleteOne({
      _id: new ObjectId(id)
    });
  }

  async getCart(userId) {
    await dbClient.ready;
    return dbClient.db.collection("CART_ITEMS")
      .find({ id_users: userId })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async addCartItem(userId, productId, quantity) {
    await dbClient.ready;
    await dbClient.db.collection("CART_ITEMS").updateOne(
      { id_users: userId, id_product: productId },
      {
        $inc: { quantity },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    return this.getCart(userId);
  }

  async setCartQuantity(userId, productId, quantity) {
    await dbClient.ready;
    const result = await dbClient.db.collection("CART_ITEMS").updateOne(
      { id_users: userId, id_product: productId },
      { $set: { quantity, updatedAt: new Date() } }
    );
    return result.matchedCount > 0;
  }

  async removeCartItem(userId, productId) {
    await dbClient.ready;
    return dbClient.db.collection("CART_ITEMS").deleteOne({
      id_users: userId,
      id_product: productId
    });
  }

  async clearCart(userId) {
    await dbClient.ready;
    return dbClient.db.collection("CART_ITEMS").deleteMany({ id_users: userId });
  }
}

export default new SalesRepository();
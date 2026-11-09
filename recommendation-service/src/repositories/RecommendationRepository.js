import mongoose from 'mongoose';

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'view',
        'cart',
        'purchase',
        'favorite',
        'search',
        'recommendation_impression',
        'recommendation_click'
      ],
      required: true
    },
    productId: { type: String, default: '' },
    productName: { type: String, default: '' },
    category: { type: String, default: '' },
    brand: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    actions: { type: [actionSchema], default: [] },
    updatedAt: { type: Date, default: Date.now }
  },
  { collection: 'recommendation_profiles' }
);

const RecommendationProfile = mongoose.models.RecommendationProfile
  || mongoose.model('RecommendationProfile', profileSchema);

const fallbackProducts = [
  { _id: 'p1', nombre: 'Laptop Gamer Lenovo', categoria: 'Tecnología', precio: 1400, stock: 12, imagen: '' },
  { _id: 'p2', nombre: 'Audífonos Bluetooth', categoria: 'Tecnología', precio: 180, stock: 35, imagen: '' },
  { _id: 'p3', nombre: 'Mouse Ergonómico', categoria: 'Tecnología', precio: 90, stock: 40, imagen: '' },
  { _id: 'p4', nombre: 'Camiseta Básica', categoria: 'Ropa', precio: 40, stock: 50, imagen: '' },
  { _id: 'p5', nombre: 'Zapatillas Deportivas', categoria: 'Calzado', precio: 120, stock: 20, imagen: '' }
];

class RecommendationRepository {
  constructor() {
    this.memoryProfiles = new Map();
  }

  mongoAvailable() {
    return mongoose.connection.readyState === 1;
  }

  normalizeAction(action) {
    if (!action || typeof action !== 'object') return null;
    const type = String(action.type || '').trim().toLowerCase();
    if (![
      'view',
      'cart',
      'purchase',
      'favorite',
      'search',
      'recommendation_impression',
      'recommendation_click'
    ].includes(type)) return null;

    const timestamp = action.timestamp ? new Date(action.timestamp) : new Date();
    if (Number.isNaN(timestamp.getTime())) return null;
    const price = Number(action.price);

    return {
      type,
      productId: String(action.productId || '').trim(),
      productName: String(action.productName || '').trim().slice(0, 120),
      category: String(action.category || action.categoria || '').trim().slice(0, 80),
      brand: String(action.brand || action.marca || '').trim().slice(0, 80),
      description: String(action.description || '').trim().slice(0, 300),
      price: Number.isFinite(price) && price >= 0 ? price : null,
      timestamp
    };
  }

  async getUserProfile(userId) {
    const normalizedUserId = String(userId);

    if (this.mongoAvailable()) {
      const profile = await RecommendationProfile.findOne({ userId: normalizedUserId }).lean();
      return profile || { userId: normalizedUserId, actions: [] };
    }

    return this.memoryProfiles.get(normalizedUserId) || {
      userId: normalizedUserId,
      actions: []
    };
  }

  async registerBehavior(userId, actions = []) {
    const normalizedUserId = String(userId);
    const normalizedActions = actions
      .map((action) => this.normalizeAction(action))
      .filter(Boolean)
      .slice(0, 20);

    if (!normalizedActions.length) return this.getUserProfile(normalizedUserId);

    if (this.mongoAvailable()) {
      return RecommendationProfile.findOneAndUpdate(
        { userId: normalizedUserId },
        {
          $set: { updatedAt: new Date() },
          $push: { actions: { $each: normalizedActions, $slice: -250 } }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    }

    const current = await this.getUserProfile(normalizedUserId);
    const updated = {
      userId: normalizedUserId,
      actions: [...current.actions, ...normalizedActions].slice(-250),
      updatedAt: new Date()
    };
    this.memoryProfiles.set(normalizedUserId, updated);
    return updated;
  }

  async getAllProducts() {
    return fallbackProducts;
  }
}

export default RecommendationRepository;

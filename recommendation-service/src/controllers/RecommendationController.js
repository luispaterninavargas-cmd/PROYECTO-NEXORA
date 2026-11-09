import RecommendationService from '../services/RecommendationService.js';

export class RecommendationController {
  constructor() {
    this.recommendationService = new RecommendationService();
  }

  getUserId(req) {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
  }

  getCartProductIds(value) {
    const values = Array.isArray(value) ? value : [value];
    return values
      .flatMap((item) => String(item || '').split(','))
      .map((productId) => productId.trim())
      .filter(Boolean)
      .slice(0, 100);
  }

  async getRecommendationsForUser(req, res) {
    try {
      const requestedUserId = req.query.userId || req.body?.userId;
      const userId = req.user?.role === 'admin' && requestedUserId
        ? String(requestedUserId)
        : this.getUserId(req);

      if (!userId) return res.status(401).json({ message: 'El token no identifica al usuario.' });

      const result = await this.recommendationService.getRecommendationsForUser(
        userId,
        req.headers.authorization,
        { cartProductIds: this.getCartProductIds(req.query.cartProductIds) }
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error obteniendo recomendaciones:', error);
      return res.status(500).json({ message: 'Error al obtener recomendaciones', error: error.message });
    }
  }

  async getRecommendationsForProduct(req, res) {
    try {
      const { id } = req.params;
      const result = await this.recommendationService.getRecommendationsForProduct(
        id,
        req.headers.authorization
      );
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener productos relacionados', error: error.message });
    }
  }

  async refreshRecommendations(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) return res.status(401).json({ message: 'El token no identifica al usuario.' });

      const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
      const profile = await this.recommendationService.registerBehavior(userId, actions);
      const result = await this.recommendationService.getRecommendationsForUser(
        userId,
        req.headers.authorization,
        { cartProductIds: this.getCartProductIds(req.body?.cartProductIds) }
      );

      return res.status(200).json({
        message: 'Recomendaciones actualizadas',
        profile,
        ...result
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error al refrescar recomendaciones', error: error.message });
    }
  }

  async recordRecommendationEvents(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) return res.status(401).json({ message: 'El token no identifica al usuario.' });

      const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
      const events = actions.filter((action) => [
        'recommendation_impression',
        'recommendation_click'
      ].includes(action?.type));
      if (!events.length) {
        return res.status(400).json({ message: 'Se requiere al menos un evento de recomendación válido.' });
      }

      const profile = await this.recommendationService.registerBehavior(userId, events);
      return res.status(202).json({ message: 'Eventos de recomendación registrados.', metrics: profile.metrics });
    } catch (error) {
      console.error('Error registrando eventos de recomendaciones:', error);
      return res.status(500).json({ message: 'Error al registrar eventos de recomendaciones.' });
    }
  }

  async registerPurchaseEvent(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) return res.status(401).json({ message: 'El token no identifica al usuario.' });

      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const actions = items.map((item) => ({
        type: 'purchase',
        productId: item.id_product || item.productId,
        productName: item.product_name || item.productName || 'Producto',
        category: item.category || item.categoria || ''
      }));

      const profile = await this.recommendationService.registerBehavior(userId, actions);
      return res.status(201).json({
        message: 'Interacción de compra registrada para recomendaciones.',
        profile
      });
    } catch (error) {
      return res.status(500).json({ message: 'No fue posible registrar la compra en recomendaciones.' });
    }
  }
}

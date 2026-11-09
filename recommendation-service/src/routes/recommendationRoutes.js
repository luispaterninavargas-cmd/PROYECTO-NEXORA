import express from 'express';
import { RecommendationController } from '../controllers/RecommendationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();
const recommendationController = new RecommendationController();

router.get('/me', authMiddleware, (req, res) => recommendationController.getRecommendationsForUser(req, res));
router.post('/me', authMiddleware, (req, res) => recommendationController.getRecommendationsForUser(req, res));
router.get('/product/:id', authMiddleware, (req, res) => recommendationController.getRecommendationsForProduct(req, res));
router.post('/refresh', authMiddleware, (req, res) => recommendationController.refreshRecommendations(req, res));
router.post('/events', authMiddleware, (req, res) => recommendationController.recordRecommendationEvents(req, res));
router.post('/events/purchase', authMiddleware, (req, res) => recommendationController.registerPurchaseEvent(req, res));

export default router;

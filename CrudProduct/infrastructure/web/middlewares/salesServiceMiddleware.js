export default function salesServiceMiddleware(req, res, next) {
    if (req.user?.role !== "sales-service") {
        return res.status(403).json({
            message: "Acceso reservado al servicio de ventas"
        });
    }

    next();
}

import productService
    from "../../../application/services/productService.js";

class ProductController {

    async crearProducto(req, res) {

        try {

            const producto =
                await productService.crearProducto(req.body);

            return res.status(201).json({
                message: "Producto creado correctamente",
                producto
            });

        } catch (error) {

            return res.status(400).json({
                message: error.message
            });
        }
    }

    async getAll(req, res) {

        try {

            const productos =
                await productService.getAll();

            return res.status(200).json(productos);

        } catch (error) {

            return res.status(500).json({
                message: "Error al obtener los productos"
            });
        }
    }

    async getOne(req, res) {

        try {

            const { id } = req.params;

            const producto =
                await productService.getOne(id);

            if (!producto) {
                return res.status(404).json({
                    message: "Producto no encontrado"
                });
            }

            return res.status(200).json(producto);

        } catch (error) {

            if (
                error.message ===
                "El ID del producto no es válido"
            ) {
                return res.status(400).json({
                    message: error.message
                });
            }

            return res.status(500).json({
                message: "Error al obtener el producto"
            });
        }
    }

    async getByCategory(req, res) {

        try {

            const { categoria } = req.params;

            const productos =
                await productService.getByCategory(categoria);

            return res.status(200).json(productos);

        } catch (error) {

            return res.status(400).json({
                message: error.message
            });
        }
    }

    async actualizarProducto(req, res) {

        try {

            const { id } = req.params;

            const producto =
                await productService.update(
                    id,
                    req.body
                );

            if (!producto) {
                return res.status(404).json({
                    message: "Producto no encontrado"
                });
            }

            return res.status(200).json({
                message: "Producto actualizado correctamente",
                producto
            });

        } catch (error) {

            if (
                error.message ===
                "El ID del producto no es válido"
            ) {
                return res.status(400).json({
                    message: error.message
                });
            }

            return res.status(400).json({
                message: error.message
            });
        }
    }

    async adjustStock(req, res) {
        try {
            const { id } = req.params;
            const { quantity, operation } = req.body;
            const updated = await productService.adjustStock(id, quantity, operation);

            if (!updated) {
                return res.status(operation === "reserve" ? 409 : 404).json({
                    message: operation === "reserve"
                        ? "Producto inexistente o stock insuficiente"
                        : "Producto no encontrado"
                });
            }

            return res.status(200).json({ message: "Inventario actualizado" });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async eliminarProducto(req, res) {

        try {

            const { id } = req.params;

            const producto =
                await productService.eliminarProducto(id);

            if (!producto) {
                return res.status(404).json({
                    message: "Producto no encontrado"
                });
            }

            return res.status(200).json({
                message: "Producto eliminado correctamente",
                producto
            });

        } catch (error) {

            if (
                error.message ===
                "El ID del producto no es válido"
            ) {
                return res.status(400).json({
                    message: error.message
                });
            }

            return res.status(500).json({
                message: "Error interno del servidor"
            });
        }
    }
}

export default new ProductController();
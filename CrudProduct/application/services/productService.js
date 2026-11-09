import { ObjectId } from "mongodb";
import productRepository from "../../infrastructure/database/models/productRepository.js";

class ProductService {

    validarImagen(url) {
        if (typeof url !== "string" || url.trim() === "") {
            throw new Error("Cada imagen debe tener una URL válida");
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url.trim());
        } catch {
            throw new Error("Cada imagen debe tener una URL válida");
        }

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw new Error("Las imágenes deben usar una URL HTTP o HTTPS");
        }

        return url.trim();
    }

    validarImagenes(imagenes) {
        if (!Array.isArray(imagenes)) {
            throw new Error("Envía las imágenes en una lista");
        }

        if (imagenes.some((url) => typeof url !== "string")) {
            throw new Error("Cada imagen debe tener una URL válida");
        }

        const urls = imagenes
            .filter((url) => url.trim() !== "")
            .map((url) => this.validarImagen(url));

        if (urls.length < 3) {
            throw new Error("Se requieren al menos 3 imágenes del producto");
        }

        return urls;
    }

    validarProducto(data) {

        const {
            nombre,
            descripcion,
            categoria,
            marca,
            precio,
            stock
        } = data;

        if (
            !nombre ||
            typeof nombre !== "string" ||
            nombre.trim() === ""
        ) {
            throw new Error("El nombre es obligatorio");
        }

        if (
            !descripcion ||
            typeof descripcion !== "string" ||
            descripcion.trim() === ""
        ) {
            throw new Error("La descripción es obligatoria");
        }

        if (
            !categoria ||
            typeof categoria !== "string" ||
            categoria.trim() === ""
        ) {
            throw new Error("La categoría es obligatoria");
        }

        if (
            !marca ||
            typeof marca !== "string" ||
            marca.trim() === ""
        ) {
            throw new Error("La marca es obligatoria");
        }

        if (
            typeof precio !== "number" ||
            !Number.isFinite(precio) ||
            precio < 0
        ) {
            throw new Error(
                "El precio debe ser un número mayor o igual a 0"
            );
        }

        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            throw new Error(
                "El stock debe ser un número entero mayor o igual a 0"
            );
        }

        return this.validarImagenes(
            data.imagenes ?? (data.imagen ? [data.imagen] : [])
        );
    }

    validarId(id) {

        if (!ObjectId.isValid(id)) {
            throw new Error("El ID del producto no es válido");
        }
    }

    async crearProducto(data) {

        const imagenes = this.validarProducto(data);

        const producto = {
            nombre: data.nombre.trim(),
            descripcion: data.descripcion.trim(),
            categoria: data.categoria.trim(),
            marca: data.marca.trim(),
            precio: data.precio,
            stock: data.stock,
            imagenes,
            imagen: imagenes[0],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return await productRepository.crearProducto(producto);
    }

    async getAll() {
        return await productRepository.getAll();
    }

    async getOne(id) {

        this.validarId(id);

        return await productRepository.getOne(id);
    }

    async getByCategory(categoria) {

        if (
            !categoria ||
            typeof categoria !== "string" ||
            categoria.trim() === ""
        ) {
            throw new Error("La categoría es obligatoria");
        }

        return await productRepository.getByCategory(
            categoria.trim()
        );
    }

    async update(id, data) {

        this.validarId(id);

        const productoActual =
            await productRepository.getOne(id);

        if (!productoActual) {
            return null;
        }

        const datosActualizados = {};

        if (data.nombre !== undefined) {

            if (
                typeof data.nombre !== "string" ||
                data.nombre.trim() === ""
            ) {
                throw new Error(
                    "El nombre no puede estar vacío"
                );
            }

            datosActualizados.nombre =
                data.nombre.trim();
        }

        if (data.descripcion !== undefined) {

            if (
                typeof data.descripcion !== "string" ||
                data.descripcion.trim() === ""
            ) {
                throw new Error(
                    "La descripción no puede estar vacía"
                );
            }

            datosActualizados.descripcion =
                data.descripcion.trim();
        }

        if (data.categoria !== undefined) {

            if (
                typeof data.categoria !== "string" ||
                data.categoria.trim() === ""
            ) {
                throw new Error(
                    "La categoría no puede estar vacía"
                );
            }

            datosActualizados.categoria =
                data.categoria.trim();
        }

        if (data.marca !== undefined) {

            if (
                typeof data.marca !== "string" ||
                data.marca.trim() === ""
            ) {
                throw new Error(
                    "La marca no puede estar vacía"
                );
            }

            datosActualizados.marca =
                data.marca.trim();
        }

        if (data.precio !== undefined) {

            if (
                typeof data.precio !== "number" ||
                !Number.isFinite(data.precio) ||
                data.precio < 0
            ) {
                throw new Error(
                    "El precio debe ser un número mayor o igual a 0"
                );
            }

            datosActualizados.precio = data.precio;
        }

        if (data.stock !== undefined) {

            if (
                !Number.isInteger(data.stock) ||
                data.stock < 0
            ) {
                throw new Error(
                    "El stock debe ser un número entero mayor o igual a 0"
                );
            }

            datosActualizados.stock = data.stock;
        }

        if (data.imagenes !== undefined) {
            const imagenes = this.validarImagenes(data.imagenes);
            datosActualizados.imagenes = imagenes;
            datosActualizados.imagen = imagenes[0];
        } else if (data.imagen !== undefined) {
            const imagen = this.validarImagen(data.imagen);
            datosActualizados.imagen = imagen;

            if (Array.isArray(productoActual.imagenes) && productoActual.imagenes.length > 0) {
                datosActualizados.imagenes = [
                    imagen,
                    ...productoActual.imagenes.slice(1)
                ];
            }
        }

        if (Object.keys(datosActualizados).length === 0) {
            throw new Error(
                "Debe enviar al menos un campo para actualizar"
            );
        }

        datosActualizados.updatedAt = new Date();

        return await productRepository.update(
            id,
            datosActualizados
        );
    }

    async adjustStock(id, quantity, operation) {
        this.validarId(id);

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error("La cantidad debe ser un entero positivo");
        }

        if (!["reserve", "restore"].includes(operation)) {
            throw new Error("La operación de inventario no es válida");
        }

        return productRepository.adjustStock(id, quantity, operation);
    }

    async eliminarProducto(id) {

        this.validarId(id);

        const producto =
            await productRepository.getOne(id);

        if (!producto) {
            return null;
        }

        return await productRepository.eliminarProducto(id);
    }
}

export default new ProductService();
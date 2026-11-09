export default class Product {
    constructor({
        id = null,
        nombre,
        descripcion,
        categoria,
        precio,
        stock
    }) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.precio = precio;
        this.stock = stock;
    }
}
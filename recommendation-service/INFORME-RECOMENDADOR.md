# Informe técnico: sistema de recomendación de productos

## 1. Resumen ejecutivo

El recomendador de NEXORA es un microservicio que ordena productos disponibles según las interacciones recientes de cada usuario y algunas características del catálogo. La selección puede considerar categorías, búsquedas, marca, precio, descripción e inventario. Devuelve como máximo seis productos y explica las señales que influyeron en cada resultado.

Es un sistema de recomendación **híbrido basado en reglas y puntuación ponderada**. No es un modelo de aprendizaje automático: no entrena parámetros, no calcula embeddings ni conoce relaciones semánticas de complementariedad entre productos. Por ejemplo, puede relacionar un teclado con un monitor si comparten categoría o características textuales, pero no sabe por sí solo que un teclado es un accesorio complementario de un monitor.

## 2. Componentes y recorrido de una solicitud

1. El usuario inicia sesión y el frontend envía su token de autenticación.
2. El frontend carga en paralelo el catálogo, las recomendaciones y el carrito.
3. El API Gateway valida el token y reenvía las solicitudes de recomendaciones al microservicio.
4. El microservicio identifica al usuario desde el JWT, consulta sus acciones guardadas y obtiene los productos del servicio de catálogo.
5. Se excluyen productos sin inventario, vistos recientemente, comprados recientemente o presentes en el carrito actual.
6. Se calcula una puntuación por producto, se ordenan los resultados, se limita la concentración por categoría y se devuelven las explicaciones.
7. El frontend relaciona cada recomendación con el producto del catálogo por su ID y la muestra en la sección **«Para ti»**.

La aplicación registra las interacciones relevantes y las envía agrupadas para evitar una solicitud de actualización por cada evento individual.

## 3. Señales de usuario

| Acción | Peso | Uso |
|---|---:|---|
| Ver un producto | 0,5 | Señal ligera; el producto visto se excluye temporalmente |
| Enviar una búsqueda | 1,5 | Favorece productos cuyo nombre, descripción, marca o categoría coinciden con los términos |
| Añadir a favoritos | 3 | Señal de interés y referencia para comparar atributos |
| Añadir al carrito | 4 | Señal de intención de compra y referencia para comparar atributos |
| Compra aprobada | 6 | Señal fuerte, notificada por el microservicio de ventas |
| Impresión de recomendación | No puntúa | Registra que el conjunto fue presentado |
| Clic en recomendación | No puntúa | Registra la interacción y permite calcular una métrica de clics |

Las interacciones se ponderan por antigüedad. Para la señal de una acción se usa `peso × exp(-días / 30)`, con un mínimo de 25 % del peso. Las búsquedas se almacenan como texto, no aumentan el puntaje de categoría, y se comparan directamente con los atributos del producto.

Las búsquedas se registran al enviar el formulario, no por cada tecla. Abrir un producto recomendado registra tanto la vista como el clic. La vista también se registra al abrir un producto desde el catálogo.

## 4. Cálculo de recomendaciones personalizadas

Para cada producto disponible, se calculan estos componentes:

- **Interés por categoría:** suma ponderada de las acciones del usuario en la categoría, normalizada respecto de la categoría de mayor interés.
- **Similitud del producto:** compara productos marcados, agregados al carrito o comprados con el candidato. Considera marca (hasta 0,60), cercanía de precio (hasta 0,25) y coincidencia textual de nombre/descripción (hasta 0,15). Se utiliza la mejor coincidencia entre las interacciones.
- **Coincidencia con búsquedas:** compara palabras normalizadas —sin distinguir mayúsculas ni tildes— del término buscado con nombre, descripción, marca y categoría. Se aplica una reducción por antigüedad.
- **Disponibilidad:** agrega hasta 0,05 según el inventario; los productos sin stock se excluyen antes de puntuar.

La puntuación final se calcula así:

```text
min(1, 0,02
       + 0,50 × interés_de_categoria
       + 0,25 × similitud_de_producto
       + 0,20 × coincidencia_de_busqueda
       + hasta 0,05 × disponibilidad)
```

Los componentes normalizados están entre 0 y 1. El término constante `0,02` permite asignar una puntuación inicial a productos sin historial; el resultado se limita a 1. En un empate, el inventario puede influir en el orden.

### Usuarios sin historial

Sin acciones útiles para personalizar, los resultados se etiquetan como descubrimiento del catálogo. Los productos tienden a tener puntuaciones parecidas y pueden ordenarse por disponibilidad; no se debe presentar ese resultado como personalización aprendida.

## 5. Diversidad y exclusiones

- Se devuelven hasta **6 recomendaciones**.
- La primera selección permite hasta **2 productos por categoría**. Si no alcanza para llenar seis espacios, se agregan los mejores restantes, aunque repitan categoría.
- Se excluyen productos sin stock.
- Una vista excluye el producto exacto durante **7 días**.
- Una compra aprobada excluye el producto durante **30 días**.
- Los productos presentes en el carrito actual se excluyen. Al retirarlos, dejan de excluirse por carrito; la acción histórica de añadirlos aún puede influir en similitud.

Los períodos de exclusión son reglas de presentación y no borran el historial ni eliminan su señal de categoría.

## 6. Recomendaciones de productos relacionados

El backend también expone una operación de productos relacionados. Ordena candidatos por categoría y similitud de marca, precio y texto del producto seleccionado; admite productos de otras categorías cuando existe suficiente similitud de atributos.

**Estado de la interfaz:** la pantalla actual integra la sección personalizada «Para ti», pero no consulta esta operación para mostrar una sección «Productos relacionados» dentro del detalle del producto. Por eso, el cálculo de relacionados del backend no significa que se vea automáticamente al abrir una ficha.

La similitud disponible es una comparación aproximada, no una relación comercial explícita. Si se requiere que un monitor sugiera teclados, conviene modelar relaciones o atributos de compatibilidad (por ejemplo, tipo de accesorio, conectividad o uso), además de la comparación textual.

## 7. Explicabilidad y medición

Cada recomendación incluye ID, nombre, categoría, precio, puntuación, desglose de factores, razones en texto, explicación y origen del resultado. La interfaz muestra estos datos al desplegar **«¿Por qué te lo recomendamos?»**.

El campo que la interfaz denomina **«Afinidad estimada (heurística)»** proviene de una fórmula fija. No es una probabilidad calibrada ni una garantía de que el usuario vaya a comprar el producto.

Se registran eventos de impresión y clic. El perfil calcula `clics / impresiones` para las acciones guardadas recientes. Esta cifra es una métrica básica, no una tasa experimental de conversión: las impresiones se generan cuando se presenta el conjunto en la interfaz, no cuando se confirma que el usuario vio cada tarjeta en pantalla.

## 8. Persistencia, rendimiento y operación

- Los perfiles se guardan en MongoDB, en la colección `recommendation_profiles`, por identificador de usuario.
- Se conserva un máximo de **250 acciones por perfil** y cada registro acepta hasta **20 acciones**.
- En desarrollo, si MongoDB no está disponible, se usa almacenamiento en memoria temporal y el perfil se pierde al reiniciar.
- En producción, el microservicio no inicia si no logra conectar con MongoDB; esto evita operar silenciosamente sin persistencia.
- El catálogo se conserva en caché en memoria durante **15 segundos** y las solicitudes simultáneas comparten la misma consulta en curso.
- La caché es local a cada instancia del microservicio; no se comparte entre instancias.
- Si el catálogo falla, los productos de respaldo solo están habilitados en desarrollo. En producción, el error se devuelve y no se simula una recomendación exitosa.

Para producción se requiere configurar `MONGODB_URI`, `PRODUCTS_SERVICE`, `JWT_SECRET` y `NODE_ENV=production` en el entorno de despliegue. No se deben incluir secretos en el repositorio ni en este informe.

## 9. API del microservicio

Las rutas de recomendaciones requieren `Authorization: Bearer <token>` salvo la ruta de salud.

| Método y ruta | Función |
|---|---|
| `GET /health` | Comprueba que el servicio está activo |
| `GET /api/recommendations/me` | Obtiene recomendaciones del usuario autenticado; admite `cartProductIds` |
| `GET /api/recommendations/product/:id` | Calcula productos relacionados con un producto |
| `POST /api/recommendations/refresh` | Guarda acciones de comportamiento y devuelve recomendaciones actualizadas; admite `cartProductIds` |
| `POST /api/recommendations/events` | Registra impresiones y clics |
| `POST /api/recommendations/events/purchase` | Registra productos de una compra aprobada; se utiliza desde ventas |

Ejemplo del cuerpo de actualización:

```json
{
  "actions": [
    {
      "type": "search",
      "productName": "teclado inalámbrico"
    }
  ],
  "cartProductIds": ["id-de-producto-en-carrito"]
}
```

Tipos aceptados: `view`, `search`, `favorite`, `cart`, `purchase`, `recommendation_impression` y `recommendation_click`. Los eventos analíticos se envían a su ruta específica; `/refresh` está pensado para actualizar comportamiento y puntuaciones.

## 10. Límites y mejoras futuras

1. Las acciones de quitar de favoritos y eliminar del carrito no se guardan como señales negativas. La lista local de favoritos del navegador no es por sí sola el perfil persistente del recomendador.
2. El backend recibe los IDs del carrito actual desde el frontend para filtrarlos; a futuro podría obtenerlos de una fuente de servidor confiable.
3. El evento de compra se envía al recomendador después de aprobarse el pago. Si falla esa llamada, ventas registra la advertencia, pero no hay una cola ni reintento automático.
4. Los eventos analíticos y de comportamiento comparten el límite de 250 acciones; una gran cantidad de impresiones podría desplazar acciones antiguas útiles.
5. La similitud basada en palabras y atributos no comprende significado, compatibilidad ni complementariedad de productos.
6. La tasa de clics es orientativa; para evaluar calidad hacen falta identificadores de exposición, sesiones y métricas de conversión, además de pruebas con usuarios.
7. Las ponderaciones son reglas iniciales y deberían ajustarse con resultados medidos, no interpretarse como parámetros aprendidos automáticamente.

## 11. Pruebas y demostración

El servicio dispone de pruebas para persistencia obligatoria en producción, caché del catálogo, explicación, exclusiones temporales, similitud de atributos, coincidencia de búsqueda, diversidad y métricas de impresiones/clics.

Ejecutar pruebas:

```powershell
Push-Location recommendation-service
npm test
Pop-Location
```

Para una demostración funcional:

1. Desplegar/reiniciar el servicio de recomendaciones y desplegar el frontend actualizado.
2. Iniciar sesión con un usuario de prueba y abrir «Para ti».
3. Buscar un término presente en el nombre, marca o descripción de productos y enviar la búsqueda.
4. Actualizar las recomendaciones y observar si suben productos coincidentes.
5. Abrir un producto recomendado: el producto exacto debe dejar de aparecer durante el período de exclusión de vistas.
6. Añadir un producto al carrito y verificar que no aparezca mientras permanezca allí; retirarlo para que deje de excluirse por carrito.
7. Abrir «¿Por qué te lo recomendamos?» para mostrar las señales que contribuyeron al resultado.
8. Revisar en la pestaña Network del navegador las rutas `/recommendations/me`, `/recommendations/refresh` y `/recommendations/events`.

La duración real de exclusión por compra (30 días) no es práctica para una demostración manual; se verifica con la prueba automatizada.

## 12. Archivos principales

- `src/services/RecommendationService.js`: ponderación, perfil, puntuación, similitud, exclusiones, diversidad y caché del catálogo.
- `src/repositories/RecommendationRepository.js`: esquema y persistencia de acciones/perfiles.
- `src/controllers/RecommendationController.js`: autenticación de usuario, lectura de solicitudes y respuestas HTTP.
- `src/routes/recommendationRoutes.js`: rutas públicas y protegidas del servicio.
- `src/config/db.js`: conexión a MongoDB y comportamiento ante errores.
- `../frontend-microservicios/src/storefront/UserDashboard.jsx`: captura y envío de interacciones desde la tienda.
- `../frontend-microservicios/src/storefront/StoreCatalog.jsx`: tarjetas, explicaciones y presentación de afinidad.
- `../sales%20microservice/infrastructure/web/recommendationClient.js`: notificación de compra aprobada al recomendador.

## 13. Preguntas frecuentes para la sustentación

### ¿Qué problema resuelve el recomendador?

Ayuda al usuario a descubrir productos del catálogo que pueden interesarle, usando su actividad y características disponibles de los productos. También busca que la selección no repita únicamente una categoría.

### ¿Cómo describiría el algoritmo en una frase?

Es un recomendador híbrido basado en reglas: combina preferencias por categoría, coincidencia con búsquedas, similitud de atributos, inventario y reglas de exclusión; después ordena y selecciona hasta seis productos.

### ¿Es inteligencia artificial o aprendizaje automático?

No en su implementación actual. Es un algoritmo determinista de puntuación ponderada: para los mismos datos produce resultados equivalentes, no entrena un modelo ni aprende pesos automáticamente. La palabra «híbrido» se refiere a combinar varias señales y reglas, no a que contenga un modelo de machine learning.

### ¿Cómo se calcula el puntaje?

Se normalizan los factores a valores entre 0 y 1 y se aplica:

```text
min(1, 0,02
       + 0,50 × categoría
       + 0,25 × similitud
       + 0,20 × búsqueda
       + disponibilidad)
```

La disponibilidad aporta como máximo 0,05. El resultado más alto queda primero, sujeto a las exclusiones y la diversidad por categoría.

### ¿Por qué una compra pesa más que una vista?

Una compra aprobada es una señal más clara de interés que abrir una ficha. Por eso su peso es 6, mientras que una vista pesa 0,5. El algoritmo también reduce el efecto de acciones antiguas.

### ¿Qué pasa cuando el usuario compra un producto?

El servicio de ventas notifica al recomendador después de aprobarse el pago. El artículo comprado se excluye de recomendaciones durante 30 días y la acción también puede contribuir a inferir categorías y similitudes. La notificación no tiene reintento automático si falla.

### ¿Qué pasa si el usuario solo ve un producto?

La vista tiene un peso bajo. El producto exacto se excluye durante siete días para evitar repetirlo inmediatamente; la acción todavía puede aportar una señal ligera a la categoría.

### ¿Por qué se oculta un producto del carrito y cuándo vuelve?

Se excluyen los productos que actualmente están en el carrito, no todos los productos que alguna vez se añadieron. Al quitarlos, dejan de excluirse por esa regla. La acción histórica de añadirlos puede seguir aportando señal de interés.

### ¿Puede el sistema sugerir un teclado al ver un monitor?

Puede suceder si el catálogo y las señales crean una coincidencia, por ejemplo, si pertenecen a la misma categoría o coinciden sus características. No está garantizado: el sistema no tiene una relación semántica explícita de «accesorio compatible» o «producto complementario».

### ¿Qué significan la afinidad y la explicación mostradas?

La afinidad es un valor derivado de una fórmula fija y sirve para describir las señales calculadas; no es una probabilidad calibrada de compra. La explicación enumera factores como interés por categoría, similitud, búsqueda e inventario.

### ¿Dónde se guarda el historial?

En MongoDB, en la colección `recommendation_profiles`, asociado al ID del usuario autenticado. Se guardan como máximo 250 acciones por perfil. En desarrollo, si MongoDB no responde, se usa memoria temporal; en producción el servicio falla al iniciar para no perder historial en silencio.

### ¿Por qué guardar impresiones y clics si no modifican el puntaje?

Sirven para observar cuántos productos recomendados se presentaron y cuántos clics se registraron. En esta versión son métricas de diagnóstico, no señales que cambien las recomendaciones ni prueban por sí solas una conversión.

### ¿Qué función cumple el API Gateway?

Actúa como entrada del frontend a los microservicios. Reenvía la solicitud autenticada al servicio de recomendaciones, que consulta el perfil y el catálogo, calcula los resultados y devuelve la respuesta.

### ¿Cómo se reduce la latencia?

El frontend envía varias interacciones juntas en vez de pedir un recálculo por cada evento. El catálogo del servicio recomendador se conserva en caché durante 15 segundos y las solicitudes simultáneas pueden compartir la misma consulta al catálogo.

### ¿Cómo se comprueba que funciona?

Con pruebas automatizadas para puntuación, exclusiones temporales, carrito actual, búsquedas, similitud, diversidad, analítica, caché y el requisito de MongoDB en producción. También se puede demostrar desde la tienda y revisar las solicitudes en Network del navegador.

### ¿Qué limitaciones reconoce y qué mejoraría después?

La similitud por marca, precio y palabras no entiende el significado ni la compatibilidad; los pesos son reglas iniciales y la tasa de clics es orientativa. Como siguientes pasos, incorporaría relaciones explícitas de productos complementarios, reintentos durables para eventos de compra y métricas de conversión para evaluar y ajustar el algoritmo.

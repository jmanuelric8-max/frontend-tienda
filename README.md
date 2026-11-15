# MiTienda - Frontend

Frontend de tienda construido con Next.js. El catálogo y el carrito se obtienen
del backend Node.js en la carpeta `..\backend-tienda`.

## Ejecutar localmente

1. Configura y ejecuta el backend siguiendo
   [`backend-tienda/README.md`](../backend-tienda/README.md). Debe estar
   disponible en `http://localhost:3001`.
2. En esta carpeta crea `.env.local` con:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

   Si el backend usa otro puerto, actualiza la URL para que coincida.
3. En una terminal, instala dependencias si es necesario y ejecuta:

   ```bash
   npm install
   npm run dev
   ```

4. Abre `http://localhost:3000`.

El frontend crea un carrito en el backend la primera vez y conserva su ID en el
navegador. Si encuentra un carrito local guardado por una versión anterior, lo
migra al backend al iniciar.

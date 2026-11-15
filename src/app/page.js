
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { apiRequest, imagenUrl } from "@/lib/api";

const categorias = [
  "Todos",
  "Electrónica",
  "Ropa",
  "Accesorios",
  "Hogar",
  "Cuidado personal",
];

const CLAVE_CARRITO_ID = "mitienda-carrito-id";
const CLAVE_CARRITO_ANTERIOR = "mitienda-carrito";

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [carritoCargado, setCarritoCargado] = useState(false);
  const [carritoId, setCarritoId] = useState("");
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [operacionEnCurso, setOperacionEnCurso] = useState(false);
  const [errorConexion, setErrorConexion] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [mostrarResumenCompra, setMostrarResumenCompra] = useState(false);
  const [notificacion, setNotificacion] = useState("");
  const [compraRegistrada, setCompraRegistrada] = useState(null);
  const dialogoResumen = useRef(null);

  function normalizarCarrito(datos, catalogo) {
    return datos.productos.map((linea) => {
      const producto = catalogo.find(
        (item) => item.id === Number(linea.producto_id)
      );

      return {
        ...producto,
        id: Number(linea.producto_id),
        detalleId: Number(linea.detalle_id),
        nombre: linea.nombre,
        imagen: linea.imagen,
        precio: Number(linea.precio_unitario),
        cantidad: Number(linea.cantidad),
      };
    });
  }

  const dinero = (valor) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(valor);

  useEffect(() => {
    let cancelarCarga = false;

    const cargarTienda = async () => {
      try {
        const catalogo = await apiRequest("/api/productos");

        if (!Array.isArray(catalogo)) {
          throw new TypeError("El catálogo recibido de la API no es válido.");
        }

        const productosNormalizados = catalogo.map((producto) => ({
          ...producto,
          id: Number(producto.id),
          precio: Number(producto.precio),
        }));
        if (cancelarCarga) {
          return;
        }

        setProductos(productosNormalizados);

        let id = window.localStorage.getItem(CLAVE_CARRITO_ID);
        if (!id || !/^\d+$/.test(id) || Number(id) <= 0) {
          const nuevoCarrito = await apiRequest("/api/carritos", {
            method: "POST",
          });
          id = String(nuevoCarrito.carrito_id);

          if (!/^\d+$/.test(id) || Number(id) <= 0) {
            throw new TypeError("La API no devolvió un identificador válido.");
          }

          const carritoAnterior = window.localStorage.getItem(
            CLAVE_CARRITO_ANTERIOR
          );
          if (carritoAnterior) {
            let elementosAnteriores;

            try {
              elementosAnteriores = JSON.parse(carritoAnterior);
            } catch (error) {
              console.error("El carrito local anterior no es válido.", error);
              elementosAnteriores = [];
            }

            if (Array.isArray(elementosAnteriores)) {
              for (const elemento of elementosAnteriores) {
                if (
                  productosNormalizados.some(
                    (producto) => producto.id === elemento?.id
                  ) &&
                  Number.isSafeInteger(elemento.cantidad) &&
                  elemento.cantidad > 0
                ) {
                  await apiRequest(`/api/carritos/${id}/productos`, {
                    method: "POST",
                    body: JSON.stringify({
                      producto_id: elemento.id,
                      cantidad: elemento.cantidad,
                    }),
                  });
                }
              }
            }
          }

          window.localStorage.setItem(CLAVE_CARRITO_ID, id);
          window.localStorage.removeItem(CLAVE_CARRITO_ANTERIOR);
        }

        const datosCarrito = await apiRequest(`/api/carritos/${id}`);
        if (!cancelarCarga) {
          setCarritoId(id);
          setCarrito(normalizarCarrito(datosCarrito, productosNormalizados));
          setErrorConexion("");
        }
      } catch (error) {
        console.error("No se pudo conectar con la tienda.", error);
        if (!cancelarCarga) {
          setErrorConexion(error.message);
          setNotificacion("No se pudo conectar con el backend de la tienda.");
        }
      } finally {
        if (!cancelarCarga) {
          setCarritoCargado(true);
          setCargandoProductos(false);
        }
      }
    };

    cargarTienda();
    return () => {
      cancelarCarga = true;
    };
  }, []);

  async function actualizarCarrito(mutacion, mensajeExito) {
    if (!carritoId || operacionEnCurso) {
      return;
    }

    setOperacionEnCurso(true);
    try {
      await mutacion();
      const datosCarrito = await apiRequest(`/api/carritos/${carritoId}`);
      setCarrito(normalizarCarrito(datosCarrito, productos));
      setErrorConexion("");
      setNotificacion(mensajeExito);
    } catch (error) {
      console.error("No se pudo actualizar el carrito.", error);
      setNotificacion(error.message);
    } finally {
      setOperacionEnCurso(false);
    }
  }

  useEffect(() => {
    if (!notificacion) {
      return;
    }

    const temporizador = window.setTimeout(
      () => setNotificacion(""),
      2500
    );

    return () => window.clearTimeout(temporizador);
  }, [notificacion]);

  useEffect(() => {
    const dialogo = dialogoResumen.current;

    if (!dialogo) {
      return;
    }

    if (mostrarResumenCompra && !dialogo.open) {
      dialogo.showModal();
    } else if (!mostrarResumenCompra && dialogo.open) {
      dialogo.close();
    }
  }, [mostrarResumenCompra]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const coincideNombre = producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());

      const coincideCategoria =
        categoria === "Todos" ||
        producto.categoria === categoria;

      return coincideNombre && coincideCategoria;
    });
  }, [busqueda, categoria, productos]);

  function agregar(producto) {
    return actualizarCarrito(
      () =>
        apiRequest(`/api/carritos/${carritoId}/productos`, {
          method: "POST",
          body: JSON.stringify({
            producto_id: producto.id,
            cantidad: 1,
          }),
        }),
      `${producto.nombre} se agregó al carrito.`
    );
  }

  function cambiarCantidad(item, cambio) {
    const cantidad = item.cantidad + cambio;
    const ruta = `/api/carritos/${carritoId}/productos/${item.detalleId}`;

    return actualizarCarrito(
      () =>
        apiRequest(ruta, cantidad > 0
          ? {
              method: "PUT",
              body: JSON.stringify({ cantidad }),
            }
          : { method: "DELETE" }),
      cantidad > 0
        ? "Cantidad actualizada."
        : `${item.nombre} se quitó del carrito.`
    );
  }

  function vaciarCarrito() {
    return actualizarCarrito(
      () => apiRequest(`/api/carritos/${carritoId}`, { method: "DELETE" }),
      "Carrito vaciado."
    );
  }

  const cantidadTotal = carrito.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  function finalizarCompra() {
    if (carrito.length === 0) {
      setNotificacion("Tu carrito está vacío.");
      return;
    }

    setCompraRegistrada(null);
    setMostrarResumenCompra(true);
  }

  async function confirmarCompra() {
    if (!carritoId || carrito.length === 0 || operacionEnCurso) {
      return;
    }

    setOperacionEnCurso(true);
    try {
      const resultado = await apiRequest(
        `/api/carritos/${carritoId}/compras`,
        { method: "POST" }
      );
      const nuevoCarritoId = String(resultado.carrito_id);

      if (
        !Number.isSafeInteger(Number(resultado.compra_id)) ||
        Number(resultado.compra_id) <= 0 ||
        !/^\d+$/.test(nuevoCarritoId) ||
        Number(nuevoCarritoId) <= 0 ||
        !Number.isFinite(Number(resultado.total))
      ) {
        throw new TypeError("La API no devolvió los datos de compra válidos.");
      }

      setCompraRegistrada({
        id: Number(resultado.compra_id),
        total: Number(resultado.total),
        cantidad: cantidadTotal,
      });
      setCarritoId(nuevoCarritoId);
      setCarrito([]);
      window.localStorage.setItem(CLAVE_CARRITO_ID, nuevoCarritoId);
      setErrorConexion("");
      setNotificacion("Tu compra se guardó correctamente.");
    } catch (error) {
      console.error("No se pudo guardar la compra.", error);
      setNotificacion(error.message);
    } finally {
      setOperacionEnCurso(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      {notificacion && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-center font-medium text-white shadow-lg"
        >
          {notificacion}
        </div>
      )}

      {/* Encabezado */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <a href="#" className="text-2xl font-black text-indigo-700">
            MiTienda<span className="text-gray-800">.</span>
          </a>

          <div className="min-w-48 flex-1 md:max-w-md">
            <input
              type="search"
              aria-label="Buscar productos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 px-5 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setMostrarCarrito(!mostrarCarrito)}
            className="rounded-full bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
          >
            🛒 Carrito ({cantidadTotal})
          </button>
        </div>
      </header>

      {/* Banner */}
      <section className="mx-auto max-w-7xl px-5 pt-8">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-800 to-violet-600 px-7 py-12 text-white md:px-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-200">
            Tu tienda online
          </p>
          <h1 className="max-w-xl text-3xl font-black md:text-5xl">
            Encuentra lo que necesitas, al mejor precio.
          </h1>
          <p className="mt-4 max-w-lg text-indigo-100">
            Explora nuestros productos y agrega tus favoritos al carrito.
          </p>
        </div>
      </section>

      {/* Catálogo y carrito */}
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-3">
        <section className={mostrarCarrito ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Nuestros productos</h2>
              <p className="mt-1 text-sm text-gray-500">
                {cargandoProductos
                  ? "Cargando productos..."
                  : `${productosFiltrados.length} productos encontrados`}
              </p>
            </div>
          </div>

          {errorConexion && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              No se pudo cargar la tienda: {errorConexion}
            </p>
          )}

          {/* Categorías */}
          <div className="mb-7 flex flex-wrap gap-2">
            {categorias.map((item) => (
              <button
                key={item}
                onClick={() => setCategoria(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  categoria === item
                    ? "bg-indigo-700 text-white"
                    : "border border-gray-200 bg-white hover:border-indigo-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Productos */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {productosFiltrados.map((producto) => (
              <article
                key={producto.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative flex h-44 items-center justify-center bg-gray-100">
                  {producto.imagen ? (
                    <Image
                      src={imagenUrl(producto.imagen)}
                      alt={producto.nombre}
                      width={640}
                      height={440}
                      unoptimized
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <span className="text-sm text-gray-500">
                      Imagen no disponible
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {producto.categoria}
                  </span>

                  <h3 className="mt-2 min-h-12 font-bold">
                    {producto.nombre}
                  </h3>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xl font-extrabold">
                      {dinero(producto.precio)}
                    </span>

                    <button
                      onClick={() => agregar(producto)}
                      disabled={!carritoCargado || !carritoId || operacionEnCurso}
                      className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"
                    >
                      Agregar +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {productosFiltrados.length === 0 && (
            <p className="rounded-xl bg-white p-8 text-center text-gray-500">
              No encontramos productos con esa búsqueda.
            </p>
          )}
        </section>

        {/* Panel del carrito */}
        {mostrarCarrito && (
          <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">Tu carrito</h2>
              <button
                onClick={() => setMostrarCarrito(false)}
                className="text-gray-500 hover:text-gray-900"
                aria-label="Cerrar carrito"
              >
                ✕
              </button>
            </div>

            {carrito.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                Aún no has agregado productos.
              </p>
            ) : (
              <>
                <div className="space-y-5">
                  {carrito.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-gray-100 pb-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {item.imagen && (
                            <Image
                              src={imagenUrl(item.imagen)}
                              alt=""
                              width={64}
                              height={64}
                              unoptimized
                              className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 object-contain p-1"
                            />
                          )}
                          <div>
                            <p className="font-semibold">{item.nombre}</p>
                            <p className="text-sm text-gray-500">
                              {dinero(item.precio)} por unidad
                            </p>
                          </div>
                        </div>
                        <p className="font-bold">
                          {dinero(item.precio * item.cantidad)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => cambiarCantidad(item, -1)}
                          disabled={operacionEnCurso}
                          aria-label={`Quitar una unidad de ${item.nombre}`}
                          className="h-8 w-8 rounded-lg border hover:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="font-semibold">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => cambiarCantidad(item, 1)}
                          disabled={operacionEnCurso}
                          aria-label={`Agregar una unidad de ${item.nombre}`}
                          className="h-8 w-8 rounded-lg border hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span className="text-indigo-700">
                    {dinero(total)}
                  </span>
                </div>

                <button
                  onClick={finalizarCompra}
                  disabled={operacionEnCurso}
                  className="mt-5 w-full rounded-xl bg-indigo-700 py-3 font-bold text-white hover:bg-indigo-800"
                >
                  Finalizar compra
                </button>

                <button
                  onClick={vaciarCarrito}
                  disabled={operacionEnCurso}
                  className="mt-3 w-full py-2 text-sm text-red-600 hover:underline"
                >
                  Vaciar carrito
                </button>
              </>
            )}
          </aside>
        )}
      </div>

      <footer className="border-t bg-white px-5 py-8 text-center text-sm text-gray-500">
        © 2026 MiTienda. Todos los derechos reservados.
      </footer>

      <dialog
        ref={dialogoResumen}
        onClose={() => setMostrarResumenCompra(false)}
        aria-labelledby="titulo-resumen-compra"
        aria-describedby="aviso-demostracion-compra"
        className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-0 text-gray-800 shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                MiTienda
              </p>
              <h2
                id="titulo-resumen-compra"
                className="mt-1 text-2xl font-black"
              >
                Resumen de compra
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setMostrarResumenCompra(false)}
              aria-label="Cerrar resumen de compra"
              className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          {compraRegistrada ? (
            <div className="rounded-xl bg-green-50 p-5 text-green-900">
              <h3 className="text-lg font-bold">¡Compra guardada!</h3>
              <p className="mt-2">
                Número de compra: <strong>#{compraRegistrada.id}</strong>
              </p>
              <p>
                {compraRegistrada.cantidad} productos ·{" "}
                {dinero(compraRegistrada.total)}
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {carrito.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4"
                  >
                    <div>
                      <p className="font-semibold">{item.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {item.cantidad} × {dinero(item.precio)}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold">
                      {dinero(item.precio * item.cantidad)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex justify-between text-lg font-black">
                <span>
                  Total ({cantidadTotal}{" "}
                  {cantidadTotal === 1 ? "producto" : "productos"})
                </span>
                <span className="text-indigo-700">{dinero(total)}</span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setMostrarResumenCompra(false)}
            disabled={operacionEnCurso}
            className="mt-5 w-full rounded-xl bg-indigo-700 py-3 font-bold text-white hover:bg-indigo-800"
          >
            Seguir comprando
          </button>
          {!compraRegistrada && (
            <button
              type="button"
              onClick={confirmarCompra}
              disabled={operacionEnCurso}
              className="mt-3 w-full rounded-xl bg-green-700 py-3 font-bold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60"
            >
              {operacionEnCurso ? "Guardando compra..." : "Confirmar compra"}
            </button>
          )}
        </div>
      </dialog>
    </main>
  );
}

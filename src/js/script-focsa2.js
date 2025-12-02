// ┌───────────────────────────────────────────────┐
// │ Módulo: FOCSA                                 │
// │ Script: script-focsa2.js (versión unificada)  │
// │ Incluye: agregos + carrito + resumen + RPC    │
// └───────────────────────────────────────────────┘
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* Configuración Supabase (usa tus credenciales reales) */
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);
window.supabase = supabase;

/* Estado global */
let menu = [];
let envases = [];
let cantidades = {};           // conteo por nombre (modo rápido)
let cantidadesEnvases = {};    // conteo por nombre
let carrito = [];              // [{ id, nombre, cantidad, precio, agregos[], subtotal }]
let productoSeleccionado = null;
let agregosSeleccionados = [];

/* Inicialización */
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 FOCSA — Inicialización");
  console.log("🚀 Script FOCSA inicializado");

  await cargarMenuEspecial();
  await cargarEnvases();
  inicializarFiltros();
  renderCarrito();
  calcularTotales();

  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (pedidoId) {
    const seg = document.getElementById("seguimiento-pedido");
    if (seg) seg.style.display = "block";
  }

  renderizarSeguimientoPedidos();
  console.groupEnd();
});

/* =========================
   Carga de menú y envases
   ========================= */
async function cargarMenuEspecial() {
  console.group("📥 Carga de menú");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) { console.error("❌ Error al cargar menú:", error); console.groupEnd(); return; }
  menu = data || [];
  console.log("✅ Menú cargado:", menu.length, "items");
  renderMenuEspecial(menu);
  console.groupEnd();
}

async function cargarEnvases() {
  console.group("📥 Carga de envases");
  const { data, error } = await supabase
    .from("menu_item").select("*")
    .eq("categoria", "Envases")
    .eq("disponible", true)
    .gt("stock", 0)
    .order("precio", { ascending: true });
  if (error) { console.error("❌ Error al cargar envases:", error); console.groupEnd(); return; }
  envases = data || [];
  console.log("🧴 Envases cargados:", envases.length);
  renderEnvases(envases);
  console.groupEnd();
}

/* =========================
   Filtros horizontales
   ========================= */
function inicializarFiltros() {
  console.group("🔧 Inicialización de filtros horizontales");
  const barraFiltros = document.getElementById("barra-filtros");
  if (!barraFiltros) { console.warn("⚠️ No se encontró el contenedor de filtros"); console.groupEnd(); return; }

  barraFiltros.innerHTML = "";
  const categoriasUnicas = [...new Set(menu.map(item => item.categoria))];
  if (!categoriasUnicas.includes("Envases")) categoriasUnicas.push("Envases");

  ["todos", ...categoriasUnicas].forEach(cat => {
    const chip = document.createElement("button");
    chip.className = "filtro-chip";
    chip.textContent = cat;
    chip.dataset.cat = cat;
    chip.onclick = () => {
      document.querySelectorAll(".filtro-chip").forEach(c => c.classList.remove("activo"));
      chip.classList.add("activo");
      filtrarMenu(cat);
    };
    barraFiltros.appendChild(chip);
  });

  const first = barraFiltros.querySelector(".filtro-chip");
  if (first) { first.classList.add("activo"); filtrarMenu("todos"); }

  console.log("✅ Filtros generados:", categoriasUnicas);
  console.groupEnd();
}

/* =========================
   Renderizado de tarjetas
   ========================= */
function renderGrupoTarjetas(lista, contenedorId, destinoCantidades) {
  console.group(`🖼️ Renderizado tarjetas en ${contenedorId}`);
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) { console.warn(`⚠️ No se encontró contenedor: ${contenedorId}`); console.groupEnd(); return; }

  contenedor.innerHTML = "";
  lista.forEach(item => {
    const card = document.createElement("div");
    card.className = "producto-card";
    card.innerHTML = `
      <h3>${escapeHtml(item.nombre)}</h3>
      <p>${escapeHtml(item.descripcion || "")}</p>
      <div class="precio-agregar">
        <span>${Number(item.precio).toFixed(2)} CUP</span>
        <input type="number" min="0" value="${destinoCantidades[item.nombre] || 0}"
               data-name="${escapeHtml(item.nombre)}" data-id="${item.id}" data-price="${item.precio}" />
      </div>
      <div class="acciones-card">
        <button class="btn-secundario" data-personalizar="${item.id}">Personalizar</button>
        <button class="btn-secundario" data-anadir="${item.id}">Añadir rápido</button>
      </div>
    `;
    contenedor.appendChild(card);
  });

  // Control cantidad directa + totales
  contenedor.querySelectorAll("input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      destinoCantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });

  // Botón Personalizar (abre modal de agregos si tiene, si no añade directo)
  contenedor.querySelectorAll("button[data-personalizar]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalAgregos(parseInt(btn.dataset.personalizar)));
  });

  // Botón Añadir rápido (sin agregos)
  contenedor.querySelectorAll("button[data-anadir]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.anadir);
      const item = [...menu, ...envases].find(i => i.id === id);
      if (!item) return;
      agregarAlCarrito({
        id: item.id,
        nombre: item.nombre,
        cantidad: 1,
        precio: Number(item.precio),
        agregos: [],
      });
    });
  });

  console.log("✅ Tarjetas renderizadas:", lista.length);
  console.groupEnd();
}

function renderMenuEspecial(lista) { renderGrupoTarjetas(lista, "menu-especial", cantidades); }
function renderEnvases(lista) { renderGrupoTarjetas(lista, "envases-contenedor", cantidadesEnvases); }

/* =========================
   Filtro
   ========================= */
function filtrarMenu(categoriaSeleccionada = "todos") {
  console.group("🔍 Filtro de categoría");
  console.log("📌 Categoría seleccionada:", categoriaSeleccionada);

  if (categoriaSeleccionada === "todos") {
    renderMenuEspecial(menu);
    renderEnvases(envases);
  } else if (categoriaSeleccionada === "Envases") {
    renderGrupoTarjetas(envases.filter(i => i.categoria === "Envases"), "envases-contenedor", cantidadesEnvases);
    const ms = document.getElementById("menu-especial");
    if (ms) ms.innerHTML = "";
  } else {
    renderGrupoTarjetas(menu.filter(i => i.categoria === categoriaSeleccionada), "menu-especial", cantidades);
    const ec = document.getElementById("envases-contenedor");
    if (ec) ec.innerHTML = "";
  }

  console.groupEnd();
}
window.filtrarMenu = filtrarMenu;

/* =========================
   Totales
   ========================= */
function calcularTotales() {
  console.group("🧮 Cálculo de totales");
  let total = 0, cantidadTotal = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) { total += cant * item.precio; cantidadTotal += cant; }
  }
  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) { total += cant * item.precio; cantidadTotal += cant; }
  }

  const totalEl = document.getElementById("total-cup");
  const itemsEl = document.getElementById("total-items");
  if (totalEl) totalEl.textContent = total.toFixed(2);
  if (itemsEl) itemsEl.textContent = cantidadTotal;

  console.log("🧮 Totales actualizados:", { total, cantidadTotal });
  console.groupEnd();
}

/* =========================
   Agregos: modal + lógica
   ========================= */
async function abrirModalAgregos(itemId) {
  console.group("🧩 Modal de agregos — abrir");
  productoSeleccionado = [...menu, ...envases].find(i => i.id === itemId);
  agregosSeleccionados = [];

  if (!productoSeleccionado) { console.warn("⚠️ Producto no encontrado:", itemId); console.groupEnd(); return; }

  // Set UI producto
  document.getElementById("producto-nombre").textContent = productoSeleccionado.nombre;
  document.getElementById("producto-imagen").src = productoSeleccionado.imagen_url || "https://via.placeholder.com/600x400";
  document.getElementById("producto-descripcion").textContent = productoSeleccionado.descripcion || "";
  document.getElementById("producto-precio").textContent = Number(productoSeleccionado.precio).toFixed(2);

  // Cargar agregos del producto
  const { data: rels, error } = await supabase
    .from("menu_item_agrego")
    .select("*, menu_agrego(*)")
    .eq("item_id", itemId)
    .order("orden", { ascending: true });

  const lista = document.getElementById("lista-agregos");
  lista.innerHTML = "";

  if (error) { console.error("❌ Error al obtener agregos:", error); }
  const agregos = rels || [];

  if (agregos.length === 0) {
    lista.innerHTML = `<p>Este producto no tiene agregos configurados. Puede añadirlo directo al carrito.</p>`;
  } else {
    agregos.forEach(rel => {
      const item = rel.menu_agrego;
      const div = document.createElement("div");
      div.className = "agrego-opcion";
      const requerido = rel.requerido ? " (requerido)" : "";
      div.innerHTML = `
        <label>
          <input type="checkbox"
                 data-nombre="${escapeHtml(item.nombre)}"
                 data-precio="${Number(item.precio)}"
                 data-cat="${escapeHtml(item.categoria_agrego || "extra")}"
                 data-requerido="${rel.requerido ? 1 : 0}" />
          ${escapeHtml(item.emoji || "")} ${escapeHtml(item.nombre)} (+${Number(item.precio).toFixed(2)} CUP)${requerido}
        </label>
      `;
      lista.appendChild(div);
    });
  }

  // Listeners de selección
  lista.querySelectorAll("input[type='checkbox']").forEach(chk => {
    chk.addEventListener("change", () => {
      const nombre = chk.dataset.nombre;
      const precio = parseFloat(chk.dataset.precio);
      if (chk.checked) {
        agregosSeleccionados.push({ nombre, precio });
      } else {
        agregosSeleccionados = agregosSeleccionados.filter(a => a.nombre !== nombre);
      }
      actualizarPrecioTotal();
    });
  });

  actualizarPrecioTotal();
  document.getElementById("modal-agregos").style.display = "flex";
  console.groupEnd();
}

function actualizarPrecioTotal() {
  let total = Number(productoSeleccionado?.precio || 0);
  agregosSeleccionados.forEach(a => total += a.precio);
  const el = document.getElementById("precio-total");
  if (el) el.textContent = total.toFixed(2);
}

/* Añadir al carrito desde agregos */
document.getElementById("btn-agregar-carrito")?.addEventListener("click", () => {
  console.group("➕ Añadir al carrito desde modal");
  // Validar requeridos si aplica
  const requeridos = Array.from(document.querySelectorAll("#lista-agregos input[data-requerido='1']"));
  const algunoRequerido = requeridos.length > 0;
  const seleccionRequeridos = requeridos.some(r => r.checked);
  if (algunoRequerido && !seleccionRequeridos) {
    alert("Seleccione al menos un agregado requerido antes de continuar.");
    console.warn("❌ Falta agregado requerido");
    console.groupEnd();
    return;
  }

  const subtotal = Number(productoSeleccionado.precio) + agregosSeleccionados.reduce((s, a) => s + a.precio, 0);
  agregarAlCarrito({
    id: productoSeleccionado.id,
    nombre: productoSeleccionado.nombre,
    cantidad: 1,
    precio: Number(productoSeleccionado.precio),
    agregos: [...agregosSeleccionados],
  }, subtotal);

  cerrarModalAgregos();
  console.groupEnd();
});

document.getElementById("btn-cancelar-agregos")?.addEventListener("click", cerrarModalAgregos);
document.getElementById("modal-close-agregos")?.addEventListener("click", cerrarModalAgregos);

function cerrarModalAgregos() {
  const modal = document.getElementById("modal-agregos");
  if (modal) modal.style.display = "none";
}

/* =========================
   Carrito
   ========================= */
function agregarAlCarrito(prod, subtotalOverride) {
  const subtotal = typeof subtotalOverride === "number"
    ? subtotalOverride
    : Number(prod.precio) + (prod.agregos || []).reduce((s, a) => s + Number(a.precio), 0);

  carrito.push({
    id: prod.id,
    nombre: prod.nombre,
    cantidad: prod.cantidad || 1,
    precio: Number(prod.precio),
    agregos: prod.agregos || [],
    subtotal: subtotal,
  });
  renderCarrito();
}

function renderCarrito() {
  const cont = document.getElementById("carrito-items");
  if (!cont) return;
  cont.innerHTML = "";

  let total = 0;
  carrito.forEach((prod, index) => {
    const div = document.createElement("div");
    div.className = "carrito-item";

    let agregosHTML = "";
    if (prod.agregos && prod.agregos.length > 0) {
      agregosHTML = "<ul>" + prod.agregos.map(a => `<li>${escapeHtml(a.nombre)} (+${Number(a.precio).toFixed(2)} CUP)</li>`).join("") + "</ul>";
    }

    div.innerHTML = `
      <strong>${escapeHtml(prod.nombre)} x${prod.cantidad}</strong>
      Precio base: ${Number(prod.precio).toFixed(2)} CUP
      ${agregosHTML}
      Subtotal: ${Number(prod.subtotal).toFixed(2)} CUP
      <button class="btn-secundario" data-eliminar="${index}">❌ Eliminar</button>
    `;
    cont.appendChild(div);
    total += prod.subtotal * prod.cantidad;
  });

  const totalEl = document.getElementById("carrito-total");
  if (totalEl) totalEl.textContent = total.toFixed(2);

  // Eliminar elemento
  cont.querySelectorAll("button[data-eliminar]").forEach(btn => {
    btn.addEventListener("click", () => {
      carrito.splice(parseInt(btn.dataset.eliminar), 1);
      renderCarrito();
    });
  });
}

/* Abrir modal de resumen desde carrito */
document.getElementById("btn-revisar-pedido")?.addEventListener("click", abrirModalResumen);

/* =========================
   Resumen y envío
   ========================= */
function abrirModalResumen() {
  console.group("🧾 Resumen — abrir modal");
  const cont = document.getElementById("contenido-resumen");
  if (!cont) { console.warn("⚠️ No contenedor de resumen"); console.groupEnd(); return; }

  cont.innerHTML = "";
  // Datos cliente
  const cliente = document.getElementById("cliente")?.value.trim();
  const piso = document.getElementById("piso")?.value.trim();
  const apartamento = document.getElementById("apartamento")?.value.trim();
  const telefono = document.getElementById("telefono")?.value.trim();
  const unirse = document.getElementById("unirseGrupo")?.checked;

  if (!cliente || !piso || !apartamento) {
    alert("Complete los datos del cliente (Nombre, Piso, Apartamento).");
    console.warn("❌ Datos cliente incompletos");
    console.groupEnd();
    return;
  }
  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase && envases.length > 0) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    console.groupEnd();
    return;
  }

  cont.innerHTML += `
    <div class="cliente-datos">
      <p><strong>Cliente:</strong> ${escapeHtml(cliente)}</p>
      <p><strong>Piso:</strong> ${escapeHtml(piso)}</p>
      <p><strong>Apartamento:</strong> ${escapeHtml(apartamento)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono || "—")}</p>
      <p><strong>Grupo La Casona:</strong> ${unirse ? "✅ Sí desea unirse" : "❌ No desea unirse"}</p>
    </div>
    <hr />
  `;

  let total = 0;
  carrito.forEach(prod => {
    let agregosHTML = "";
    if (prod.agregos?.length) {
      agregosHTML = "<ul>" + prod.agregos.map(a => `<li>${escapeHtml(a.nombre)} (+${Number(a.precio).toFixed(2)} CUP)</li>`).join("") + "</ul>";
    }
    cont.innerHTML += `
      <div class="producto-lineal">
        <div class="producto-izquierda"><strong>${escapeHtml(prod.nombre)}</strong></div>
        <div class="producto-derecha">
          <span>x${prod.cantidad}</span>
          ${agregosHTML}
          <span>= ${Number(prod.subtotal * prod.cantidad).toFixed(2)} CUP</span>
        </div>
      </div>
    `;
    total += prod.subtotal * prod.cantidad;
  });

  cont.innerHTML += `<p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>`;
  const modal = document.getElementById("modal-resumen");
  if (modal) modal.style.display = "flex";
  console.groupEnd();
}

document.getElementById("btn-confirmar-pedido")?.addEventListener("click", enviarPedido);
document.getElementById("btn-cancelar-pedido")?.addEventListener("click", cerrarModalResumen);
document.getElementById("modal-close-resumen")?.addEventListener("click", cerrarModalResumen);

async function enviarPedido() {
  console.group("📲 Enviar pedido");
  const cliente = document.getElementById("cliente")?.value.trim();
  const piso = document.getElementById("piso")?.value.trim();
  const apartamento = document.getElementById("apartamento")?.value.trim();
  const telefono = document.getElementById("telefono")?.value.trim();
  const unirse = document.getElementById("unirseGrupo")?.checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente (Nombre, Piso, Apartamento).");
    console.warn("❌ Datos incompletos para WhatsApp / RPC");
    console.groupEnd(); return;
  }

  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase && envases.length > 0) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    console.groupEnd(); return;
  }

  // Construir items para RPC / WhatsApp
  const items = carrito.map(prod => ({
    nombre: prod.nombre,
    cantidad: prod.cantidad,
    precio: prod.precio,
    subtotal: Number(prod.subtotal * prod.cantidad),
    agregos: (prod.agregos || []).map(a => ({ nombre: a.nombre, precio: a.precio }))
  }));

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const grupoTexto = unirse ? "✅ Desea unirse al grupo" : "❌ No desea unirse al grupo";
  const cuerpoItems = items.map(i => {
    const ag = i.agregos?.length ? "\n   " + i.agregos.map(a => `• ${a.nombre} (+${Number(a.precio).toFixed(2)} CUP)`).join("\n   ") : "";
    return `- ${i.nombre} x${i.cantidad} = ${Number(i.subtotal).toFixed(2)} CUP${ag}`;
  }).join("\n");

  const mensaje = `🧾 Pedido FOCSA
Cliente: ${cliente}
Piso: ${piso}
Apartamento: ${apartamento}
Teléfono: ${telefono || "—"}
${grupoTexto}
${cuerpoItems}
Total: ${total.toFixed(2)} CUP`;

  // Abrir WhatsApp
  const url = `https://wa.me/+5350977340?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
  console.log("📤 WhatsApp abierto con mensaje");

  // Guardar en Supabase
  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: items,
    p_canal: "whatsapp",
  });

  if (error) {
    console.error("❌ Error RPC:", error);
    alert("Hubo un problema al registrar el pedido.");
  } else {
    const pedidoId = data?.[0]?.pedido_id;
    if (pedidoId) {
      localStorage.setItem("pedido_id_actual", pedidoId);
      const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
      historial.push(pedidoId);
      localStorage.setItem("historial_pedidos", JSON.stringify(historial));
      renderizarSeguimientoPedidos();
      console.log("📥 Pedido registrado con ID:", pedidoId);
    } else {
      console.warn("⚠️ No se devolvió pedido_id");
    }

    // Limpieza
    carrito = [];
    renderCarrito();
    cerrarModalResumen();
    cantidades = {};
    cantidadesEnvases = {};
    filtrarMenu("todos");
    calcularTotales();
    mostrarSeguimientoPedido();
  }
  console.groupEnd();
}

function cerrarModalResumen() {
  const modal = document.getElementById("modal-resumen");
  if (modal) modal.style.display = "none";
}

/* =========================
   Seguimiento de pedidos
   ========================= */
function mostrarSeguimientoPedido() {
  const seg = document.getElementById("seguimiento-pedido");
  if (seg) seg.style.display = "block";
  iniciarSeguimiento();
}
window.mostrarSeguimientoPedido = mostrarSeguimientoPedido;

function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
  setInterval(() => verificarIntegridadPedido(pedidoId), 10000);
}

async function verificarIntegridadPedido(pedidoId) {
  console.group("🔎 Seguimiento del pedido");
  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  if (error || !data) { console.warn("⚠️ Error o pedido no encontrado"); console.groupEnd(); return; }

  const estado = data.estado_actual || "⏳ En espera";
  const estadoEl = document.getElementById("estado-actual");
  if (estadoEl) estadoEl.textContent = `🧾 Estado: ${estado}`;

  const btnEntregar = document.getElementById("btn-entregado");
  if (btnEntregar) {
    btnEntregar.disabled = estado !== "entregado";
    btnEntregar.onclick = () => {
      if (estado === "entregado") {
        const bloque = document.getElementById("bloque-criterio");
        if (bloque) bloque.style.display = "block";
      }
    };
  }
  console.groupEnd();
}

async function renderizarSeguimientoPedidos() {
  console.group("📦 Seguimiento múltiple de pedidos");
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  const contenedor = document.getElementById("seguimiento-multiple");
  if (!contenedor) { console.groupEnd(); return; }

  contenedor.innerHTML = "";
  for (const pedidoId of historial.slice(-5).reverse()) {
    const { data, error } = await supabase
      .from("vw_integridad_pedido")
      .select("*")
      .eq("pedido_id", pedidoId)
      .maybeSingle();

    if (error || !data) continue;

    const estado = data.estado_actual || "⏳ En espera";
    let html = `
      <div class="seguimiento-bloque">
        <h4>📦 Pedido: ${String(pedidoId).slice(0, 8)}...</h4>
        <p><strong>Estado:</strong> ${estado}</p>
        <ul>`;
    let totalPedido = 0;
    for (const item of data.items || []) {
      html += `<li>${escapeHtml(item.nombre)} x${item.cantidad} = ${Number(item.subtotal).toFixed(2)} CUP</li>`;
      totalPedido += item.subtotal;
    }
    html += `</ul>
      <p><strong>Total del pedido:</strong> ${Number(totalPedido).toFixed(2)} CUP</p>
      </div>`;
    contenedor.innerHTML += html;
  }
  console.groupEnd();
}
window.renderizarSeguimientoPedidos = renderizarSeguimientoPedidos;

/* =========================
   Guardar criterio del cliente
   ========================= */
document.getElementById("btn-guardar-criterio")?.addEventListener("click", async () => {
  console.group("📝 Guardar criterio del cliente");
  const criterio = document.getElementById("criterio")?.value.trim();
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!criterio || !pedidoId) { console.warn("⚠️ No hay criterio o pedido activo."); console.groupEnd(); return; }

  const { error } = await supabase.rpc("guardar_criterio_focsa", {
    p_pedido_id: pedidoId,
    p_criterio: criterio,
  });
  if (error) {
    console.error("❌ Error al guardar criterio:", error);
    alert("Ocurrió un error al guardar su opinión. Intente nuevamente.");
  } else {
    console.log("✅ Criterio guardado:", criterio);
    alert("¡Gracias por su opinión!");
    // Limpieza total
    document.getElementById("bloque-criterio").style.display = "none";
    const crit = document.getElementById("criterio"); if (crit) crit.value = "";
    localStorage.clear(); sessionStorage.clear();
    cantidades = {}; cantidadesEnvases = {};
    carrito = []; renderCarrito();
    filtrarMenu("todos"); calcularTotales();
    const seg = document.getElementById("seguimiento-pedido"); if (seg) seg.style.display = "none";
    const modal = document.getElementById("modal-resumen"); if (modal) modal.style.display = "none";
    ["cliente", "piso", "apartamento", "telefono"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    const unir = document.getElementById("unirseGrupo"); if (unir) unir.checked = false;
    console.log("✅ Sistema listo para nuevo pedido tras guardar criterio");
  }
  console.groupEnd();
});

/* =========================
   Utilidades
   ========================= */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

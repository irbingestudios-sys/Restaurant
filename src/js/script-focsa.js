// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: FOCSA                                              │
// │ Script: script-focsa.js                                    │
// │ Descripción: Menú especial para clientes del edificio FOCSA│
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-08                                          │
// └────────────────────────────────────────────────────────────┘

// INICIALIZACIÓN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient("https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");
window.supabase = supabase;

let menu = [];
let envases = [];
let cantidades = {};
let cantidadesEnvases = {};

document.addEventListener("DOMContentLoaded", () => {
  console.group("🟢 FOCSA — Inicialización");
  console.log("🚀 Script FOCSA inicializado");
  cargarMenuEspecial();
  cargarEnvases();
  iniciarSeguimiento();
  console.groupEnd();
});

// CARGA DE MENÚ Y ENVASES
async function cargarMenuEspecial() {
  console.group("📥 Carga de menú");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) return console.error("❌ Error al cargar menú:", error);
  menu = data;
  console.log("✅ Menú cargado:", menu.length, "items");
  renderMenuEspecial(menu);

  const filtro = document.getElementById("filtro");
  filtro.innerHTML = '<option value="todos">Todas</option>';
  const categoriasUnicas = [...new Set(menu.map(item => item.categoria))];
  if (!categoriasUnicas.includes("Envases")) categoriasUnicas.push("Envases");

  categoriasUnicas.forEach(cat => {
    const opcion = document.createElement("option");
    opcion.value = cat;
    opcion.textContent = cat;
    filtro.appendChild(opcion);
  });

  console.groupEnd();
}

async function cargarEnvases() {
  console.group("📥 Carga de envases");
  const { data, error } = await supabase
    .from("menu_item")
    .select("*")
    .eq("categoria", "Envases")
    .eq("disponible", true)
    .gt("stock", 0)
    .order("precio", { ascending: true });

  if (error) return console.error("❌ Error al cargar envases:", error);
  envases = data;
  console.log("🧴 Envases cargados:", envases.length);
  renderEnvases(envases);
  console.groupEnd();
}

// RENDERIZADO MODULAR
function renderGrupo(lista, contenedorId, destinoCantidades) {
  console.group(`🖼️ Renderizado en ${contenedorId}`);
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  const agrupado = {};
  lista.forEach(item => {
    if (!agrupado[item.categoria]) agrupado[item.categoria] = [];
    agrupado[item.categoria].push(item);
  });

  for (const categoria in agrupado) {
    const grupo = document.createElement("div");
    grupo.className = "categoria-grupo";
    grupo.innerHTML += `<h3 class="titulo-seccion">${categoria}</h3>`;

    agrupado[categoria].forEach(item => {
      const stockTexto = item.stock <= 3
        ? `<span style="color:red">Stock: ${item.stock}</span>`
        : `Stock: ${item.stock}`;

      grupo.innerHTML += `
        <div class="producto-lineal">
          <div class="producto-izquierda">
            <strong>${item.nombre}</strong>
            ${item.descripcion ? `<button class="btn-icono" onclick="mostrarDescripcion('${item.descripcion}', '${item.imagen_url}')">
              <img src="../assets/info-icon.svg" alt="Descripción" />
            </button>` : ""}
          </div>
          <div class="producto-derecha">
            <span>${stockTexto}</span>
            <span>${item.precio} CUP</span>
            <input type="number" min="0" value="${destinoCantidades[item.nombre] || 0}" data-name="${item.nombre}" data-price="${item.precio}" />
          </div>
        </div>`;
    });

    contenedor.appendChild(grupo);
  }

  document.querySelectorAll(`#${contenedorId} input[type='number']`).forEach(input => {
    input.addEventListener("input", () => {
      destinoCantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });

  console.groupEnd();
}

function renderMenuEspecial(lista) {
  renderGrupo(lista, "menu-especial", cantidades);
}

function renderEnvases(lista) {
  renderGrupo(lista, "envases-contenedor", cantidadesEnvases);
}

// FILTRO POR CATEGORÍA
function filtrarMenu() {
  console.group("🔍 Filtro de categoría");
  const categoriaSeleccionada = document.getElementById("filtro").value;
  console.log("📌 Categoría seleccionada:", categoriaSeleccionada);

  if (categoriaSeleccionada === "todos") {
    renderMenuEspecial(menu);
    renderEnvases(envases);
  } else if (categoriaSeleccionada === "Envases") {
    renderGrupo(envases.filter(item => item.categoria === "Envases"), "envases-contenedor", cantidadesEnvases);
    document.getElementById("menu-especial").innerHTML = "";
  } else {
    renderGrupo(menu.filter(item => item.categoria === categoriaSeleccionada), "menu-especial", cantidades);
    document.getElementById("envases-contenedor").innerHTML = "";
  }

  console.groupEnd();
}
window.filtrarMenu = filtrarMenu;

// CÁLCULO DE TOTALES
function calcularTotales() {
  console.group("🧮 Cálculo de totales");
  let total = 0, cantidad = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      total += cant * item.precio;
      cantidad += cant;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      total += cant * item.precio;
      cantidad += cant;
    }
  }

  document.getElementById("total-cup").textContent = total.toFixed(2);
  document.getElementById("total-items").textContent = cantidad;
  console.log("🧮 Totales actualizados:", { total, cantidad });
  console.groupEnd();
}

// ENVÍO DE PEDIDO
window.enviarPedido = async () => {
  console.group("📤 RPC — registrar_pedido_focsa");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de enviar el pedido.");
    console.warn("❌ Datos del cliente incompletos.");
    return;
  }

  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    return;
  }

  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({
        nombre: item.nombre,
        cantidad: cant,
        precio: item.precio,
        subtotal: cant * item.precio
      });
      total += cant * item.precio;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({
        nombre: item.nombre,
        cantidad: cant,
        precio: item.precio,
        subtotal: cant * item.precio
      });
      total += cant * item.precio;
    }
  }

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: JSON.stringify(items),
    p_canal: "rpc" // ✅ canal agregado
  });

  if (error) return console.error("❌ Error RPC:", error);

  const pedidoId = data?.[0]?.pedido_id; // ✅ acceso corregido
  if (!pedidoId) return console.warn("⚠️ No se devolvió pedido_id");

  localStorage.setItem("pedido_id_actual", pedidoId);
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  historial.push(pedidoId);
  localStorage.setItem("historial_pedidos", JSON.stringify(historial));

  console.log("📥 pedido_id_actual guardado:", pedidoId);
  console.groupEnd();

  mostrarSeguimientoPedido();
};

// 🔎 SEGUIMIENTO Y CRITERIO DEL CLIENTE
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

  if (error || !data) return console.warn("⚠️ Error o pedido no encontrado");

  const estado = data.estado_actual || "⏳ En espera";
  const cocina = data.replicado_en_cocina ? "✅ Cocina OK" : "⚠️ Sin cocina";
  const reparto = data.replicado_en_reparto ? "✅ Reparto OK" : "⚠️ Sin reparto";

  document.getElementById("estado-actual").textContent = `🧾 ${estado} | ${cocina} | ${reparto}`;

  const btnEntregar = document.getElementById("btn-entregado");
  btnEntregar.disabled = !(data.replicado_en_cocina && data.replicado_en_reparto);
  btnEntregar.addEventListener("click", () => {
    document.getElementById("bloque-criterio").style.display = "block";
  });

  const contenedor = document.getElementById("contenido-resumen");
  contenedor.innerHTML = "";

  for (const item of data.items || []) {
    const { data: stockData } = await supabase
      .from("menu_item")
      .select("stock")
      .eq("nombre", item.nombre)
      .maybeSingle();

    const stock = stockData?.stock ?? "—";
    const stockTexto = stock <= 3
      ? `<span style="color:red">Stock: ${stock}</span>`
      : `Stock: ${stock}`;

    contenedor.innerHTML += `
      <div class="producto-lineal">
        <div class="producto-izquierda">
          <strong>${item.nombre}</strong>
        </div>
        <div class="producto-derecha">
          <span>${stockTexto}</span>
          <span>x${item.cantidad}</span>
          <span>= ${item.subtotal} CUP</span>
        </div>
      </div>`;
  }

  console.groupEnd();
}

document.getElementById("btn-guardar-criterio").addEventListener("click", async () => {
  console.group("📝 Guardar criterio del cliente");

  const criterio = document.getElementById("criterio").value.trim();
  const pedidoId = localStorage.getItem("pedido_id_actual");

  if (!criterio || !pedidoId) {
    console.warn("⚠️ No hay criterio o pedido activo.");
    return;
  }

  const { error } = await supabase
    .from("criterios_pedido")
    .insert([{ pedido_id: pedidoId, criterio }]);

  if (error) {
    console.error("❌ Error al guardar criterio:", error);
  } else {
    console.log("✅ Criterio guardado:", criterio);
    alert("¡Gracias por su opinión!");
    document.getElementById("bloque-criterio").style.display = "none";
  }

  console.groupEnd();
});

// 🧾 Vista previa del pedido
function revisarPedido() {
  console.group("🧾 Vista previa del pedido");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de revisar el pedido.");
    console.warn("❌ Datos incompletos para revisión.");
    return;
  }

  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    return;
  }

  const resumen = document.getElementById("contenido-resumen");
  resumen.innerHTML = `
    <div class="cliente-datos">
      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>Piso:</strong> ${piso}</p>
      <p><strong>Apartamento:</strong> ${apartamento}</p>
      <p><strong>Teléfono:</strong> ${telefono || "—"}</p>
      <p><strong>Grupo La Casona:</strong> ${unirse ? "✅ Sí desea unirse" : "❌ No desea unirse"}</p>
    </div>
    <hr />
  `;

  const items = [];

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({ ...item, cantidad: cant });
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({ ...item, cantidad: cant });
    }
  }

  if (items.length === 0) {
    resumen.innerHTML += "<p>No ha seleccionado ningún producto.</p>";
  } else {
    items.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      resumen.innerHTML += `
        <div class="producto-lineal">
          <div class="producto-izquierda">
            <strong>${item.nombre}</strong>
          </div>
          <div class="producto-derecha">
            <span>x${item.cantidad}</span>
            <span>= ${subtotal} CUP</span>
          </div>
        </div>`;
    });
  }

  document.getElementById("modal-resumen").style.display = "block";
  console.groupEnd();
}

window.revisarPedido = revisarPedido;

// 🔄 Limpiar selección
document.getElementById("btn-limpiar").addEventListener("click", () => {
  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu();
  calcularTotales();
});

// 🌐 Exponer funciones al HTML
window.revisarPedido = revisarPedido;
window.mostrarSeguimientoPedido = iniciarSeguimiento;

//ENVIAR POR WHATSAPP
async function enviarWhatsApp() {
  console.group("📲 Enviar pedido por WhatsApp");

  // 🔍 Verificación de datos del cliente
  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de enviar.");
    console.warn("❌ Datos incompletos para WhatsApp.");
    console.groupEnd();
    return;
  }
  console.log("✅ Datos del cliente verificados");

  // 🔍 Verificación de envases
  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.warn("❌ Pedido sin envases.");
    console.groupEnd();
    return;
  }
  console.log("✅ Al menos un envase seleccionado");

  // 🧾 Construcción de ítems
  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({
        nombre: item.nombre,
        cantidad: cant,
        precio: item.precio,
        subtotal: cant * item.precio
      });
      total += cant * item.precio;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      items.push({
        nombre: item.nombre,
        cantidad: cant,
        precio: item.precio,
        subtotal: cant * item.precio
      });
      total += cant * item.precio;
    }
  }

  console.log("📦 Ítems construidos:", items);

  // 🧩 RPC: registrar pedido
  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: items,
    p_canal: "whatsapp" // ✅ canal agregado
  });

  if (error) {
    console.error("❌ Error RPC:", error);
    console.groupEnd();
    return;
  }

  const pedidoId = data?.[0]?.pedido_id; // ✅ acceso corregido
  if (!pedidoId) {
    console.warn("⚠️ No se devolvió pedido_id");
    console.groupEnd();
    return;
  }

  localStorage.setItem("pedido_id_actual", pedidoId);
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  historial.push(pedidoId);
  localStorage.setItem("historial_pedidos", JSON.stringify(historial));

  console.log("📥 Pedido registrado con ID:", pedidoId);

  // 📲 WhatsApp
  const grupoTexto = unirse ? "✅ Desea unirse al grupo" : "❌ No desea unirse al grupo";
  const mensaje = `🧾 Pedido FOCSA\nCliente: ${cliente}\nPiso: ${piso}\nApartamento: ${apartamento}\nTeléfono: ${telefono || "—"}\n${grupoTexto}\n\n${items.map(i => `• ${i.nombre} x${i.cantidad} = ${i.subtotal} CUP`).join("\n")}\n\nTotal: ${total.toFixed(2)} CUP`;
  const url = `https://wa.me/+5355582319?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
  console.log("📤 WhatsApp abierto con mensaje");

  console.groupEnd();
}

  // 🔄 Reinicio del flujo
  document.getElementById("modal-resumen").style.display = "none";
  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu();
  calcularTotales();
  console.log("🧹 Selección limpiada y menú reiniciado");

  // 🔎 Activar seguimiento
  mostrarSeguimientoPedido();
  console.log("📦 Seguimiento activado");

  console.groupEnd();
}

window.enviarWhatsApp = enviarWhatsApp;

//Cancelar pedido y cerrar modal
function cancelarResumen() {
  console.group("❌ Cancelar pedido");

  cantidades = {};
  cantidadesEnvases = {};
  filtrarMenu();
  calcularTotales();

  document.getElementById("modal-resumen").style.display = "none";

  console.log("🧹 Pedido cancelado y reiniciado");
  console.groupEnd();
}

window.cancelarResumen = cancelarResumen;

document.getElementById("modal-close-resumen").addEventListener("click", cancelarResumen);

//Mostrar seguimiento del pedido
function mostrarSeguimientoPedido() {
  document.getElementById("seguimiento-pedido").style.display = "block";
  iniciarSeguimiento();
}

window.mostrarSeguimientoPedido = mostrarSeguimientoPedido;

//VENTAJAS DEL GRUPO
function toggleVentajasGrupo() {
  const bloque = document.getElementById("ventajasGrupo");
  bloque.style.display = bloque.style.display === "none" ? "block" : "none";
}

window.toggleVentajasGrupo = toggleVentajasGrupo;

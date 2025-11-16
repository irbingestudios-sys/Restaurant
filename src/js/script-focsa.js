// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: FOCSA                                              │
// │ Script: script-focsa.js                                    │
// │ Descripción: Menú especial para clientes del edificio FOCSA│
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-08                                          │
// └────────────────────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient("https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");
window.supabase = supabase;

let menu = [];
let envases = [];
let cantidades = {};
let cantidadesEnvases = {};

// ─────────────────────────────────────────────────────────────
// 🔰 INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  console.group("🟢 FOCSA — Inicialización");
  console.log("🚀 Script FOCSA inicializado");
  cargarMenuEspecial();
  cargarEnvases();
  iniciarSeguimiento();
  console.groupEnd();
});

// ─────────────────────────────────────────────────────────────
// 📦 CARGA DE MENÚ ESPECIAL
// ─────────────────────────────────────────────────────────────

async function cargarMenuEspecial() {
  console.group("📥 Carga de menú");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) return console.error("❌ Error al cargar menú:", error);
  menu = data;
  console.log("✅ Menú cargado:", menu.length, "items");
  renderMenuEspecial(menu);
  console.groupEnd();
}

function renderMenuEspecial(lista) {
  console.group("🖼️ Renderizado de menú");
  const contenedor = document.getElementById("menu-especial");
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
            <button class="btn-icono" onclick="mostrarDescripcion('${item.descripcion}', '${item.imagen_url}')">
              <img src="../assets/info-icon.svg" alt="Descripción" />
            </button>
          </div>
          <div class="producto-derecha">
            <span>${stockTexto}</span>
            <span>${item.precio} CUP</span>
            <input type="number" min="0" value="${cantidades[item.nombre] || 0}" data-name="${item.nombre}" data-price="${item.precio}" />
          </div>
        </div>`;
    });

    contenedor.appendChild(grupo);
  }

  document.querySelectorAll("#menu-especial input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      cantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });

  console.groupEnd();
}

// ─────────────────────────────────────────────────────────────
// 🧴 CARGA DE ENVASES
// ─────────────────────────────────────────────────────────────
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
  renderEnvases(envases); // ← esta línea debe estar aquí
  console.groupEnd();
}

function renderEnvases(lista) {
  console.group("🖼️ Renderizado de envases");
  const contenedor = document.getElementById("envases-contenedor");
  contenedor.innerHTML = "";

  lista.forEach(item => {
    const stockTexto = item.stock <= 3
      ? `<span style="color:red">Stock: ${item.stock}</span>`
      : `Stock: ${item.stock}`;

    contenedor.innerHTML += `
      <div class="producto-lineal">
        <div class="producto-izquierda">
          <strong>${item.nombre}</strong>
        </div>
        <div class="producto-derecha">
          <span>${stockTexto}</span>
          <span>${item.precio} CUP</span>
          <input type="number" min="0" value="${cantidadesEnvases[item.nombre] || 0}" data-name="${item.nombre}" data-price="${item.precio}" />
        </div>
      </div>`;
  });

  document.querySelectorAll("#envases-contenedor input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      cantidadesEnvases[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });

  console.groupEnd();
}


// ─────────────────────────────────────────────────────────────
// 🧮 CÁLCULO DE TOTALES
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// 📤 ENVÍO DE PEDIDO
// ─────────────────────────────────────────────────────────────

window.enviarPedido = async () => {
  console.group("📤 RPC — registrar_pedido_focsa");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  const items = []; let total = 0;

  for (const nombre in cantidades) { /* construir items */ }
  for (const nombre in cantidadesEnvases) { /* construir items */ }

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: JSON.stringify(items)
  });

  if (error) return console.error("❌ Error RPC:", error);

  const pedidoId = data?.pedido_id;
  if (!pedidoId) return console.warn("⚠️ No se devolvió pedido_id");

  localStorage.setItem("pedido_id_actual", pedidoId);
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  historial.push(pedidoId);
  localStorage.setItem("historial_pedidos", JSON.stringify(historial));

  console.log("📥 pedido_id_actual guardado:", pedidoId);
  console.log("📚 Historial actualizado:", historial);
  console.groupEnd();

  mostrarSeguimientoPedido();
};

// ─────────────────────────────────────────────────────────────
// 🔎 SEGUIMIENTO DE PEDIDO
// ─────────────────────────────────────────────────────────────

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

  const btnEntregar = document.getElementById("btn-entregar");
  btnEntregar.disabled = !(data.replicado_en_cocina && data.replicado_en_reparto);
  console.log("🔓 Botón entrega activado:", !btnEntregar.disabled);
  document.getElementById("btn-entregar").addEventListener("click", () => {
  document.getElementById("bloque-criterio").style.display = "block";
});

  const contenedor = document.getElementById("contenido-pedido");
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
window.nuevoPedido = () => {
  console.group("➕ Nuevo pedido");
  localStorage.removeItem("pedido_id_actual");
  location.reload();
  console.groupEnd();
};
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

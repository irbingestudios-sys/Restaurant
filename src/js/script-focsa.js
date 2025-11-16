// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: FOCSA                                              │
// │ Script: script-focsa.js                                    │
// │ Descripción: Menú especial para clientes del edificio FOCSA│
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-08                                          │
// └────────────────────────────────────────────────────────────┘

//INICIALIZACIÓN
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
//CARGA DE MENÚ Y ENVASES
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
//RENDERIZADO MODULAR
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
//FILTRO POR CATEGORÍA
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
//CÁLCULO DE TOTALES
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
//ENVÍO DE PEDIDO
window.enviarPedido = async () => {
  console.group("📤 RPC — registrar_pedido_focsa");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  const items = []; let total = 0;

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
//SEGUIMIENTO Y CRITERIO DEL CLIENTE
function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
  setInterval(() => verificar

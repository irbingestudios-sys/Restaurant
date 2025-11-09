// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: FOCSA                                              │
// │ Script: script-focsa.js                                    │
// │ Descripción: Menú especial para clientes del edificio FOCSA│
// │ Autor: Irbing Brizuela                                     │
// │ Fecha: 2025-11-08                                          │
// └────────────────────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const supabase = createClient("https://qeqltwrkubtyrmgvgaai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw");

let menu = [], envases = [];
const cantidades = {}, cantidadesEnvases = {};
let mensajeWhatsApp = "";

document.addEventListener("DOMContentLoaded", () => {
  cargarMenuEspecial();
  cargarEnvases();
});

async function cargarMenuEspecial() {
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) return console.error("❌ Error al cargar menú:", error);
  menu = data;
  renderFiltroCategorias();
  renderMenuEspecial(menu);
}

function renderFiltroCategorias() {
  const filtro = document.getElementById("filtro");
  const categorias = [...new Set(menu.map(item => item.categoria).filter(Boolean))];
  filtro.innerHTML = '<option value="todos">Todas</option>';
  categorias.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    filtro.appendChild(option);
  });
}

window.filtrarMenu = () => {
  const seleccion = document.getElementById("filtro").value;
  const filtrado = seleccion === "todos" ? menu : menu.filter(item => item.categoria === seleccion);
  renderMenuEspecial(filtrado);
};
function renderMenuEspecial(lista) {
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
    grupo.innerHTML += `<h3 class="titulo-seccion">${categoria}</h3>
      <div class="producto-lineal encabezado">
        <strong>Producto</strong><span>Precio</span><span>Descripción</span><span>Cantidad</span>
      </div>`;

    agrupado[categoria].forEach(item => {
   grupo.innerHTML += `
  <div class="producto-lineal">
    <div class="producto-nombre">
      <strong>${item.nombre}</strong>
      <button class="btn-icono" onclick="mostrarDescripcion('${item.descripcion}', '${item.imagen_url}')">
        <img src="../assets/info-icon.svg" alt="Descripción" />
      </button>
    </div>
    <span class="producto-precio">${item.precio} CUP</span>
    <input type="number" min="0" value="${cantidades[item.nombre] || 0}" data-name="${item.nombre}" data-price="${item.precio}" />
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
}

async function cargarEnvases() {
  const { data, error } = await supabase
    .from("menu_item")
    .select("*")
    .eq("categoria", "Envases")
    .eq("disponible", true)
    .gt("stock", 0)
    .order("precio", { ascending: true });

  if (error) return console.error("❌ Error al cargar envases:", error);
  envases = data;

  const contenedor = document.getElementById("envases-contenedor");
  contenedor.innerHTML = "";

  envases.forEach((item, index) => {
    const cantidadInicial = index === 0 ? 1 : 0;
    cantidadesEnvases[item.nombre] = cantidadInicial;

    const bloque = document.createElement("div");
    bloque.className = "producto-lineal";
    bloque.innerHTML = `
      <div class="producto-nombre">
        <strong>${item.nombre}</strong>
      </div>
      <span class="producto-precio">${item.precio} CUP</span>
      <input type="number" min="0" value="${cantidadInicial}" data-name="${item.nombre}" data-price="${item.precio}" />
    `;
    contenedor.appendChild(bloque);
  });

  document.querySelectorAll("#envases-contenedor input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      cantidadesEnvases[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });
}

function calcularTotales() {
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
}

window.mostrarDescripcion = (texto, imagen) => {
  document.getElementById("modal-texto").textContent = texto || "Sin descripción disponible.";
  const img = document.getElementById("modal-imagen");
  img.src = imagen || "";
  img.style.display = imagen ? "block" : "none";
  document.getElementById("modal-descripcion").style.display = "flex";
};

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal-descripcion").style.display = "none";
});

document.getElementById("btn-limpiar").addEventListener("click", () => {
  Object.keys(cantidades).forEach(k => cantidades[k] = 0);
  Object.keys(cantidadesEnvases).forEach(k => cantidadesEnvases[k] = 0);
  document.querySelectorAll("input[type='number']").forEach(input => input.value = 0);
  calcularTotales();
});

window.toggleVentajasGrupo = () => {
  const bloque = document.getElementById("ventajasGrupo");
  bloque.style.display = bloque.style.display === "none" ? "block" : "none";
};
window.cancelar = () => {
  document.getElementById("confirmacion").style.display = "none";
};

window.cancelarResumen = () => {
  document.getElementById("modal-resumen").style.display = "none";
};

document.getElementById("modal-close-resumen").addEventListener("click", () => {
  document.getElementById("modal-resumen").style.display = "none";
});

window.enviarWhatsApp = () => {
  const numero = "5350971023";
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensajeWhatsApp)}`;
  window.open(url, "_blank");
  document.getElementById("confirmacion").style.display = "none";
};

window.enviarPedido = async () => {
  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("⚠️ Completa nombre, piso y apartamento");
    return;
  }

  if (telefono && !/^\d+$/.test(telefono)) {
    alert("⚠️ El teléfono debe contener solo números");
    return;
  }

  const items = [];
  let resumenHTML = `<p><strong>Cliente:</strong> ${cliente}<br><strong>Piso:</strong> ${piso}<br><strong>Apartamento:</strong> ${apartamento}</p><ul>`;
  let mensaje = `Pedido para: ${cliente}\nPiso: ${piso}\nApartamento: ${apartamento}\n\n`;
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      resumenHTML += `<li>${nombre} x${cant} = ${subtotal} CUP</li>`;
      mensaje += `- ${nombre} x${cant} = ${subtotal} CUP\n`;
      total += subtotal;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      resumenHTML += `<li>${nombre} x${cant} = ${subtotal} CUP</li>`;
      mensaje += `- ${nombre} x${cant} = ${subtotal} CUP\n`;
      total += subtotal;
    }
  }

  if (items.length === 0) {
    alert("⚠️ Selecciona al menos un producto");
    return;
  }

  mensaje += `\nTotal: ${total} CUP`;
  mensajeWhatsApp = mensaje;

  const { data, error } = await supabase.rpc("registrar_pedido_focsa", {
    p_cliente: cliente,
    p_piso: piso,
    p_apartamento: apartamento,
    p_telefono: telefono || null,
    p_direccion: null,
    p_unirse_grupo: unirse,
    p_items: JSON.stringify(items)
  });

  if (error) {
    console.error("❌ Error al registrar pedido:", error);
    alert("Error al registrar el pedido");
    return;
  }

  console.log("✅ Pedido registrado:", data);
  resumenHTML += `</ul><p><strong>Total:</strong> ${total} CUP</p>`;
  document.getElementById("resumen").innerHTML = `
    <h3 class="titulo-seccion">Resumen detallado</h3>
    ${resumenHTML}
    <button onclick="enviarWhatsApp()" class="btn-secundario">✅ Confirmar y enviar</button>
    <button onclick="cancelar()" class="btn-secundario">❌ Cancelar</button>
  `;
  document.getElementById("confirmacion").style.display = "block";
};

window.revisarPedido = () => {
  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();

  if (!cliente || !piso || !apartamento) {
    alert("⚠️ Completa nombre, piso y apartamento antes de revisar el pedido");
    return;
  }

  const items = [];
  let html = `<p><strong>Cliente:</strong> ${cliente}<br><strong>Piso:</strong> ${piso}<br><strong>Apartamento:</strong> ${apartamento}</p><ul>`;
  let mensaje = `Pedido para: ${cliente}\nPiso: ${piso}\nApartamento: ${apartamento}\n\n`;
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      html += `<li>${nombre} x${cant} = ${subtotal} CUP</li>`;
      mensaje += `- ${nombre} x${cant} = ${subtotal} CUP\n`;
      total += subtotal;
    }
  }

  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre, cantidad: cant, subtotal });
      html += `<li>${nombre} x${cant} = ${subtotal} CUP</li>`;
      mensaje += `- ${nombre} x${cant} = ${subtotal} CUP\n`;
      total += subtotal;
    }
  }

  if (items.length === 0) {
    alert("⚠️ No has seleccionado ningún producto");
    return;
  }

  html += `</ul><p><strong>Total:</strong> ${total} CUP</p>`;
  document.getElementById("contenido-resumen").innerHTML = html;
  document.getElementById("modal-resumen").style.display = "flex";
  mensajeWhatsApp = mensaje;
};

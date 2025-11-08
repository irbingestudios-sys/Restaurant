import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// === Inicializar Supabase ===
const supabase = createClient(
  "https://ihswokmnhwaitzwjzvmy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloc3dva21uaHdhaXR6d2p6dm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjU2OTcsImV4cCI6MjA3NjM0MTY5N30.TY4BdOYdzrmUGoprbFmbl4HVntaIGJyRMOxkcZPdlWU"
);

// === Variables globales ===
let menu = [];
let envases = [];
const cantidades = {};
const cantidadesEnvases = {};

// === Cargar menú especial ===
async function cargarMenuEspecial() {
  console.log("🔄 Cargando menú especial...");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) {
    console.error("❌ Error al cargar menú especial:", error);
    return;
  }
  menu = data;
  renderFiltroCategorias();
  renderMenuEspecial(menu);
}

// === Renderizar filtro de categorías ===
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

// === Filtrar menú por categoría ===
window.filtrarMenu = function () {
  const seleccion = document.getElementById("filtro").value;
  const filtrado = seleccion === "todos"
    ? menu
    : menu.filter(item => item.categoria === seleccion);
  renderMenuEspecial(filtrado);
};
// === Renderizar menú especial ===
function renderMenuEspecial(lista) {
  console.log("🎨 Renderizando menú especial...");
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

    const titulo = document.createElement("h3");
    titulo.textContent = categoria;
    grupo.appendChild(titulo);

    agrupado[categoria].forEach(item => {
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${item.nombre}</strong> - ${item.precio} CUP
        <button class="btn-secundario" onclick="mostrarDescripcion('${item.descripcion}', '${item.imagen_url}')">Descripción</button>
        <input type="number" min="0" value="${cantidades[item.nombre] || 0}" data-name="${item.nombre}" data-price="${item.precio}" />
      `;
      grupo.appendChild(div);
    });

    contenedor.appendChild(grupo);
  }

  document.querySelectorAll("#menu-especial input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      const nombre = input.dataset.name;
      const cantidad = parseInt(input.value) || 0;
      cantidades[nombre] = cantidad;
      calcularTotales();
    });
  });
}

// === Mostrar descripción en modal ===
window.mostrarDescripcion = function (texto, imagen) {
  console.log("📝 Mostrando descripción:", texto);
  document.getElementById("modal-texto").textContent = texto || "Sin descripción disponible.";
  const img = document.getElementById("modal-imagen");
  if (imagen) {
    img.src = imagen;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }
  document.getElementById("modal-descripcion").style.display = "flex";
};

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal-descripcion").style.display = "none";
});

// === Cargar envases ===
async function cargarEnvases() {
  console.log("📦 Cargando envases...");
  const { data, error } = await supabase
    .from("menu_item")
    .select("*")
    .eq("categoria", "envases")
    .eq("disponible", true)
    .gt("stock", 0)
    .order("precio", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar envases:", error);
    return;
  }

  envases = data;
  renderEnvases(envases);
}

// === Renderizar envases ===
function renderEnvases(lista) {
  const contenedor = document.getElementById("envases-contenedor");
  contenedor.innerHTML = "";

  lista.forEach((item, index) => {
    const div = document.createElement("div");
    const cantidadInicial = index === 0 ? 1 : 0;
    cantidadesEnvases[item.nombre] = cantidadInicial;

    div.innerHTML = `
      <strong>${item.nombre}</strong> - ${item.precio} CUP
      <input type="number" min="0" value="${cantidadInicial}" data-name="${item.nombre}" data-price="${item.precio}" />
    `;
    contenedor.appendChild(div);
  });

  document.querySelectorAll("#envases-contenedor input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      const nombre = input.dataset.name;
      const cantidad = parseInt(input.value) || 0;
      cantidadesEnvases[nombre] = cantidad;
      calcularTotales();
    });
  });
}
// === Calcular totales ===
function calcularTotales() {
  let total = 0;
  let cantidad = 0;

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

// === Limpiar selección ===
document.getElementById("btn-limpiar").addEventListener("click", () => {
  Object.keys(cantidades).forEach(k => cantidades[k] = 0);
  Object.keys(cantidadesEnvases).forEach(k => cantidadesEnvases[k] = 0);
  document.querySelectorAll("input[type='number']").forEach(input => input.value = 0);
  calcularTotales();
  console.log("🧹 Selección limpiada");
});

// === Mostrar ventajas del grupo ===
document.getElementById("infoGrupo").addEventListener("click", () => {
  const bloque = document.getElementById("ventajasGrupo");
  bloque.style.display = bloque.style.display === "none" ? "block" : "none";
});

// === Cancelar confirmación ===
window.cancelar = function () {
  document.getElementById("confirmacion").style.display = "none";
  console.log("❌ Pedido cancelado");
};

// === Enviar pedido ===
window.enviarPedido = async function () {
  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("⚠️ Por favor completa nombre, piso y apartamento");
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
  document.getElementById("resumen").innerHTML = resumenHTML + `<p><strong>Total:</strong> ${total} CUP</p>`;
  document.getElementById("confirmacion").style.display = "block";
  window.mensajeWhatsApp = mensaje;
};

// === Enviar por WhatsApp ===
window.enviarWhatsApp = function () {
  const numero = "5350971023";
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(window.mensajeWhatsApp)}`;
  window.open(url, "_blank");
  document.getElementById("confirmacion").style.display = "none";
  console.log("📤 Pedido enviado por WhatsApp");
};

// === Inicializar módulo ===
cargarMenuEspecial();
cargarEnvases();

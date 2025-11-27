// ======================================================
// 1. Inicialización Supabase y variables
// ======================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

window.supabase = supabase;

let menu = [];
let envases = [];
let cantidades = {};
let cantidadesEnvases = {};

// ======================================================
// 2. Inicialización del módulo
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 FOCSA — Inicialización");
  console.log("🚀 Script FOCSA inicializado");

  cargarMenuEspecial();
  cargarEnvases();
  iniciarSeguimiento();

  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (pedidoId) {
    document.getElementById("seguimiento-pedido").style.display = "block";
  }
  renderizarSeguimientoPedidos();

  // Detectar sesión persistente
  const { data: { user } } = await supabase.auth.getUser();
  if (user) mostrarClienteUI(user.email);
  else ocultarClienteUI();

  console.groupEnd();
});
// ======================================================
// 3. CLIENTE: login/registro, sesión, histórico
// ======================================================
function toast(msg) { alert(msg); }

function mostrarClienteUI(email) {
  const infoCliente = document.getElementById("cliente-info");
  const nombreClienteUI = document.getElementById("cliente-nombre");
  const btnHistorico = document.getElementById("btn-historico");
  infoCliente.style.display = "block";
  nombreClienteUI.textContent = email;
  btnHistorico.style.display = "inline-block";
}

function ocultarClienteUI() {
  document.getElementById("cliente-info").style.display = "none";
  document.getElementById("btn-historico").style.display = "none";
}

// Abrir/cerrar modal cliente
document.getElementById("btn-cliente")?.addEventListener("click", () => {
  document.getElementById("modal-cliente").style.display = "block";
});
document.getElementById("modal-close-cliente")?.addEventListener("click", () => {
  document.getElementById("modal-cliente").style.display = "none";
});

// Tabs login/registro
document.getElementById("tab-login")?.addEventListener("click", () => {
  document.getElementById("login-form").style.display = "block";
  document.getElementById("registro-form").style.display = "none";
});
document.getElementById("tab-registro")?.addEventListener("click", () => {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("registro-form").style.display = "block";
});

// Login
document.getElementById("btn-login")?.addEventListener("click", async () => {
  console.group("👤 Login");
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) { toast("Completa correo y contraseña"); console.groupEnd(); return; }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { toast("❌ Error de login: " + error.message); console.groupEnd(); return; }

  mostrarClienteUI(data.user.email);
  document.getElementById("modal-cliente").style.display = "none";
  console.log("✅ Sesión iniciada");
  console.groupEnd();
});

// Registro
document.getElementById("btn-crear-cliente")?.addEventListener("click", async () => {
  console.group("🆕 Registro");
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const usuario = document.getElementById("reg-usuario").value.trim();
  const piso = document.getElementById("reg-piso").value.trim();
  const apartamento = document.getElementById("reg-apartamento").value.trim();
  const empresa = document.getElementById("reg-empresa").value.trim() || null;

  if (!email || !password || !usuario || !piso || !apartamento) {
    toast("Completa los campos requeridos"); console.groupEnd(); return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { toast("❌ Error de registro: " + error.message); console.groupEnd(); return; }

  const userId = data.user.id;
  const { error: insertErr } = await supabase.from("clientes_focsa").insert({
    id: userId, email, usuario, piso, apartamento, empresa, password_hash: "auth-managed"
  });
  if (insertErr) { toast("❌ Error guardando datos: " + insertErr.message); console.groupEnd(); return; }

  toast("✅ Cliente creado correctamente");
  mostrarClienteUI(email);
  document.getElementById("modal-cliente").style.display = "none";
  console.groupEnd();
});

// Cerrar sesión
window.cerrarSesion = async function() {
  await supabase.auth.signOut();
  ocultarClienteUI();
  toast("✅ Sesión cerrada");
};

// Histórico de pedidos (cliente autenticado)
document.getElementById("btn-historico")?.addEventListener("click", async () => {
  console.group("📜 Histórico");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { toast("⚠️ Debes iniciar sesión"); console.groupEnd(); return; }

  const { data, error } = await supabase
    .from("pedidos")
    .select("id, fecha, total, estado_actual")
    .eq("cliente_id", user.id)
    .order("fecha", { ascending: false });

  if (error) { toast("Error cargando histórico: " + error.message); console.groupEnd(); return; }
  renderHistorico(data || []);
  console.groupEnd();
});

function renderHistorico(pedidos) {
  const contHistorico = document.getElementById("historico-pedidos");
  contHistorico.innerHTML = "<h3>📦 Histórico de Pedidos</h3>";
  if (!pedidos.length) { contHistorico.innerHTML += "<p>No tiene pedidos registrados.</p>"; return; }
  pedidos.forEach(p => {
    contHistorico.innerHTML += `<p>Fecha: ${new Date(p.fecha).toLocaleString()} | Total: ${p.total} CUP | Estado: ${p.estado_actual || "—"}</p>`;
  });
}

// ======================================================
// 4. Carga de menú y envases
// ======================================================
async function cargarMenuEspecial() {
  console.group("📥 Carga de menú");
  const { data, error } = await supabase.rpc("obtener_menu_focsa");
  if (error) { console.error("❌ Error al cargar menú:", error); console.groupEnd(); return; }

  menu = data || [];
  renderMenuEspecial(menu);

  // Llenar filtro
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

  if (error) { console.error("❌ Error al cargar envases:", error); console.groupEnd(); return; }

  envases = data || [];
  renderEnvases(envases);
  console.groupEnd();
}
// ======================================================
// 5. Renderizado y filtros
// ======================================================
function renderGrupo(lista, contenedorId, destinoCantidades) {
  console.group(`🖼️ Renderizado → ${contenedorId}`);
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  lista.forEach(item => {
    contenedor.innerHTML += `
      <div class="producto-lineal">
        <div class="producto-izquierda"><strong>${item.nombre}</strong></div>
        <div class="producto-derecha">
          <span>${item.precio} CUP</span>
          <input type="number" min="0" value="${destinoCantidades[item.nombre] || 0}"
          data-name="${item.nombre}" data-price="${item.precio}" />
        </div>
      </div>`;
  });

  contenedor.querySelectorAll("input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      destinoCantidades[input.dataset.name] = parseInt(input.value) || 0;
      calcularTotales();
    });
  });
  console.groupEnd();
}

function renderMenuEspecial(lista) { renderGrupo(lista, "menu-especial", cantidades); }
function renderEnvases(lista) { renderGrupo(lista, "envases-contenedor", cantidadesEnvases); }

function filtrarMenu() {
  console.group("🔍 Filtro de categoría");
  const categoriaSeleccionada = document.getElementById("filtro").value;
  console.log("📌 Categoría:", categoriaSeleccionada);

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

// ======================================================
// 6. Totales y vista previa del pedido
// ======================================================
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
  console.log("🧮 Totales:", { total, cantidad });
  console.groupEnd();
}

function revisarPedido() {
  console.group("🧾 Vista previa del pedido");
  const resumen = document.getElementById("contenido-resumen");
  resumen.innerHTML = "";

  // Construir resumen de items y total
  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }
  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }

  if (!items.length) {
    resumen.innerHTML = "<p>No ha seleccionado ningún producto.</p>";
  } else {
    items.forEach(i => {
      resumen.innerHTML += `
        <div class="producto-lineal">
          <div class="producto-izquierda"><strong>${i.nombre}</strong></div>
          <div class="producto-derecha"><span>x${i.cantidad}</span><span>= ${i.subtotal} CUP</span></div>
        </div>`;
    });
    resumen.innerHTML += `<p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>`;
  }

  document.getElementById("modal-resumen").style.display = "block";
  console.groupEnd();
}
window.revisarPedido = revisarPedido;
// ======================================================
// 7. Envío de pedido (WhatsApp + RPC anon/auth)
// ======================================================
async function enviarWhatsApp() {
  console.group("📲 Enviar pedido por WhatsApp");

  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const unirse = document.getElementById("unirseGrupo").checked;

  if (!cliente || !piso || !apartamento) {
    alert("Por favor, complete los datos del cliente antes de enviar.");
    console.groupEnd(); return;
  }
  const tieneEnvase = Object.values(cantidadesEnvases).some(c => c > 0);
  if (!tieneEnvase) {
    alert("Debe seleccionar al menos un envase para realizar la entrega.");
    console.groupEnd(); return;
  }

  const items = [];
  let total = 0;

  for (const nombre in cantidades) {
    const cant = cantidades[nombre];
    const item = menu.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }
  for (const nombre in cantidadesEnvases) {
    const cant = cantidadesEnvases[nombre];
    const item = envases.find(p => p.nombre === nombre);
    if (item && cant > 0) {
      const subtotal = cant * item.precio;
      items.push({ nombre: item.nombre, cantidad: cant, precio: item.precio, subtotal });
      total += subtotal;
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  let data, error;

  if (user) {
    ({ data, error } = await supabase.rpc("registrar_pedido_focsa_auth", {
      p_cliente_id: user.id,
      p_total: total,
      p_items: items,
      p_canal: "whatsapp"
    }));
  } else {
    ({ data, error } = await supabase.rpc("registrar_pedido_focsa_anon", {
      p_cliente: cliente,
      p_piso: piso,
      p_apartamento: apartamento,
      p_telefono: telefono || null,
      p_unirse_grupo: unirse,
      p_items: items,
      p_canal: "whatsapp"
    }));
  }

  if (error) { console.error("❌ Error RPC:", error); console.groupEnd(); return; }

  const pedidoId = data?.[0]?.pedido_id;
  if (!pedidoId) { console.warn("⚠️ No se devolvió pedido_id"); console.groupEnd(); return; }

  // Persistencia
  localStorage.setItem("pedido_id_actual", pedidoId);
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  historial.push(pedidoId);
  localStorage.setItem("historial_pedidos", JSON.stringify(historial));

  renderizarSeguimientoPedidos();

  // WhatsApp
  const grupoTexto = unirse ? "✅ Desea unirse al grupo" : "❌ No desea unirse al grupo";
  const mensaje = `🧾 Pedido FOCSA
Cliente: ${cliente}
Piso: ${piso}
Apartamento: ${apartamento}
Teléfono: ${telefono || "—"}
${grupoTexto}
${items.map(i => `• ${i.nombre} x${i.cantidad} = ${i.subtotal} CUP`).join("\n")}
Total: ${total.toFixed(2)} CUP`;
  const url = `https://wa.me/+5350977340?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");

  // Reset y seguimiento UI
  document.getElementById("modal-resumen").style.display = "none";
  cantidades = {}; cantidadesEnvases = {};
  filtrarMenu(); calcularTotales(); mostrarSeguimientoPedido();

  console.log("📥 Pedido registrado:", pedidoId);
  console.groupEnd();
}

window.enviarWhatsApp = enviarWhatsApp;

// ======================================================
// 8. Seguimiento de pedidos
// ======================================================
function iniciarSeguimiento() {
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!pedidoId) return;
  // Chequeo periódico
  setInterval(() => verificarIntegridadPedido(pedidoId), 10000);
}

async function verificarIntegridadPedido(pedidoId) {
  console.group("🔎 Seguimiento del pedido (integridad)");
  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  if (error || !data) { console.warn("⚠️ Error o pedido no encontrado"); console.groupEnd(); return; }

  const estado = data.estado_actual || "⏳ En espera";
  document.getElementById("estado-actual").textContent = `🧾 ${estado}`;

  const btnEntregar = document.getElementById("btn-entregado");
  if (btnEntregar) {
    btnEntregar.disabled = estado !== "entregado";
    btnEntregar.onclick = () => {
      if (estado === "entregado") {
        document.getElementById("bloque-criterio").style.display = "block";
      }
    };
  }
  console.groupEnd();
}

async function renderizarSeguimientoPedidos() {
  console.group("📦 Seguimiento múltiple de pedidos");
  const historial = JSON.parse(localStorage.getItem("historial_pedidos") || "[]");
  const contenedor = document.getElementById("seguimiento-multiple");
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
        <h4>📦 Pedido: ${pedidoId.slice(0, 8)}...</h4>
        <p><strong>Estado:</strong> ${estado}</p>
        <ul>`;

    let totalPedido = 0;
    for (const item of data.items || []) {
      html += `<li>${item.nombre} x${item.cantidad} = ${item.subtotal} CUP</li>`;
      totalPedido += item.subtotal;
    }
    html += `</ul>
      <p><strong>Total del pedido:</strong> ${totalPedido.toFixed(2)} CUP</p>
      </div>`;
    contenedor.innerHTML += html;
  }
  console.groupEnd();
}
window.renderizarSeguimientoPedidos = renderizarSeguimientoPedidos;

function mostrarSeguimientoPedido() {
  document.getElementById("seguimiento-pedido").style.display = "block";
  iniciarSeguimiento();
}
window.mostrarSeguimientoPedido = mostrarSeguimientoPedido;

// ======================================================
// 9. Guardar criterio del cliente
// ======================================================
document.getElementById("btn-guardar-criterio")?.addEventListener("click", async () => {
  console.group("📝 Guardar criterio del cliente");
  const criterio = document.getElementById("criterio").value.trim();
  const pedidoId = localStorage.getItem("pedido_id_actual");
  if (!criterio || !pedidoId) { console.warn("⚠️ No hay criterio o pedido activo."); console.groupEnd(); return; }

  const { error } = await supabase.from("criterio_cliente").insert([{ pedido_id: pedidoId, criterio }]);
  if (error) {
    console.error("❌ Error al guardar criterio:", error);
    alert("Ocurrió un error al guardar su opinión. Intente nuevamente.");
  } else {
    console.log("✅ Criterio guardado:", criterio);
    alert("¡Gracias por su opinión!");
    document.getElementById("bloque-criterio").style.display = "none";
    document.getElementById("criterio").value = "";
    localStorage.clear(); sessionStorage.clear();
    cantidades = {}; cantidadesEnvases = {};
    filtrarMenu(); calcularTotales();
    document.getElementById("seguimiento-pedido").style.display = "none";
    document.getElementById("modal-resumen").style.display = "none";
    // Limpiar datos del cliente en UI
    document.getElementById("cliente").value = "";
    document.getElementById("piso").value = "";
    document.getElementById("apartamento").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("unirseGrupo").checked = false;
    console.log("✅ Sistema listo para nuevo pedido");
  }
  console.groupEnd();
});

// ======================================================
// 10. Utilitarios de UI
// ======================================================
function toggleVentajasGrupo() {
  const bloque = document.getElementById("ventajasGrupo");
  bloque.style.display = bloque.style.display === "none" ? "block" : "none";
}
window.toggleVentajasGrupo = toggleVentajasGrupo;

function mostrarDescripcion(descripcion, imagenUrl) {
  console.group("📝 Mostrar descripción del producto");
  document.getElementById("modal-texto").textContent = descripcion;
  document.getElementById("modal-imagen").src = imagenUrl || "";
  document.getElementById("modal-descripcion").style.display = "block";
  console.log("🖼️ Descripción mostrada.");
  console.groupEnd();
}
window.mostrarDescripcion = mostrarDescripcion;

document.getElementById("modal-close")?.addEventListener("click", () => {
  document.getElementById("modal-descripcion").style.display = "none";
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

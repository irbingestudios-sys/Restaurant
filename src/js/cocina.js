// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Cocina FOCSA                                       │
// │ Script: cocina.js                                          │
// └────────────────────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// 1) Define un fetch seguro que elimina '?columns=' de la URL
const safeFetch = (url, opts) => {
  try {
    let finalUrl = url;
    if (typeof finalUrl === "string") {
      // Remueve el parámetro columns si aparece en la URL
      finalUrl = finalUrl.replace(/(\?|&)columns=[^&]*/g, "");
    } else if (finalUrl instanceof URL) {
      finalUrl.searchParams.delete("columns");
    }
    console.log("HTTP SAFE CALL:", finalUrl);
    return window.fetch(finalUrl, opts);
  } catch (e) {
    console.warn("No se pudo sanitizar la URL, usando fetch estándar:", e);
    return window.fetch(url, opts);
  }
};

// 2) Crea el cliente Supabase usando el fetch seguro
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw",
  {
    global: { fetch: safeFetch } // clave: usamos nuestro fetch
  }
);

window.supabase = supabase;

// 🟢 INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 Módulo Cocina — Inicialización");
  console.log("🚀 Script cocina.js inicializado");

  const accesoOk = await verificarAcceso();
  if (!accesoOk) {
    console.groupEnd();
    return; // ⛔ Detiene ejecución si no hay sesión
  }

  await cargarFiltrosDesdePedidos();
  await cargarPedidosEnCocina();

  setInterval(cargarPedidosEnCocina, 15000);

  document.getElementById("filtro-tipo").addEventListener("change", cargarPedidosEnCocina);
  document.getElementById("filtro-local").addEventListener("change", cargarPedidosEnCocina);

  document.getElementById("cerrar-sesion").addEventListener("click", async () => {
    console.log("🔒 Cerrando sesión...");
    await supabase.auth.signOut();
    location.reload(); // vuelve a mostrar el login embebido
  });

  console.groupEnd();
});

// 🔐 VERIFICACIÓN DE USUARIO Y ROL
async function verificarAcceso() {
  console.group("🔐 Verificación de acceso");

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    console.warn("❌ No hay sesión activa. Mostrando formulario de login.");
    document.body.innerHTML = `
      <main class="login-container">
        <img src="../assets/logo.png" alt="Logo del sistema" class="logo" />
        <h1>Identificación de usuario</h1>
        <form id="login-form">
          <input type="email" id="email" placeholder="Correo electrónico" required />
          <input type="password" id="password" placeholder="Contraseña" required />
          <button type="submit">Ingresar</button>
        </form>
        <p id="login-error" class="error"></p>
      </main>
    `;

    // Listener de submit para el formulario embebido
    document.addEventListener("submit", async (e) => {
      if (e.target.id === "login-form") {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const errorBox = document.getElementById("login-error");
        errorBox.textContent = "";

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("❌ Error de login:", error.message);
          errorBox.textContent = "Credenciales incorrectas o error de conexión.";
        } else {
          console.log("✅ Login exitoso. Recargando módulo...");
          location.reload();
        }
      }
    });

    console.groupEnd();
    return false;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    console.warn("❌ Error al obtener usuario:", userError);
    alert("Acceso denegado. Usuario no válido.");
    console.groupEnd();
    return false;
  }

  console.log("🧾 Usuario autenticado:", user.email || user.id);

  const { data, error } = await supabase
    .from("usuario")
    .select("rol, activo, nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.warn("❌ Usuario no registrado:", error);
    alert("Usuario no registrado.");
    console.groupEnd();
    return false;
  }

  if (!data.activo) {
    console.warn("⛔ Usuario inactivo:", data.nombre);
    alert("Cuenta desactivada.");
    console.groupEnd();
    return false;
  }

  const rol = data.rol?.trim().toLowerCase();
  const rolesPermitidos = ["admin", "super", "super_admin", "gerente", "cocina"];
  if (!rolesPermitidos.includes(rol)) {
    console.warn("❌ Rol no autorizado:", rol);
    alert("Acceso restringido.");
    console.groupEnd();
    return false;
  }

  document.getElementById("bienvenida").textContent = `👋 Bienvenido ${data.nombre} (${rol})`;
  console.log("✅ Acceso permitido para rol:", rol);
  console.groupEnd();
  return true;
}

// 🔍 CARGA DINÁMICA DE FILTROS DESDE LA TABLA PEDIDOS
async function cargarFiltrosDesdePedidos() {
  console.group("🔍 Cargando filtros dinámicos");
  const { data, error } = await supabase.from("pedidos").select("tipo, local");

  if (error) {
    console.error("❌ Error al cargar filtros:", error);
    console.groupEnd();
    return;
  }

  const tipos = [...new Set(data.map(p => p.tipo).filter(Boolean))];
  const locales = [...new Set(data.map(p => p.local).filter(Boolean))];

  const tipoSelect = document.getElementById("filtro-tipo");
  const localSelect = document.getElementById("filtro-local");

  tipoSelect.innerHTML = '<option value="todos">Todos</option>';
  localSelect.innerHTML = '<option value="todos">Todos</option>';

  tipos.forEach(tipo => {
    const opt = document.createElement("option");
    opt.value = tipo;
    opt.textContent = tipo;
    tipoSelect.appendChild(opt);
  });

  locales.forEach(local => {
    const opt = document.createElement("option");
    opt.value = local;
    opt.textContent = local;
    localSelect.appendChild(opt);
  });

  tipoSelect.value = localStorage.getItem("filtro-tipo") || "todos";
  localSelect.value = localStorage.getItem("filtro-local") || "todos";
  tipoSelect.onchange = e => localStorage.setItem("filtro-tipo", e.target.value);
  localSelect.onchange = e => localStorage.setItem("filtro-local", e.target.value);
  console.groupEnd();
}

// 📥 CARGA DE PEDIDOS CON FILTROS
async function cargarPedidosEnCocina() {
  console.group("📥 Carga de pedidos en cocina");
  const tipo = document.getElementById("filtro-tipo").value;
  const local = document.getElementById("filtro-local").value;

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .or("estado_actual.in.(pendiente,en cocina)")
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    console.groupEnd();
    return;
  }

  let pedidosFiltrados = data || [];
  if (tipo !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo === tipo);
  if (local !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.local === local);

  console.log("✅ Pedidos filtrados:", pedidosFiltrados.length);

  renderizarPedidos(pedidosFiltrados);
  renderResumenDia(pedidosFiltrados);
  renderResumenCocineroDia();
  console.groupEnd();
}

// 📊 RESUMEN DEL DÍA
function renderResumenDia(pedidos) {
  console.group("📊 Resumen del día");

  const resumen = document.getElementById("resumen-dia");
  const hoy = new Date().toISOString().slice(0, 10);

  const pendientesHoy = pedidos.filter(p =>
    p.estado_actual === "pendiente" &&
    p.fecha_registro.slice(0, 10) === hoy
  );

  const totalPedidos = pendientesHoy.length;

  resumen.innerHTML = `
    <strong>📊 Resumen del Día:</strong><br>
    Total pedidos pendientes hoy: ${totalPedidos}
  `;

  console.log("📊 Total pedidos pendientes hoy:", totalPedidos);
  console.groupEnd();
}

// 👨‍🍳 RESUMEN DEL COCINERO (RPC)
async function renderResumenCocineroDia() {
  console.group("👨‍🍳 Resumen cocinero (RPC)");

  const resumen = document.getElementById("resumen-cocinero");
  const { data, error } = await supabase.rpc("resumen_cocinero_dia");

  if (error || !data || !data[0]) {
    console.error("❌ Error al obtener resumen_cocinero_dia:", error);
    resumen.innerHTML = "<p>Error al cargar resumen del cocinero.</p>";
    console.groupEnd();
    return;
  }

  const r = data[0];

  resumen.innerHTML = `
    <h3>👨‍🍳 Resumen del Cocinero</h3>
    <p><strong>Elaborados por ti:</strong> ${r.elaborados} pedidos | ${r.total_elaborados.toFixed(2)} CUP</p>
  `;

  console.groupEnd();
}

// 🖼️ RENDERIZADO DE PEDIDOS
function renderizarPedidos(pedidos) {
  console.group("🖼️ Renderizado de pedidos");
  const contenedor = document.getElementById("lista-pedidos");
  contenedor.innerHTML = "";

  if (pedidos.length === 0) {
    contenedor.innerHTML = "<p>No hay pedidos pendientes.</p>";
    console.log("📭 Sin pedidos pendientes");
    console.groupEnd();
    return;
  }

  pedidos.forEach(pedido => {
    if (!Array.isArray(pedido.items)) {
      console.warn("⚠️ Pedido omitido por estructura inválida de items:", pedido.pedido_id);
      return;
    }

    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";

    // Agrupar por categoría
    const agrupado = {};
    pedido.items.forEach(item => {
      if (!item || typeof item !== "object" || !item.nombre || !item.cantidad || typeof item.subtotal !== "number") {
        console.warn("⚠️ Ítem inválido en pedido:", pedido.pedido_id, item);
        return;
      }
      const categoria = item.categoria || "Sin categoría";
      if (!agrupado[categoria]) agrupado[categoria] = [];
      agrupado[categoria].push(item);
    });

    // Ordenar alfabéticamente
    for (const cat in agrupado) {
      agrupado[cat].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    // Construir lista HTML
    let listaHTML = "";
    for (const cat in agrupado) {
      listaHTML += `<h4>${cat}</h4><ul>`;
      agrupado[cat].forEach(i => {
        listaHTML += `<li>${i.nombre} x${i.cantidad} = ${i.subtotal} CUP</li>`;
      });
      listaHTML += `</ul>`;
    }

    const total = pedido.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);

    // Calcular tiempo transcurrido desde que el cliente hizo el pedido
const fechaPedido = new Date(pedido.fecha_registro);
const ahora = new Date();
const diffMs = ahora - fechaPedido; // diferencia en milisegundos
const diffMin = Math.floor(diffMs / 60000); // minutos
const diffHoras = Math.floor(diffMin / 60);

let tiempoTranscurrido;
if (diffHoras > 0) {
  tiempoTranscurrido = `⏱ Esperando: ${diffHoras}h ${diffMin % 60}m`;
} else {
  tiempoTranscurrido = `⏱ Esperando: ${diffMin} minutos`;
}
   bloque.innerHTML = `
  <h3>📦 Pedido ${pedido.pedido_id.slice(0, 8)}...</h3>
  <p><strong>Cliente:</strong> ${pedido.cliente}</p>
  <p><strong>Tipo:</strong> ${pedido.tipo} | <strong>Local:</strong> ${pedido.local}</p>
  <p><strong>Estado:</strong> ${pedido.estado_actual}</p>
  <p><strong>Fecha:</strong> ${new Date(pedido.fecha_registro).toLocaleString()}</p>
  <p><strong>Tiempo en espera:</strong> ${tiempoTranscurrido}</p>
  ${listaHTML}
  <p><strong>Total:</strong> ${total.toFixed(2)} CUP</p>
  <div class="acciones">
    <button onclick="marcarComoCocinado('${pedido.pedido_id}')">✅ Cocinado</button>
    <button onclick="rechazarPedido('${pedido.pedido_id}')">❌ Rechazar</button>
  </div>
`;
    contenedor.appendChild(bloque);
  });

  console.groupEnd();
}

// ✅ MARCAR COMO COCINADO
async function marcarComoCocinado(pedidoId) {
  console.group("✅ Marcar como cocinado:", pedidoId);

  const { error } = await supabase
    .from("evento_pedido")
    .insert([{
      id: crypto.randomUUID(),              // id único del evento
      pedido_id: pedidoId,                  // id del pedido
      etapa: "cocinado",                    // etapa del evento
      origen: "cocina",                     // origen del evento
      fecha: new Date().toISOString()       // fecha actual
    }]);

  if (error) {
    console.error("❌ Error al registrar evento:", error);
    console.groupEnd();
    return;
  }

  console.log("📦 Pedido marcado como cocinado");
  await cargarPedidosEnCocina();
  console.groupEnd();
}

// ❌ RECHAZAR PEDIDO
async function rechazarPedido(pedidoId) {
  console.group("❌ Rechazar pedido:", pedidoId);

  const motivo = prompt("Motivo del rechazo:");
  if (!motivo) {
    console.warn("⚠️ Rechazo cancelado por falta de motivo");
    console.groupEnd();
    return;
  }

  const { error } = await supabase
    .from("eventos_pedido")
    .insert([{
      id: crypto.randomUUID(),              // id único del evento
      pedido_id: pedidoId,                  // id del pedido
      tipo: "rechazado",                    // tipo de evento
      descripcion: motivo,                  // motivo del rechazo
      fecha: new Date().toISOString()       // fecha actual
    }]);

  if (error) {
    console.error("❌ Error al registrar rechazo:", error);
    console.groupEnd();
    return;
  }

  console.log("📦 Pedido rechazado con motivo:", motivo);
  await cargarPedidosEnCocina();
  console.groupEnd();
}
// 🌐 Exponer funciones al HTML
window.marcarComoCocinado = marcarComoCocinado;
window.rechazarPedido = rechazarPedido;

// 📊 Acción del botón "Ver resumen del día"
document.getElementById("btn-resumen-dia").addEventListener("click", async () => {
  console.group("📊 Ver resumen del día");

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("estado_actual", "cocinado"); // solo pedidos elaborados

  if (error) {
    console.error("❌ Error al cargar resumen del día:", error);
    return;
  }

  let totalPedidos = 0;
  let totalCUP = 0;
  const resumenPorLocal = {};
  const categorias = {};

  data.forEach(p => {
    totalPedidos++;
    const subtotal = Array.isArray(p.items)
      ? p.items.reduce((acc, i) => acc + (i.subtotal || 0), 0)
      : 0;
    totalCUP += subtotal;

    // Agrupar por local
    if (!resumenPorLocal[p.local]) resumenPorLocal[p.local] = { pedidos: 0, cup: 0 };
    resumenPorLocal[p.local].pedidos++;
    resumenPorLocal[p.local].cup += subtotal;

    // Agrupar por categoría
    if (Array.isArray(p.items)) {
      p.items.forEach(i => {
        const nombre = i.nombre;
        if (!categorias[nombre]) categorias[nombre] = { cantidad: 0, cup: 0 };
        categorias[nombre].cantidad += i.cantidad;
        categorias[nombre].cup += i.subtotal;
      });
    }
  });

  // Construir HTML
  let html = `<h3>📊 Resumen del Día</h3>`;
  html += `<p>Total pedidos elaborados: ${totalPedidos}</p>`;
  html += `<p>Total CUP: ${totalCUP.toFixed(2)}</p>`;

  html += `<h4>📍 Por Local</h4><ul>`;
  for (const local in resumenPorLocal) {
    html += `<li>${local}: ${resumenPorLocal[local].pedidos} pedidos | ${resumenPorLocal[local].cup.toFixed(2)} CUP</li>`;
  }
  html += `</ul>`;

  html += `<h4>🧾 Productos Elaborados</h4><ul>`;
  Object.keys(categorias).sort().forEach(nombre => {
    const c = categorias[nombre];
    html += `<li>${nombre}: ${c.cantidad} uds | ${c.cup.toFixed(2)} CUP</li>`;
  });
  html += `</ul>`;

  const bloque = document.getElementById("bloque-resumen-dia");
  bloque.style.display = "block";
  bloque.innerHTML = html;

  console.groupEnd();
});

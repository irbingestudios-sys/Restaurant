// ┌───────────────────────────────────────────────┐
// │ Módulo: Reparto FOCSA                         │
// │ Script: reparto.js                            │
// └───────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// 1) Define un fetch seguro que elimina '?columns=' de la URL
const safeFetch = (url, opts) => {
  try {
    let finalUrl = url;
    if (typeof finalUrl === "string") {
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
    global: { fetch: safeFetch }
  }
);

window.supabase = supabase;

// 🟢 INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 Módulo Reparto — Inicialización");
  console.log("🚀 Script reparto.js inicializado");

  const accesoOk = await verificarAcceso();
  if (!accesoOk) {
    console.groupEnd();
    return; // ⛔ Detiene ejecución si no hay sesión
  }

  await cargarFiltrosDesdePedidos();
  await cargarPedidosEnReparto();

  setInterval(cargarPedidosEnReparto, 15000);

  document.getElementById("filtro-tipo").addEventListener("change", cargarPedidosEnReparto);
  document.getElementById("filtro-local").addEventListener("change", cargarPedidosEnReparto);

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
  const rolesPermitidos = ["super_admin", "admin", "gerente", "repartidor"];
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

// 🔍 Cargar filtros dinámicos
async function cargarFiltrosDesdePedidos() {
  const { data, error } = await supabase.from("pedidos").select("tipo, local");
  if (error) return;

  const tipos = [...new Set((data || []).map(p => p.tipo).filter(Boolean))];
  const locales = [...new Set((data || []).map(p => p.local).filter(Boolean))];

  const tipoSelect = document.getElementById("filtro-tipo");
  const localSelect = document.getElementById("filtro-local");
  if (!tipoSelect || !localSelect) return;

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
}

// 📥 Cargar pedidos en reparto (solo cocinados)
async function cargarPedidosEnReparto() {
  const tipo = document.getElementById("filtro-tipo")?.value || "todos";
  const local = document.getElementById("filtro-local")?.value || "todos";

  const { data, error } = await supabase
    .from("vw_integridad_pedido")
    .select("*")
    .eq("estado_actual", "cocinado")
    .order("fecha_registro", { ascending: true });

  if (error) return;

  let pedidosFiltrados = data || [];
  if (tipo !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo === tipo);
  if (local !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.local === local);

  renderizarPedidos(pedidosFiltrados);
  renderResumenDia(pedidosFiltrados);
  await renderResumenRepartidor(); // ← RPC “Entregados por ti”
}

// 🖼️ Renderizado de pedidos
function renderizarPedidos(pedidos) {
  const contenedor = document.getElementById("lista-pedidos");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  if (!pedidos?.length) return;

  pedidos.forEach(pedido => {
    const fechaPedido = new Date(pedido.fecha_registro);
    const ahora = new Date();
    const diffMs = ahora - fechaPedido;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    const tiempoTranscurrido = diffHoras > 0
      ? `⏱ Esperando: ${diffHoras}h ${diffMin % 60}m`
      : `⏱ Esperando: ${diffMin} minutos`;

    const total = Array.isArray(pedido.items)
      ? pedido.items.reduce((sum, i) => sum + (i.subtotal || 0), 0)
      : 0;

    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";
    bloque.innerHTML = `
      <h3>🚚 Pedido ${String(pedido.pedido_id || "").slice(0, 8)}...</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente ?? "-"}</p>
      <p><strong>Tipo:</strong> ${pedido.tipo ?? "-"} | <strong>Local:</strong> ${pedido.local ?? "-"}</p>
      <p><strong>Estado:</strong> <span class="estado cocinado">cocinado</span></p>
      <p><strong>Fecha:</strong> ${fechaPedido.toLocaleString()}</p>
      <p><strong>Tiempo en espera:</strong> ${tiempoTranscurrido}</p>
      <p><strong>Total:</strong> ${Number(total).toFixed(2)} CUP</p>
      <div class="acciones">
        <button onclick="marcarComoEntregado('${pedido.pedido_id}')">✅ Entregado</button>
        <button onclick="rechazarEntrega('${pedido.pedido_id}')">❌ Rechazar</button>
      </div>
    `;
    contenedor.appendChild(bloque);
  });
}

// ✅ Marcar como entregado
async function marcarComoEntregado(pedidoId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    alert("❌ No hay usuario autenticado");
    return;
  }

  const { error } = await supabase
    .from("evento_pedido")
    .insert([{
      id: crypto.randomUUID(),
      pedido_id: pedidoId,
      etapa: "entregado",
      origen: "reparto",
      usuario_id: user.id,              // ← guardar repartidor
      fecha: new Date().toISOString()
    }]);

  if (error) {
    alert("❌ Error al registrar entrega");
    return;
  }

  await cargarPedidosEnReparto();
}

// ❌ Rechazar entrega
async function rechazarEntrega(pedidoId) {
  const motivo = prompt("Motivo del rechazo:");
  if (!motivo) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    alert("❌ No hay usuario autenticado");
    return;
  }

  const { error } = await supabase
    .from("eventos_pedido")
    .insert([{
      pedido_id: pedidoId,
      tipo: "rechazado",
      descripcion: motivo,
      usuario_id: user.id   // ← guardar repartidor
    }]);

  if (error) {
    console.error("❌ Error al registrar rechazo:", error);
    alert("❌ Error al registrar rechazo: " + error.message);
    return;
  }

  console.log("✅ Rechazo registrado correctamente");
  await cargarPedidosEnReparto();
}

// 📊 Resumen del día (simple)
function renderResumenDia(pedidos) {
  const resumen = document.getElementById("resumen-dia");
  if (!resumen) return;
  resumen.innerHTML = `<strong>📊 Total pedidos en reparto:</strong> ${pedidos.length}`;
}

// 👨‍🚚 Resumen del repartidor (RPC)
async function renderResumenRepartidor() {
  const resumen = document.getElementById("resumen-repartidor");
  if (!resumen) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    resumen.innerHTML = "<p>No se pudo obtener el usuario.</p>";
    return;
  }

  const { data, error } = await supabase.rpc("resumen_repartidor_dia", { uid: user.id });

  if (error || !data || !data[0]) {
    resumen.innerHTML = "<p>Error al cargar resumen del repartidor.</p>";
    return;
  }

  const r = data[0];
  resumen.innerHTML = `
    <h3>👨‍🚚 Resumen del Repartidor</h3>
    <p><strong>Entregados por ti:</strong> ${r.entregados} pedidos | ${Number(r.total_entregados).toFixed(2)} CUP</p>
  `;
}

// 🌐 Exponer funciones al HTML
window.marcarComoEntregado = marcarComoEntregado;
window.rechazarEntrega = rechazarEntrega;

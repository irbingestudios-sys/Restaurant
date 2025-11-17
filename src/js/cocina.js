// ┌────────────────────────────────────────────────────────────┐
// │ Módulo: Cocina FOCSA                                       │
// │ Script: cocina.js (Parte 1)                                │
// └────────────────────────────────────────────────────────────┘

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔐 Conexión Supabase con sesión activa
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw" // clave pública
);

window.supabase = supabase;

// 🟢 INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  console.group("🟢 Módulo Cocina — Inicialización");
  console.log("🚀 Script cocina.js inicializado");

  const accesoOk = await verificarAcceso();
  if (!accesoOk) return;

  await cargarFiltrosDesdePedidos();
  await cargarPedidosEnCocina();

  setInterval(cargarPedidosEnCocina, 15000);

  document.getElementById("filtro-tipo").addEventListener("change", cargarPedidosEnCocina);
  document.getElementById("filtro-local").addEventListener("change", cargarPedidosEnCocina);

  document.getElementById("cerrar-sesion").addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload(); // vuelve a mostrar el login embebido
  });

  console.groupEnd(); // ✅ aquí sí cierra el grupo de inicialización
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
    return false;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    console.warn("❌ Error al obtener usuario:", userError);
    alert("Acceso denegado. Usuario no válido.");
    window.close();
    return false;
  }

  const { data, error } = await supabase
    .from("usuario")
    .select("rol, activo, nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.activo) {
    console.warn("⛔ Usuario no autorizado o inactivo:", error || data);
    alert("Acceso denegado.");
    window.close();
    return false;
  }

  const rol = data.rol?.trim().toLowerCase();
  const rolesPermitidos = ["admin", "super", "super_admin", "gerente", "cocina"];
  if (!rolesPermitidos.includes(rol)) {
    console.warn("❌ Rol no autorizado:", rol);
    alert("Acceso restringido.");
    window.close();
    return false;
  }

  console.log("✅ Acceso permitido para rol:", rol);
  document.getElementById("bienvenida").textContent = `👋 Bienvenido ${data.nombre} (${rol})`;
  console.groupEnd();
  return true;
}
//DATOS DEL FILTRO EN LA BASE
// 🔍 CARGA DINÁMICA DE FILTROS DESDE LA TABLA PEDIDOS
async function cargarFiltrosDesdePedidos() {
  console.group("🔍 Cargando filtros dinámicos");

  const { data, error } = await supabase.from("pedidos").select("tipo, local");
  if (error) {
    console.error("❌ Error al cargar filtros:", error);
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
    .or("estado_actual.in.(pendiente,en cocina),estado_actual.is.null")
    .order("fecha_registro", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar pedidos:", error);
    return;
  }

  let pedidosFiltrados = data;
  if (tipo !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo === tipo);
  if (local !== "todos") pedidosFiltrados = pedidosFiltrados.filter(p => p.local === local);

  console.log("✅ Pedidos filtrados:", pedidosFiltrados.length);

  renderizarPedidos(pedidosFiltrados);
  renderResumenDia(pedidosFiltrados);
  renderResumenPorLocal();
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

  const totalPedidos = pedidos.length;
  const pendientes = pendientesHoy.length;
  const enCocina = pedidos.filter(p => p.estado_actual === "en cocina").length;

  const totalCUP = pendientesHoy.reduce((sum, p) => {
    const subtotal = Array.isArray(p.items)
      ? p.items.reduce((acc, item) => acc + item.subtotal, 0)
      : 0;
    return sum + subtotal;
  }, 0);

  resumen.innerHTML = `
    <strong>📊 Resumen del Día:</strong><br>
    Total pedidos: ${totalPedidos}<br>
    Pendientes hoy: ${pendientes} | En cocina: ${enCocina}<br>
    Total CUP (pendientes hoy): ${totalCUP.toFixed(2)}
  `;

  console.log("📊 Total pedidos:", totalPedidos);
  console.log("📌 Pendientes hoy:", pendientes);
  console.log("👨‍🍳 En cocina:", enCocina);
  console.log("💰 Total CUP (pendientes hoy):", totalCUP.toFixed(2));

  console.groupEnd();
}

// 📍 RESUMEN POR LOCAL
async function renderResumenPorLocal() {
  console.group("📍 Resumen por local (RPC)");

  const resumen = document.getElementById("resumen-local");

  const { data, error } = await supabase.rpc("resumen_por_local");

  if (error) {
    console.error("❌ Error al obtener resumen por local:", error);
    resumen.innerHTML = "<p>Error al cargar resumen por local.</p>";
    console.groupEnd();
    return;
  }

  resumen.innerHTML = `
    <strong>📍 Resumen por Local:</strong><br>
    ${data.map(r => `${r.local}: ${r.cantidad_pedidos} pedidos | ${Number(r.total_cup).toFixed(2)} CUP`).join("<br>")}
  `;

  data.forEach(r => {
    console.log(`📍 ${r.local}: ${r.cantidad_pedidos} pedidos | ${Number(r.total_cup).toFixed(2)} CUP`);
  });

  console.groupEnd();
}
// 📊 RESUMEN DEL COCINERO (RPC)
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
    <p><strong>Pendientes hoy:</strong> ${r.pendientes} pedidos | ${r.total_pendientes.toFixed(2)} CUP</p>
    <p><strong>Elaborados por ti:</strong> ${r.elaborados} pedidos | ${r.total_elaborados.toFixed(2)} CUP</p>
    <h4>📍 Por Local</h4>
    <ul>${r.resumen_local?.map(l => `<li>${l.local}: ${l.pedidos} pedidos | ${l.total_cup.toFixed(2)} CUP</li>`).join("") || "<li>Sin datos</li>"}</ul>
    <h4>🧾 Productos Elaborados</h4>
    <ul>${r.productos_elaborados?.map(p => `<li>${p.nombre}: ${p.cantidad} uds | ${p.subtotal.toFixed(2)} CUP</li>`).join("") || "<li>Sin productos</li>"}</ul>
  `;

  console.groupEnd();
}
// 🖼️ RENDERIZADO DE PEDIDOS AGRUPADOS CON VALIDACIÓN
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
    // ✅ Validación de estructura de items
    if (!Array.isArray(pedido.items)) {
      console.warn("⚠️ Pedido omitido por estructura inválida de items:", pedido.pedido_id);
      return;
    }

    const total = pedido.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
    const bloque = document.createElement("div");
    bloque.className = "pedido-bloque";

    // 🧩 Agrupar por categoría
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

    // 🔠 Ordenar alfabéticamente dentro de cada categoría
    for (const cat in agrupado) {
      agrupado[cat].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    // 🧾 Construir HTML
    let listaHTML = "";
    for (const cat in agrupado) {
      listaHTML += `<h4>${cat}</h4><ul>`;
      agrupado[cat].forEach(i => {
        listaHTML += `<li>${i.nombre} x${i.cantidad} = ${i.subtotal} CUP</li>`;
      });
      listaHTML += `</ul>`;
    }

    bloque.innerHTML = `
      <h3>📦 Pedido ${pedido.pedido_id.slice(0, 8)}...</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente}</p>
      <p><strong>Tipo:</strong> ${pedido.tipo} | <strong>Local:</strong> ${pedido.local}</p>
      <p><strong>Estado:</strong> ${pedido.estado_actual}</p>
      <p><strong>Fecha:</strong> ${new Date(pedido.fecha_registro).toLocaleString()}</p>
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
      pedido_id: pedidoId,
      etapa: "cocinado",
      origen: "cocina",
      fecha: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error al registrar evento:", error);
    return;
  }

  console.log("📦 Pedido marcado como cocinado");
  cargarPedidosEnCocina();

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
      pedido_id: pedidoId,
      tipo: "rechazado",
      descripcion: motivo,
      fecha: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error al registrar rechazo:", error);
    return;
  }

  console.log("📦 Pedido rechazado con motivo:", motivo);
  cargarPedidosEnCocina();

  console.groupEnd();
}
//Funcion Gloval
window.iniciarSesion = async function () {
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
};

// 🌐 Exponer funciones al HTML
window.marcarComoCocinado = marcarComoCocinado;
window.rechazarPedido = rechazarPedido;
});

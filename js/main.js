/* Totonacapan Digital · comportamiento de las páginas.
   Sin dependencias: cada bloque se activa solo si su sección existe. */

// Correo al que llegan los formularios. Sustituir por el definitivo.
const CORREO_CONTACTO = "contacto@totonacapan.digital";

const reduceMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const espera = (ms) => new Promise((r) => setTimeout(r, reduceMovimiento ? 0 : ms));

/* ---------------------------------------------------------------------------
   Menú en pantallas chicas
   --------------------------------------------------------------------------- */
function iniciarMenu() {
  const cabecera = document.querySelector(".cabecera");
  const boton = document.querySelector(".boton-menu");
  if (!cabecera || !boton) return;

  const cerrar = () => {
    cabecera.classList.remove("abierta");
    boton.setAttribute("aria-expanded", "false");
    boton.textContent = "Menú";
  };

  boton.addEventListener("click", () => {
    const abierta = cabecera.classList.toggle("abierta");
    boton.setAttribute("aria-expanded", String(abierta));
    boton.textContent = abierta ? "Cerrar" : "Menú";
  });

  cabecera.querySelectorAll(".pestana a").forEach((a) => a.addEventListener("click", cerrar));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
}

/* ---------------------------------------------------------------------------
   Aparición de elementos al hacer scroll
   --------------------------------------------------------------------------- */
function iniciarApariciones() {
  const elementos = document.querySelectorAll(".aparece");
  if (!("IntersectionObserver" in window) || reduceMovimiento) {
    elementos.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("visible");
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  elementos.forEach((el) => observador.observe(el));
}

/* ---------------------------------------------------------------------------
   Formularios: arman un correo listo para enviar (el sitio no tiene servidor)
   --------------------------------------------------------------------------- */
function iniciarFormularios() {
  document.querySelectorAll("[data-formulario]").forEach((form) => {
    const aviso = form.querySelector(".formulario__aviso");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const faltante = [...form.querySelectorAll("[required]")].find((c) => !c.value.trim());
      if (faltante) {
        aviso.textContent = "Falta llenar: " + faltante.closest("label").firstChild.textContent.trim();
        faltante.focus();
        return;
      }

      const datos = new FormData(form);
      const esPiloto = form.dataset.formulario === "piloto";
      const asunto = esPiloto
        ? `Piloto Volador: ${datos.get("negocio") || datos.get("nombre")}`
        : `Contacto desde la web: ${datos.get("interes")}`;

      const cuerpo = [...form.querySelectorAll("input, select, textarea")]
        .filter((c) => c.value.trim())
        .map((c) => `${c.closest("label").firstChild.textContent.trim()}: ${c.value.trim()}`)
        .join("\n");

      window.location.href =
        `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      aviso.textContent = "Se abrirá tu aplicación de correo con el mensaje listo para enviar.";
    });
  });
}

/* ---------------------------------------------------------------------------
   Demostración: la sucursal sin internet
   --------------------------------------------------------------------------- */
function iniciarRed() {
  const red = document.querySelector("[data-red]");
  if (!red) return;

  const interruptor = red.querySelector("[data-interruptor]");
  const texto = red.querySelector("[data-interruptor-texto]");
  const cola = red.querySelector("[data-cola]");
  const operaciones = red.querySelectorAll("[data-operaciones] li");
  let pendientes = 0;
  let temporizador = null;

  const pintarOperaciones = (conectado) => {
    operaciones.forEach((li) => {
      const estado = li.querySelector(".estado");
      const tipo = conectado ? "ok" : li.dataset.estadoSin;
      estado.textContent = conectado ? li.dataset.con : li.dataset.sin;
      estado.className = "estado" + (tipo === "ok" ? "" : ` estado--${tipo}`);
    });
  };

  const cambiar = (conectado) => {
    clearInterval(temporizador);
    interruptor.setAttribute("aria-checked", String(conectado));
    texto.textContent = conectado ? "Internet conectado" : "Internet caído";
    red.classList.toggle("sin-conexion", !conectado);
    pintarOperaciones(conectado);

    if (conectado) {
      // Al volver la conexión, la bandeja de salida se vacía.
      temporizador = setInterval(() => {
        pendientes = Math.max(0, pendientes - 3);
        cola.textContent = pendientes;
        if (pendientes === 0) clearInterval(temporizador);
      }, 90);
    } else {
      // Sin conexión, la sucursal sigue vendiendo y dando acceso: los cambios se acumulan.
      temporizador = setInterval(() => {
        pendientes += 1 + Math.floor(Math.random() * 3);
        cola.textContent = pendientes;
      }, 800);
    }
  };

  interruptor.addEventListener("click", () => {
    cambiar(interruptor.getAttribute("aria-checked") !== "true");
  });
  pintarOperaciones(true);
}

/* ---------------------------------------------------------------------------
   Simulador de acceso con huella
   --------------------------------------------------------------------------- */
const CASOS = {
  ok: {
    falla: -1,
    detalle: "Ana R. · Plan mensual · vence en 18 días",
  },
  desconocida: {
    falla: 0,
    codigo: "BIO_SIN_COINCIDENCIA",
    detalle: "La huella no coincide con ningún socio. Recepción puede inscribirlo o dar acceso manual con motivo.",
  },
  vencida: {
    falla: 1,
    codigo: "MEM_VENCIDA",
    detalle: "Membresía vencida hace 3 días. Recepción le ofrece renovar en caja.",
  },
  horario: {
    falla: 2,
    codigo: "HORARIO_NO_PERMITIDO",
    detalle: "Su plan permite entrar de 6:00 a 14:00.",
  },
  adeudo: {
    falla: 3,
    codigo: "ADEUDO_PENDIENTE",
    detalle: "Tiene la inscripción sin pagar. Recepción se la cobra en caja.",
  },
};

function iniciarSimulador() {
  const simulador = document.querySelector("[data-simulador]");
  if (!simulador) return;

  const botones = simulador.querySelectorAll("[data-caso]");
  const reglas = simulador.querySelectorAll("[data-reglas] li");
  const veredicto = simulador.querySelector("[data-veredicto]");
  let corrida = 0; // permite cancelar una animación si eligen a otra persona a mitad

  const evaluar = async (clave) => {
    const id = ++corrida;
    const caso = CASOS[clave];
    reglas.forEach((li) => (li.className = ""));
    veredicto.className = "veredicto";
    veredicto.innerHTML = "<span>Leyendo huella…</span>";

    for (let i = 0; i < reglas.length; i++) {
      reglas[i].className = "regla--revisando";
      await espera(320);
      if (id !== corrida) return;

      if (i === caso.falla) {
        reglas[i].className = "regla--falla";
        for (let j = i + 1; j < reglas.length; j++) reglas[j].className = "regla--omitida";
        veredicto.className = "veredicto denegado";
        veredicto.innerHTML =
          `<strong>Acceso denegado</strong><code>${caso.codigo}</code><span>${caso.detalle}</span>`;
        return;
      }
      reglas[i].className = "regla--paso";
    }

    veredicto.className = "veredicto concedido";
    veredicto.innerHTML = `<strong>Acceso concedido</strong><span>${caso.detalle}</span>`;
  };

  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      botones.forEach((b) => b.setAttribute("aria-checked", String(b === boton)));
      evaluar(boton.dataset.caso);
    });
  });
}

/* ---------------------------------------------------------------------------
   Mapa de calor de asistencia (datos inventados, solo de ejemplo)
   --------------------------------------------------------------------------- */
function iniciarMapaCalor() {
  const calor = document.querySelector("[data-calor]");
  if (!calor) return;

  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const horas = Array.from({ length: 16 }, (_, i) => 6 + i); // 6:00 a 21:00
  const campana = (x, centro, ancho) => Math.exp(-((x - centro) ** 2) / (2 * ancho ** 2));

  const entradas = (d, h) => {
    const finDeSemana = d >= 5;
    const base = finDeSemana
      ? 55 * campana(h, 10, 1.8) + 12 * campana(h, 17, 2)
      : 70 * campana(h, 7.2, 1.1) + 85 * campana(h, 19, 1.4) + 18 * campana(h, 13.5, 1.5);
    const ajuste = d === 4 ? 0.8 : d === 6 ? 0.6 : 1; // viernes y domingo más tranquilos
    return Math.round((base + 4) * ajuste);
  };

  const celda = (clase, texto = "") => {
    const s = document.createElement("span");
    if (clase) s.className = clase;
    s.textContent = texto;
    return s;
  };

  calor.append(celda("calor__etq"));
  horas.forEach((h) => calor.append(celda("calor__etq calor__hora", h % 3 === 0 ? `${h}h` : "")));

  dias.forEach((dia, d) => {
    calor.append(celda("calor__etq", dia));
    horas.forEach((h) => {
      const n = entradas(d, h);
      const pct = Math.min(100, Math.round((n / 90) * 100));
      const s = celda("");
      s.style.background = `color-mix(in srgb, #1c3fd0 ${pct}%, #efe4d0)`;
      s.title = `${dia} ${h}:00 · ${n} entradas`;
      calor.append(s);
    });
  });
}

/* ---------------------------------------------------------------------------
   Arranque
   --------------------------------------------------------------------------- */
document.querySelectorAll("[data-anio]").forEach((el) => (el.textContent = new Date().getFullYear()));
iniciarMenu();
iniciarApariciones();
iniciarFormularios();
iniciarRed();
iniciarSimulador();
iniciarMapaCalor();

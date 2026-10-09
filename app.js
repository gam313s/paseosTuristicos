//java hace 3 cosas en tiempo 1 define estilos 2 genera contenido 3 agrega eventos a los elementos de html (applistener)

// De lo NUEVO: el arreglo ahora se carga desde Data/Experiencias.json con fetch (antes estaba escrito aqui)
let experiencias = [];
//DE lo NUEVO: estado de la reservacion (se pierde al recargar, sin localStorage)
let reservas = [];

//obtener los elementos de HTML
const catalogo = document.querySelector("#catalogo");
const contador = document.querySelector("#contador");
const botones = document.querySelectorAll("[data-categoria]");
const buscador = document.querySelector("#buscador");//De los Retos: caja de busqueda
const botonOrdenar = document.querySelector("#ordenar");//De los Retos: boton de ordenar
//NUEVO: elementos del precio maximo y de la reservacion
const precioMaximoInput = document.querySelector("#precioMaximo");
const precioSalida = document.querySelector("#precioSalida");
const listaReservas = document.querySelector("#listaReservas");
const totalPersonas = document.querySelector("#totalPersonas");
const total = document.querySelector("#total");
const avisoReserva = document.querySelector("#avisoReserva");
const botonVaciar = document.querySelector("#vaciar");
const confirmarVaciar = document.querySelector("#confirmarVaciar");
const botonSiVaciar = document.querySelector("#siVaciar");
const botonNoVaciar = document.querySelector("#noVaciar");

//De los Retos(de la anterior act): variables que guardan lo que el usuario tiene seleccionado en este momento
let categoriaActual = "todas";
let textoBusqueda = "";
let ordenarPorPrecio = false;
let precioMaximo = Infinity;//NUEVO: sin limite hasta que se cargue el JSON

//De lo NUEVO: da formato de dinero, ej. 1050 -> $1,050 MXN
function formatearPrecio(valor) {
    return `$${valor.toLocaleString("es-MX")} MXN`;
}

//De loNUEVO: escribe un mensaje dentro de la pagina (tipo: "ok" o "error")
function mostrarAviso(elemento, texto, tipo = "error") {
    elemento.textContent = texto;
    elemento.className = `aviso ${tipo}`;
}

//De lo NUEVO: carga el JSON, ajusta el filtro de precio y muestra el catalogo
async function cargarExperiencias() {
    try {
        contador.textContent = "Cargando experiencias...";
        const respuesta = await fetch("./Data/Experiencias.json");
        if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
        experiencias = await respuesta.json();

        //el slider va del precio mas bajo al mas alto del catalogo
        const precios = experiencias.map(e => e.precio);
        precioMaximoInput.min = Math.floor(Math.min(...precios) / 10) * 10;
        precioMaximoInput.max = Math.ceil(Math.max(...precios) / 10) * 10;
        precioMaximoInput.value = precioMaximoInput.max;
        precioMaximo = Number(precioMaximoInput.value);
        precioSalida.textContent = formatearPrecio(precioMaximo);

        aplicarFiltros();
    } catch (error) {
        //si abres index.html con doble clic el fetch falla: usa Live Server
        contador.textContent = "Error al cargar la información";
        catalogo.innerHTML = `<p class="mensaje">No se pudo cargar el catálogo. Abre el proyecto con un servidor local (Live Server).</p>`;
        console.error(error);
    }
}

//funcion para Cargar interactividad y mostrar las experiencias
function mostrarExperiencias(lista) {//funcion para mostrar las experiencias
    //De los Retos: si la lista esta vacia mostramos un mensaje y nos salimos de la funcion
    if (lista.length === 0) {
        catalogo.innerHTML = `<p class="mensaje">No se encontraron experiencias</p>`;
        contador.textContent = "0 experiencias";
        return;
    }

    //innerHTML permite el inyectado de contenido HTML en un elemento del DOM/javascript
 catalogo.innerHTML = lista.map(experiencia => `
 <article class="tarjeta"> 
    <div class="imagen">${experiencia.icono}</div>
        <div class="informacion">
    <span class="etiqueta">${experiencia.categoria}</span>
        <h3>${experiencia.nombre}</h3>
        <p class="precio">$${experiencia.precio} MXN</p>
        <!-- NUEVO: cupo, cantidad de personas y boton para reservar -->
        <p class="cupo">Cupo disponible: ${experiencia.cupo}</p>
        <label>Personas:
            <input type="number" id="cantidad-${experiencia.id}" min="1" max="${experiencia.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${experiencia.id}">Agregar</button>
        <p class="aviso" id="aviso-${experiencia.id}" role="status" aria-live="polite"></p>
    </div>
 </article>
 `).join("");
 contador.textContent = `${lista.length} experiencia${lista.length !== 1 ? "s" : ""}`;
}

//De los Retos (de la anterior act): quita los acentos y pasa a minusculas para que "arqueologica" encuentre "arqueológica"
function limpiarTexto(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

//De los Retos(de la anterior act): esta funcion junta los 3 controles (categoria, busqueda y orden) y muestra el resultado
function aplicarFiltros() {
    //1 filtramos por categoria, nombre del buscador y (NUEVO) precio maximo
    const resultados = experiencias.filter(experiencia =>
        (categoriaActual === "todas" || experiencia.categoria === categoriaActual) &&
        limpiarTexto(experiencia.nombre).includes(limpiarTexto(textoBusqueda)) &&
        experiencia.precio <= precioMaximo
    );

    //2 si el orden esta activado, ordenamos de menor a mayor precio
    if (ordenarPorPrecio) {
        resultados.sort((a, b) => a.precio - b.precio);
    }

    //3 mostramos las tarjetas
    mostrarExperiencias(resultados);
}

//De loNUEVO: agrega personas a una experiencia (o suma si ya estaba reservada)
function agregarReserva(id) {
    const experiencia = experiencias.find(e => e.id === id);
    const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);
    const aviso = document.querySelector(`#aviso-${id}`);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
        mostrarAviso(aviso, "Escribe un número de personas válido (mínimo 1).");
        return;
    }

    const existente = reservas.find(r => r.experienciaId === id);
    const yaReservadas = existente ? existente.cantidad : 0;
    const disponibles = experiencia.cupo - yaReservadas;

    //validacion de cupo: cuenta tambien lo ya reservado
    if (cantidad > disponibles) {
        mostrarAviso(aviso, disponibles === 0
            ? "Ya reservaste todo el cupo de esta experiencia."
            : `Solo quedan ${disponibles} lugar${disponibles !== 1 ? "es" : ""} para ti.`);
        return;
    }

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        reservas.push({ experienciaId: id, nombre: experiencia.nombre, precio: experiencia.precio, cupo: experiencia.cupo, cantidad });
    }

    mostrarAviso(aviso, "Agregado a tu reservación.", "ok");
    mostrarReservas();
}

//De lo NUEVO: dibuja la reservacion y recalcula personas y total
function mostrarReservas() {
    avisoReserva.textContent = "";
    confirmarVaciar.hidden = true;
    botonVaciar.disabled = reservas.length === 0;

    if (reservas.length === 0) {
        listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
        totalPersonas.textContent = "0";
        total.textContent = formatearPrecio(0);
        return;
    }

    listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
        <div>
            <strong>${r.nombre}</strong>
            <p>${r.cantidad} persona(s) × $${r.precio}</p>
            <!-- aumentar o disminuir la cantidad desde la reservacion -->
            <div class="control-cantidad">
                <button data-accion="restar" data-id="${r.experienciaId}" aria-label="Quitar una persona de ${r.nombre}" ${r.cantidad <= 1 ? "disabled" : ""}>−</button>
                <span>${r.cantidad}</span>
                <button data-accion="sumar" data-id="${r.experienciaId}" aria-label="Agregar una persona a ${r.nombre}" ${r.cantidad >= r.cupo ? "disabled" : ""}>+</button>
            </div>
        </div>
        <div>
            <strong>${formatearPrecio(r.precio * r.cantidad)}</strong>
            <button class="btn-eliminar" data-accion="eliminar" data-id="${r.experienciaId}" aria-label="Eliminar ${r.nombre}">Eliminar</button>
        </div>
    </article>`).join("");

    //reduce: suma personas y dinero de todas las reservas
    totalPersonas.textContent = reservas.reduce((suma, r) => suma + r.cantidad, 0);
    total.textContent = formatearPrecio(reservas.reduce((suma, r) => suma + r.precio * r.cantidad, 0));
}

//De lo NUEVO: +1 o -1 persona desde Mi reservacion (respeta minimo 1 y el cupo)
function cambiarCantidad(id, cambio) {
    const reserva = reservas.find(r => r.experienciaId === id);
    const nueva = reserva.cantidad + cambio;
    if (nueva < 1 || nueva > reserva.cupo) return;
    reserva.cantidad = nueva;
    mostrarReservas();
}

//De loNUEVO: elimina una experiencia de la reservacion
function eliminarReserva(id) {
    reservas = reservas.filter(r => r.experienciaId !== id);
    mostrarReservas();
}

//agregar eventos a los botones de filtro
botones.forEach(boton => {//recorre cada boton y agrega un evento de click
    boton.addEventListener("click", () => {
    botones.forEach(elemento => elemento.classList.remove("activo"));
    boton.classList.add("activo");

        //ahora solo guardamos la categoria y llamamos a la funcion que filtra todo
        categoriaActual = boton.dataset.categoria;
        aplicarFiltros();
    });
});

//De los Retos(anterior act): evento del buscador se ejecuta cada vez que el usuario escribe una letra
buscador.addEventListener("input", () => {
    textoBusqueda = buscador.value;
    aplicarFiltros();
});

//De los Retos(anterior act): evento del boton ordenar cada clic activa o desactiva el orden por precio
botonOrdenar.addEventListener("click", () => {
    ordenarPorPrecio = !ordenarPorPrecio;//cambia de true a false y viceversa
    botonOrdenar.classList.toggle("activo");
    aplicarFiltros();
});

//De lo NUEVO: slider de precio maximo
precioMaximoInput.addEventListener("input", () => {
    precioMaximo = Number(precioMaximoInput.value);
    precioSalida.textContent = formatearPrecio(precioMaximo);
    aplicarFiltros();
});

//De loNUEVO: delegacion de eventos, un solo listener sirve aunque las tarjetas se redibujen
catalogo.addEventListener("click", evento => {
    const boton = evento.target.closest(".btn-reservar");
    if (boton) agregarReserva(Number(boton.dataset.id));
});

listaReservas.addEventListener("click", evento => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === "sumar") cambiarCantidad(id, 1);
    if (boton.dataset.accion === "restar") cambiarCantidad(id, -1);
    if (boton.dataset.accion === "eliminar") eliminarReserva(id);
});

//De lo NUEVO: vaciar con confirmacion dentro de la pagina
botonVaciar.addEventListener("click", () => {
    confirmarVaciar.hidden = false;
    botonNoVaciar.focus();
});
botonNoVaciar.addEventListener("click", () => {
    confirmarVaciar.hidden = true;
    botonVaciar.focus();
});
botonSiVaciar.addEventListener("click", () => {
    reservas = [];
    mostrarReservas();
    mostrarAviso(avisoReserva, "Reservación vaciada.", "ok");
});

cargarExperiencias();//antes: aplicarFiltros()

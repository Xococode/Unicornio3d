// Referencias a elementos del DOM (para 2D)
const leftButtonContainer = document.getElementById('left-button-container');
const addPointButton = document.getElementById('add-point');
const freeDrawButton = document.getElementById('free-draw');
const drawLineButton = document.getElementById('draw-line');
const drawCircleButton = document.getElementById('draw-circle');
const drawSquareButton = document.getElementById('draw-square');
const exit2dViewButton = document.getElementById('exit-2d-view');

// Modos de interacción
// Utilizamos la variable global interactionMode

// Variables para Free Draw
let isDrawing = false;
let freeDrawPoints = [];
let freeDrawLine = null;

// Añadir evento para cambiar a vista top (2D)
topViewButton.addEventListener('click', () => {
    // Cambiar a vista top (2D)
    camera.position.set(0, 20, 0);
    camera.up.set(0, 0, -1); // Ajustar la orientación de la cámara para que Z apunte hacia arriba
    camera.lookAt(0, 0, 0);
    controls.update();

    // Mostrar la barra de botones izquierda
    leftButtonContainer.style.display = 'flex';

    setActiveButton('top-view'); // Resaltar el botón de Vista Top
});

// Función para desactivar cualquier modo activo
function deactivateCurrentMode() {
    if (interactionMode === 'add-point') {
        addPointButton.classList.remove('active');
    } else if (interactionMode === 'free-draw') {
        freeDrawButton.classList.remove('active');
        // Finalizar dibujo si estaba en proceso
        if (isDrawing) {
            finishFreeDraw();
        }
    }
    interactionMode = null;
    setActiveButton(null);
}

// Añadir evento para añadir puntos
addPointButton.addEventListener('click', () => {
    if (interactionMode === 'add-point') {
        // Si ya está activo, desactivarlo
        deactivateCurrentMode();
    } else {
        // Activar el modo Añadir Punto
        deactivateCurrentMode();
        setActiveButton('add-point');
        interactionMode = 'add-point';
        addPointButton.classList.add('active');
    }
});

// Añadir evento para Trazado Libre
freeDrawButton.addEventListener('click', () => {
    if (interactionMode === 'free-draw') {
        // Si ya está activo, desactivarlo
        deactivateCurrentMode();
    } else {
        // Activar el modo Trazado Libre
        deactivateCurrentMode();
        setActiveButton('free-draw');
        interactionMode = 'free-draw';
        freeDrawButton.classList.add('active');
    }
});

// Añadir evento para dibujar línea
drawLineButton.addEventListener('click', () => {
    if (objects2D.length < 2) {
        alert('Selecciona al menos dos puntos para dibujar una línea.');
        return;
    }
    setActiveButton('draw-line');
    interactionMode = null; // No modo interactivo después de la acción

    // Crear geometría de la línea
    const points = objects2D.map(obj => obj.position.clone());
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    objects3D.push(line); // Añadir la línea a la lista de objetos 3D

    // Limpiar puntos seleccionados
    clearObjects2D();
});

// Añadir evento para dibujar círculo
drawCircleButton.addEventListener('click', () => {
    if (objects2D.length !== 1) {
        alert('Selecciona exactamente un punto para dibujar un círculo.');
        return;
    }
    setActiveButton('draw-circle');
    interactionMode = null; // No modo interactivo después de la acción

    const point = objects2D[0].position.clone();

    // Crear geometría del círculo
    const circleGeometry = new THREE.CircleGeometry(1, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.position.copy(point);
    circle.rotation.x = -Math.PI / 2; // Alinear el círculo horizontalmente
    scene.add(circle);
    objects3D.push(circle); // Añadir el círculo a la lista de objetos 3D

    // Limpiar puntos seleccionados
    clearObjects2D();
});

// Añadir evento para dibujar cuadrado
drawSquareButton.addEventListener('click', () => {
    if (objects2D.length !== 2) {
        alert('Selecciona exactamente dos puntos para dibujar un cuadrado.');
        return;
    }
    setActiveButton('draw-square');
    interactionMode = null; // No modo interactivo después de la acción

    const point1 = objects2D[0].position.clone();
    const point2 = objects2D[1].position.clone();

    // Calcular el centro y el tamaño del cuadrado
    const center = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    const size = point1.distanceTo(point2);

    // Crear geometría del cuadrado
    const squareGeometry = new THREE.PlaneGeometry(size, size);
    const squareMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const square = new THREE.Mesh(squareGeometry, squareMaterial);
    square.position.copy(center);
    square.rotation.x = -Math.PI / 2; // Alinear el cuadrado horizontalmente
    scene.add(square);
    objects3D.push(square); // Añadir el cuadrado a la lista de objetos 3D

    // Limpiar puntos seleccionados
    clearObjects2D();
});

// Añadir evento para salir de la Vista 2D
exit2dViewButton.addEventListener('click', () => {
    deactivateCurrentMode();
    // Volver a la vista 3D
    camera.position.set(5, 5, 10);
    camera.up.set(0, 1, 0); // Restaurar la orientación estándar de la cámara
    camera.lookAt(0, 0, 0);
    controls.update();

    // Ocultar la barra de botones izquierda
    leftButtonContainer.style.display = 'none';

    // Deseleccionar cualquier objeto seleccionado
    if (selectedObject) {
        if (selectedObject.material && selectedObject.material.emissive) {
            selectedObject.material.emissive.set(0x000000); // Quitar el brillo
        }
        transformControls.detach();
        selectedObject = null;
    }

    // Limpiar puntos 2D
    clearObjects2D();

    setActiveButton(null); // Desactivar cualquier botón activo
});

// Añadir evento para agregar puntos al clic en la escena (Vista 2D)
renderer.domElement.addEventListener('pointerdown', (event) => {
    if (interactionMode === 'add-point') {
        addPoint(event);
    }
});

// Funciones para Añadir Punto
function addPoint(event) {
    // Normalizar coordenadas del puntero
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // Crear un rayo desde la cámara hasta el punto donde se hizo clic
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Definir un plano en Y=0 para detectar la intersección
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
        // Crear una pequeña esfera como punto
        const pointGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const point = new THREE.Mesh(pointGeometry, pointMaterial);
        point.position.copy(intersectPoint);
        scene.add(point);
        objects2D.push(point); // Añadir el punto a la lista de objetos 2D
    }

    // Mantener el modo activo para añadir múltiples puntos
}

// Funciones para Trazado Libre
function startFreeDraw(event) {
    isDrawing = true;
    freeDrawPoints = [];

    // Deshabilitar controles de órbita mientras se dibuja
    controls.enabled = false;

    // Crear la geometría inicial
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
    freeDrawLine = new THREE.Line(geometry, material);
    scene.add(freeDrawLine);
}

function continueFreeDraw(event) {
    if (!isDrawing) return;

    // Normalizar coordenadas del puntero
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // Crear un rayo desde la cámara hasta el punto donde se hizo clic
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Definir un plano en Y=0 para detectar la intersección
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
        freeDrawPoints.push(intersectPoint.x, intersectPoint.y, intersectPoint.z);

        // Actualizar la geometría de la línea
        const positions = new Float32Array(freeDrawPoints);
        freeDrawLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        freeDrawLine.geometry.computeBoundingSphere();
    }
}

function finishFreeDraw() {
    if (freeDrawPoints.length > 3) {
        objects3D.push(freeDrawLine); // Añadir a la lista de objetos 3D
        freeDrawLine = null;
    } else {
        // Si no se dibujó nada, eliminar la línea
        scene.remove(freeDrawLine);
    }

    isDrawing = false;
    freeDrawPoints = [];

    // Rehabilitar controles de órbita
    controls.enabled = true;
}

// Añadir eventos para Trazado Libre
renderer.domElement.addEventListener('pointerdown', (event) => {
    if (interactionMode === 'free-draw') {
        startFreeDraw(event);
    }
});

renderer.domElement.addEventListener('pointermove', (event) => {
    if (interactionMode === 'free-draw') {
        continueFreeDraw(event);
    }
});

renderer.domElement.addEventListener('pointerup', (event) => {
    if (interactionMode === 'free-draw') {
        finishFreeDraw();
    }
});

// Añadir evento para desactivar modos con la tecla Esc
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        deactivateCurrentMode();
    }
});

// Función para limpiar objetos 2D seleccionados
function clearObjects2D() {
    objects2D.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    objects2D.length = 0; // Vaciar el arreglo de objetos 2D
}

// La función setActiveButton ya está definida en main3D.js y es accesible

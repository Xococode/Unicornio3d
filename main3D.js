// Mostrar el popup al cargar la página
window.addEventListener('load', () => {
    const popup = document.getElementById('popup');
    popup.style.display = 'block';
    setTimeout(() => {
        popup.style.display = 'none';
    }, 5000);
});

// Inicializar la escena, la cámara y el renderizador de Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0); // Fondo gris claro para mejor contraste

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Habilitar sombras
document.body.appendChild(renderer.domElement);

// Añadir controles de órbita
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Movimiento suave
controls.dampingFactor = 0.1;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Luz ambiental para iluminar el objeto
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Luz direccional para sombras y efectos
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Añadir rejilla en el suelo
const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0xdddddd);
scene.add(gridHelper);

// Añadir TransformControls para mover el objeto
const transformControls = new THREE.TransformControls(camera, renderer.domElement);
transformControls.addEventListener('change', () => renderer.render(scene, camera));
transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value; // Deshabilitar órbita mientras se arrastra
});
scene.add(transformControls);

// Listas de objetos 3D y 2D en la escena
const objects3D = []; // Objetos agregados por el usuario
const objects2D = [];

// Crear una geometría inicial (pieza en forma de caja)
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshPhongMaterial({ color: 0x1f78b4 });
const mesh = new THREE.Mesh(geometry, material);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);
objects3D.push(mesh);

// Variable para almacenar el objeto actualmente seleccionado
let selectedObject = null;

// Referencias a elementos del DOM (para 3D)
const importModelButton = document.getElementById('import-model');
const fileInput = document.getElementById('file-input');
const importHdrButton = document.getElementById('import-hdr');
const hdrInput = document.getElementById('hdr-input');
const moveObjectButton = document.getElementById('move-object');
const rotateObjectButton = document.getElementById('rotate-object');
const scaleObjectButton = document.getElementById('scale-object');
const addBoxButton = document.getElementById('add-box');
const dropBoxButton = document.getElementById('drop-box');
const resetViewButton = document.getElementById('reset-view');
const topViewButton = document.getElementById('top-view');
const frontViewButton = document.getElementById('front-view'); // Nuevo botón
const saveSceneButton = document.getElementById('save-scene');
const loadSceneButton = document.getElementById('load-scene');
const sceneInput = document.getElementById('scene-input');

// Pila para acciones de deshacer y rehacer
const undoStack = [];
const redoStack = [];

// Función para guardar el estado actual en la pila de deshacer
function saveState() {
    redoStack.length = 0; // Limpiar la pila de rehacer
    const state = objects3D.map(obj => obj.toJSON()); // Serializar los objetos del usuario
    undoStack.push(state); // Guardar el estado en la pila de deshacer
}

// Función para deshacer la última acción
function undo() {
    if (undoStack.length === 0) return;

    const currentState = objects3D.map(obj => obj.toJSON());
    redoStack.push(currentState);
    const previousState = undoStack.pop();
    loadObjectsFromState(previousState); // Cargar el estado anterior
}

// Función para rehacer la última acción deshecha
function redo() {
    if (redoStack.length === 0) return;

    const nextState = redoStack.pop();
    const currentState = objects3D.map(obj => obj.toJSON());
    undoStack.push(currentState);
    loadObjectsFromState(nextState); // Cargar el siguiente estado
}

// Función para cargar objetos desde un estado guardado
function loadObjectsFromState(state) {
    objects3D.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    objects3D.length = 0;

    const loader = new THREE.ObjectLoader();
    state.forEach(objData => {
        loader.parse(objData, (obj) => {
            scene.add(obj);
            objects3D.push(obj);
        });
    });

    transformControls.detach();
    selectedObject = null;
}

// Función para manejar la selección de objetos 3D
function onPointerDown(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objects3D, true); // Incluir objetos anidados
    if (intersects.length > 0) {
        if (selectedObject) {
            if (selectedObject.material && selectedObject.material.emissive) {
                selectedObject.material.emissive.set(0x000000); // Quitar el brillo del objeto previamente seleccionado
            }
        }
        selectedObject = intersects[0].object; // Actualizar el objeto seleccionado
        if (selectedObject.material && selectedObject.material.emissive) {
            selectedObject.material.emissive.set(0xffa500); // Añadir brillo al nuevo objeto seleccionado
            selectedObject.material.emissiveIntensity = 0.5;
        }
        transformControls.attach(selectedObject); // Adjuntar gizmo al objeto seleccionado
        setActiveButton(null); // Desactivar botones de transformación
        updatePropertyPanel(); // Actualizar el panel de propiedades
    }
}

// Añadir evento para seleccionar el objeto usando el puntero
window.addEventListener('pointerdown', onPointerDown);

// Añadir evento para mover el objeto
moveObjectButton.addEventListener('click', () => {
    if (selectedObject) {
        setActiveButton('move-object');
        transformControls.setMode('translate'); // Establecer el modo a "translación"
    }
});

// Añadir evento para rotar el objeto
rotateObjectButton.addEventListener('click', () => {
    if (selectedObject) {
        setActiveButton('rotate-object');
        transformControls.setMode('rotate'); // Establecer el modo a "rotación"
    }
});

// Añadir evento para escalar el objeto
scaleObjectButton.addEventListener('click', () => {
    if (selectedObject) {
        setActiveButton('scale-object');
        transformControls.setMode('scale'); // Establecer el modo a "escalado"
    }
});

// Añadir evento para agregar una nueva caja
addBoxButton.addEventListener('click', () => {
    saveState(); // Guardamos el estado antes de la acción
    setActiveButton('add-box');
    const newGeometry = new THREE.BoxGeometry(2, 2, 2);
    const newMaterial = new THREE.MeshPhongMaterial({ color: 0x4caf50 });
    const newMesh = new THREE.Mesh(newGeometry, newMaterial);
    newMesh.position.set(Math.random() * 10 - 5, 1, Math.random() * 10 - 5); // Posicionar la caja aleatoriamente
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    scene.add(newMesh);
    objects3D.push(newMesh); // Añadir el nuevo objeto a la lista de objetos 3D
});

// Añadir evento para soltar una caja desde el cielo
dropBoxButton.addEventListener('click', () => {
    saveState(); // Guardamos el estado antes de la acción
    setActiveButton('drop-box');
    const dropGeometry = new THREE.BoxGeometry(2, 2, 2);
    const dropMaterial = new THREE.MeshPhongMaterial({ color: 0xff6347 });
    const dropMesh = new THREE.Mesh(dropGeometry, dropMaterial);
    dropMesh.position.set(Math.random() * 10 - 5, 20, Math.random() * 10 - 5); // Comenzar desde arriba
    dropMesh.castShadow = true;
    dropMesh.receiveShadow = true;
    scene.add(dropMesh);
    objects3D.push(dropMesh); // Añadir el nuevo objeto a la lista de objetos 3D

    // Animación de caída con detección de colisión
    function animateDrop() {
        const raycaster = new THREE.Raycaster();
        raycaster.set(dropMesh.position, new THREE.Vector3(0, -1, 0)); // Rayo hacia abajo
        const intersects = raycaster.intersectObjects(objects3D, true);

        if (intersects.length > 0 && intersects[0].distance <= 1.1) {
            return; // Si el rayo detecta colisión con otro objeto cercano
        }

        if (dropMesh.position.y > 1) {
            dropMesh.position.y -= 0.2;
            requestAnimationFrame(animateDrop);
        }
    }
    animateDrop();
});

// Añadir evento para duplicar el objeto con Ctrl+D
window.addEventListener('keydown', (event) => {
    // Deshacer con Ctrl+Z
    if (event.key === 'z' && event.ctrlKey) {
        undo();
    }

    // Rehacer con Ctrl+Y o Ctrl+Shift+Z
    if ((event.key === 'y' && event.ctrlKey) || (event.key === 'Z' && event.ctrlKey && event.shiftKey)) {
        redo();
    }

    // Duplicar objeto con Ctrl+D
    if (event.key === 'd' && event.ctrlKey && selectedObject) {
        saveState(); // Guardamos el estado antes de la acción

        const newGeometry = selectedObject.geometry.clone(); // Clonar la geometría del objeto seleccionado
        const newMaterial = selectedObject.material.clone();
        const newMesh = new THREE.Mesh(newGeometry, newMaterial);
        newMesh.position.copy(selectedObject.position).add(new THREE.Vector3(1, 0, 0)); // Posicionar la nueva caja ligeramente desplazada
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;
        scene.add(newMesh);
        objects3D.push(newMesh); // Añadir el nuevo objeto a la lista de objetos 3D
    }

    // Eliminar objeto con Delete
    if (event.key === 'Delete' && selectedObject) {
        event.preventDefault(); // Prevenir comportamiento por defecto si es necesario
        saveState(); // Guardamos el estado antes de la acción

        // Eliminar el objeto de la escena
        scene.remove(selectedObject);

        // Eliminar el objeto de la lista de objetos 3D
        const index = objects3D.indexOf(selectedObject);
        if (index > -1) {
            objects3D.splice(index, 1);
        }

        // Destruir el objeto para liberar memoria
        if (selectedObject.geometry) selectedObject.geometry.dispose();
        if (selectedObject.material) selectedObject.material.dispose();

        // Desconectar transformControls y limpiar la selección
        transformControls.detach();
        selectedObject = null;

        console.log('Objeto eliminado correctamente.');
    }

    // Mostrar/ocultar el panel de propiedades al presionar "P"
    if (event.key === 'p') {
        togglePropertyPanel(); // Alternar la visibilidad del panel
    }
});

// Función para mostrar/ocultar el panel de propiedades
function togglePropertyPanel() {
    const propertyPanel = document.getElementById('property-panel');
    if (propertyPanel.style.display === 'none' || propertyPanel.style.display === '') {
        propertyPanel.style.display = 'block'; // Mostrar el panel
    } else {
        propertyPanel.style.display = 'none'; // Ocultar el panel
    }
}

// Añadir eventos para TransformControls para guardar estado después de mover, rotar o escalar
transformControls.addEventListener('mouseUp', () => {
    saveState(); // Guardamos el estado después de finalizar la transformación
});

// Función de animación para renderizar continuamente
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Actualizar los controles de órbita
    renderer.render(scene, camera);
}
animate();

// Añadir un selector de color usando Pickr
const pickr = Pickr.create({
    el: '#color-picker',
    theme: 'classic', // 'classic' theme
    default: '#1f78b4',
    components: {
        // Main components
        preview: true,
        opacity: true,
        hue: true,

        // Input / output Options
        interaction: {
            hex: true,
            rgba: true,
            input: true,
            save: true
        }
    }
});

// Cambiar el color del material del objeto usando Pickr
pickr.on('change', (color) => {
    const hexColor = color.toHEXA().toString();
    if (selectedObject && selectedObject.material) {
        saveState(); // Guardamos el estado antes de cambiar el color
        selectedObject.material.color.set(hexColor);
    }
});

// Añadir evento para restablecer la vista de la cámara
resetViewButton.addEventListener('click', () => {
    camera.position.set(5, 5, 10);
    camera.up.set(0, 1, 0); // Restaurar la orientación estándar de la cámara
    camera.lookAt(0, 0, 0);
    controls.reset();
    // Ocultar barra de botones izquierda si estaba visible
    const leftButtonContainer = document.getElementById('left-button-container');
    leftButtonContainer.style.display = 'none';
    // Deseleccionar cualquier objeto seleccionado
    if (selectedObject) {
        if (selectedObject.material && selectedObject.material.emissive) {
            selectedObject.material.emissive.set(0x000000); // Quitar el brillo
        }
        transformControls.detach();
        selectedObject = null;
    }
});

// Función para establecer el botón activo
function setActiveButton(buttonId) {
    const buttons = document.querySelectorAll('.button-container button');
    buttons.forEach(button => {
        if (button.id === buttonId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // También desactivar botones de la barra izquierda
    const leftButtons = document.querySelectorAll('.left-button-container button');
    leftButtons.forEach(button => {
        if (button.id === buttonId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// **Añadir eventos para importar modelos y HDR**

// Evento para el botón de importación de modelos
importModelButton.addEventListener('click', () => {
    fileInput.click(); // Simula un clic en el input de archivo oculto
});

// Evento para manejar la carga de archivos
fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    const gltfLoader = new THREE.GLTFLoader();
    const objLoader = new THREE.OBJLoader();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension === 'gltf' || fileExtension === 'glb') {
            gltfLoader.load(url, (gltf) => {
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                model.position.set(0, 0, 0); // Ajusta la posición si es necesario
                scene.add(model);
                objects3D.push(model);
            }, undefined, (error) => {
                console.error('Error al cargar el modelo GLTF/GLB:', error);
            });
        } else if (fileExtension === 'obj') {
            objLoader.load(url, (obj) => {
                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                obj.position.set(0, 0, 0); // Ajusta la posición si es necesario
                scene.add(obj);
                objects3D.push(obj);
            }, undefined, (error) => {
                console.error('Error al cargar el modelo OBJ:', error);
            });
        } else {
            console.warn('Formato no soportado:', fileExtension);
        }

        // Liberar el objeto URL
        URL.revokeObjectURL(url);
    }

    // Limpiar el input para poder cargar el mismo archivo nuevamente si es necesario
    fileInput.value = '';
});

// Evento para el botón de importación de HDR
importHdrButton.addEventListener('click', () => {
    hdrInput.click(); // Simula un clic en el input de archivo oculto
});

// Evento para manejar la carga de imágenes HDR
hdrInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const url = URL.createObjectURL(file);

    const rgbeLoader = new THREE.RGBELoader();
    rgbeLoader.load(url, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;

        // Liberar el objeto URL
        URL.revokeObjectURL(url);
    }, undefined, (error) => {
        console.error('Error al cargar la imagen HDR:', error);
    });

    // Limpiar el input para poder cargar el mismo archivo nuevamente si es necesario
    hdrInput.value = '';
});

// **Eventos para Guardar y Cargar Escenas**

// Función para guardar la escena
function saveScene() {
    const sceneData = objects3D.map(obj => obj.toJSON());
    const sceneStr = JSON.stringify(sceneData);

    const blob = new Blob([sceneStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'scene.json';
    link.click();

    URL.revokeObjectURL(url);
}

// Función para cargar una escena
function loadScene(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const contents = event.target.result;
        const sceneData = JSON.parse(contents);

        objects3D.forEach(obj => {
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        objects3D.length = 0;

        const loader = new THREE.ObjectLoader();
        sceneData.forEach(objData => {
            loader.parse(objData, (obj) => {
                scene.add(obj);
                objects3D.push(obj);
            });
        });

        transformControls.detach();
        selectedObject = null;
    };
    reader.readAsText(file);
}

// Evento para guardar la escena
saveSceneButton.addEventListener('click', () => {
    saveScene();
});

// Evento para cargar la escena
loadSceneButton.addEventListener('click', () => {
    sceneInput.click(); // Simular clic en el input oculto
});

// Manejar la selección de archivo
sceneInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        loadScene(file);
    }

    sceneInput.value = ''; // Limpiar el input para poder cargar el mismo archivo nuevamente
});

// Referencias a elementos del DOM para propiedades
const propertyPanel = document.getElementById('property-panel');
const colorInput = document.getElementById('color-input');
const sizeInput = document.getElementById('size-input');
const rotationInput = document.getElementById('rotation-input');
const positionXInput = document.getElementById('position-x-input');
const positionYInput = document.getElementById('position-y-input');
const positionZInput = document.getElementById('position-z-input');

function updatePropertyPanel() {
    if (selectedObject) {
        propertyPanel.style.display = 'block'; // Mostrar el panel
        // Actualizar campos de entrada con las propiedades del objeto seleccionado
        colorInput.value = `#${selectedObject.material.color.getHexString()}`;
        sizeInput.value = selectedObject.scale.x; // Suponiendo que el objeto es un cubo
        rotationInput.value = THREE.MathUtils.radToDeg(selectedObject.rotation.y); // Rotación en grados
        positionXInput.value = selectedObject.position.x;
        positionYInput.value = selectedObject.position.y;
        positionZInput.value = selectedObject.position.z;
    } else {
        propertyPanel.style.display = 'none'; // Ocultar el panel si no hay objeto seleccionado
    }
}

// Añadir evento para actualizar color
colorInput.addEventListener('input', (event) => {
    if (selectedObject && selectedObject.material) {
        saveState(); // Guardar estado antes de cambiar
        selectedObject.material.color.set(event.target.value);
    }
});

// Añadir evento para actualizar tamaño
sizeInput.addEventListener('input', (event) => {
    if (selectedObject) {
        const newSize = parseFloat(event.target.value);
        saveState(); // Guardar estado antes de cambiar
        selectedObject.scale.set(newSize, newSize, newSize); // Escalar uniformemente
    }
});

// Añadir evento para actualizar rotación
rotationInput.addEventListener('input', (event) => {
    if (selectedObject) {
        const newRotation = THREE.MathUtils.degToRad(parseFloat(event.target.value)); // Convertir a radianes
        saveState(); // Guardar estado antes de cambiar
        selectedObject.rotation.y = newRotation; // Cambiar rotación en Y
    }
});

// Añadir eventos para actualizar posición
positionXInput.addEventListener('input', (event) => {
    if (selectedObject) {
        const newX = parseFloat(event.target.value);
        saveState(); // Guardar estado antes de cambiar
        selectedObject.position.x = newX; // Cambiar posición en X
    }
});

positionYInput.addEventListener('input', (event) => {
    if (selectedObject) {
        const newY = parseFloat(event.target.value);
        saveState(); // Guardar estado antes de cambiar
        selectedObject.position.y = newY; // Cambiar posición en Y
    }
});

positionZInput.addEventListener('input', (event) => {
    if (selectedObject) {
        const newZ = parseFloat(event.target.value);
        saveState(); // Guardar estado antes de cambiar
        selectedObject.position.z = newZ; // Cambiar posición en Z
    }
});

// Actualizar el panel de propiedades cuando se selecciona un objeto
window.addEventListener('pointerdown', (event) => {
    onPointerDown(event); // Selección de objetos
    updatePropertyPanel(); // Actualizar el panel de propiedades
});

document.getElementById('close-panel').addEventListener('click', () => {
    propertyPanel.style.display = 'none'; // Ocultar el panel
});

// Referencias a elementos del DOM para propiedades
const togglePanelButton = document.getElementById('toggle-panel');

// Variable para mantener el estado de visibilidad del panel
let isPanelVisible = false;

// Función para alternar el panel de propiedades
function togglePropertyPanel() {
    isPanelVisible = !isPanelVisible; // Cambia el estado de visibilidad
    propertyPanel.style.display = isPanelVisible ? 'block' : 'none'; // Muestra u oculta el panel
}

// Añadir evento al botón de alternar
togglePanelButton.addEventListener('click', togglePropertyPanel);

// Función para actualizar el panel de propiedades
function updatePropertyPanel() {
    if (selectedObject) {
        // Solo actualiza el panel si está visible
        if (isPanelVisible) {
            propertyPanel.style.display = 'block'; // Asegúrate de que esté visible
            // Actualizar campos de entrada con las propiedades del objeto seleccionado
            colorInput.value = `#${selectedObject.material.color.getHexString()}`;
            sizeInput.value = selectedObject.scale.x; // Suponiendo que el objeto es un cubo
            rotationInput.value = THREE.MathUtils.radToDeg(selectedObject.rotation.y); // Rotación en grados
            positionXInput.value = selectedObject.position.x;
            positionYInput.value = selectedObject.position.y;
            positionZInput.value = selectedObject.position.z;
        }
    } else {
        propertyPanel.style.display = 'none'; // Ocultar el panel si no hay objeto seleccionado
    }
}

// Actualizar el panel de propiedades cuando se selecciona un objeto
window.addEventListener('pointerdown', (event) => {
    onPointerDown(event); // Selección de objetos
    updatePropertyPanel(); // Actualizar el panel de propiedades solo si está visible
});



// Añadir evento para cambiar a la vista frontal
frontViewButton.addEventListener('click', () => {
    // Cambiar la posición de la cámara para la vista frontal
    camera.position.set(0, 5, 10); // Ajusta la posición para que sea frontal
    camera.lookAt(0, 0, 0); // Mirar hacia el origen
    controls.update(); // Actualiza los controles

    // Mostrar barra de botones izquierda para opciones de dibujo 2D
    const leftButtonContainer = document.getElementById('left-button-container');
    leftButtonContainer.style.display = 'flex'; // Muestra los botones de la vista 2D
});


















// Crear un grupo para la rejilla
const gridGroup = new THREE.Group(); // Crea un nuevo grupo
scene.add(gridGroup); // Añadir el grupo a la escena

// Crear la rejilla

gridGroup.add(gridHelper); // Añadir la rejilla al grupo

// Añadir TransformControls para la rejilla
const gridTransformControls = new THREE.TransformControls(camera, renderer.domElement);
gridTransformControls.attach(gridGroup); // Adjuntar el grupo de la rejilla al gizmo
scene.add(gridTransformControls);

// Inicialmente ocultar el gizmo de la rejilla
gridTransformControls.visible = false;

// Permitir la rotación en X, Y y Z
gridTransformControls.setMode('rotate'); // Establecer el modo a "rotación"

// Añadir evento para deshabilitar controles de órbita mientras se arrastra
gridTransformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value; // Deshabilitar controles de órbita mientras se arrastra
});

// Guardar la posición original de los objetos
const originalPositions = []; // Almacenar posiciones originales

// Añadir evento para mover la rejilla
gridTransformControls.addEventListener('change', () => {
    // Cada vez que la rejilla se mueve, recalibrar las posiciones de los objetos
    objects3D.forEach((obj, index) => {
        const gridWorldPosition = new THREE.Vector3();
        gridGroup.getWorldPosition(gridWorldPosition); // Obtener la posición mundial de la rejilla

        // Ajustar la posición de los objetos respecto a la rejilla
        obj.position.x += gridWorldPosition.x - originalPositions[index].x;
        obj.position.y += gridWorldPosition.y - originalPositions[index].y;
        obj.position.z += gridWorldPosition.z - originalPositions[index].z;

        // Actualiza la posición original del objeto
        originalPositions[index].set(obj.position.x, obj.position.y, obj.position.z);
    });

    // Actualiza el panel de coordenadas
    updateCoordinatesPanel();
});

// Panel de coordenadas
const coordinatesPanel = document.createElement('div');
coordinatesPanel.style.position = 'absolute';
coordinatesPanel.style.top = '10px';
coordinatesPanel.style.left = '10px';
coordinatesPanel.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
coordinatesPanel.style.padding = '10px';
coordinatesPanel.style.borderRadius = '5px';
coordinatesPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
coordinatesPanel.innerHTML = `
    <h3>Coordenadas de la Rejilla</h3>
    <label>X: <input type="number" id="grid-pos-x" step="0.1"></label><br>
    <label>Y: <input type="number" id="grid-pos-y" step="0.1"></label><br>
    <label>Z: <input type="number" id="grid-pos-z" step="0.1"></label><br>
    <label>Escala: <input type="range" id="grid-scale" min="0.1" max="10" step="0.1" value="1"></label>
    <span id="scale-value">1</span>
`;
coordinatesPanel.style.display = 'none'; // Ocultar el panel por defecto
document.body.appendChild(coordinatesPanel);

// Actualizar las coordenadas en el panel
function updateCoordinatesPanel() {
    const position = gridGroup.position; // Obtener la posición del grupo de la rejilla
    document.getElementById('grid-pos-x').value = position.x.toFixed(2);
    document.getElementById('grid-pos-y').value = position.y.toFixed(2);
    document.getElementById('grid-pos-z').value = position.z.toFixed(2);
}

// Añadir eventos para los inputs del panel de coordenadas
document.getElementById('grid-pos-x').addEventListener('input', (event) => {
    gridGroup.position.x = parseFloat(event.target.value); // Actualizar posición X
});

document.getElementById('grid-pos-y').addEventListener('input', (event) => {
    gridGroup.position.y = parseFloat(event.target.value); // Actualizar posición Y
});

document.getElementById('grid-pos-z').addEventListener('input', (event) => {
    gridGroup.position.z = parseFloat(event.target.value); // Actualizar posición Z
});

// Cambiar escala de la rejilla usando el slider
document.getElementById('grid-scale').addEventListener('input', (event) => {
    const scaleValue = parseFloat(event.target.value);
    gridGroup.scale.set(scaleValue, scaleValue, scaleValue); // Escalar la rejilla
    document.getElementById('scale-value').textContent = scaleValue.toFixed(1); // Mostrar el valor de escala
});

// Añadir un botón para activar los controles de transformación de la rejilla
const rotateGridButton = document.getElementById('rotate-grid'); // Asegúrate de que tienes este botón en tu HTML

rotateGridButton.addEventListener('click', () => {
    if (gridTransformControls.visible) {
        // Si el gizmo ya está visible, ocultarlo
        gridTransformControls.visible = false;
        gridTransformControls.detach(); // Desvincular el gizmo
        rotateGridButton.classList.remove('active'); // Remover el estado activo del botón
        coordinatesPanel.style.display = 'none'; // Ocultar el panel de coordenadas
    } else {
        // Mostrar el gizmo y vincularlo al grupo de la rejilla
        gridTransformControls.visible = true;
        gridTransformControls.attach(gridGroup); // Adjuntar el grupo de la rejilla al gizmo
        gridTransformControls.setMode('rotate'); // Asegurarse de que está en modo rotación
        rotateGridButton.classList.add('active'); // Añadir el estado activo al botón
        coordinatesPanel.style.display = 'block'; // Mostrar el panel de coordenadas

        // Guardar las posiciones originales de los objetos
        originalPositions.length = 0; // Limpiar posiciones originales
        objects3D.forEach(obj => {
            originalPositions.push(obj.position.clone()); // Clonar la posición del objeto
        });
    }
});

// Llamar a la función para inicializar el panel de coordenadas
updateCoordinatesPanel();

let camera, scene, renderer, controls;
let gameBoard, cells = [], marks = [];
let raycaster, mouse = { x: 0, y: 0 };
let INTERSECTED = null;
let isXNext = true;
let winInfo = null;
let SPACING = 2.5;
let cornerLightsEnabled = false; 
let coneLightColors = { red: 0xff0000, blue: 0x0000ff };
let gridSize = 3; // Game size 
let totalCells; 
let modelX, modelO;
let customModelX = null;
let customModelO = null;
let modelXName = null;
let modelOName = null;
let gameStarted = false;

initStartWindow();

async function init() {
    if (!gameStarted) return;

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas1').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 10, 50);

    raycaster = new THREE.Raycaster();
    mouse = { x: 0, y: 0 };

    // Load models
    modelX = await loadOBJectsStandard(
        0, 0, 0,
        'models/lemon.obj',             // path to model
        16, 16, 16,             // scale
        'models/lemon_tex.jpeg',     // path to texture
        0xffff00
    );

    modelO = await loadOBJectsStandard(
        0, 0, 0,
        'models/orange.obj',
        13, 13, 13,
        'models/orange_tex.jpg',
        0xffffff
    );


    // Create a canvas for the gradient
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    // Create a vertical gradient
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#87ceeb'); // Light sky blue
    gradient.addColorStop(1, '#ffffff'); // White

    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, 256);

    const bgTexture = new THREE.CanvasTexture(canvas);
    scene.background = bgTexture;

    // Calculate total number of cells
    totalCells = gridSize * gridSize * gridSize;
    // Initialise the playing field
    gameBoard = Array(totalCells).fill(null);

    setupLights();
    createUI();
    addObjects();

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;       // movement
    controls.enableZoom = true;      // scale
    controls.enableRotate = true;    // rotation
    controls.panSpeed = 0.3;
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 0.4;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    raycaster = new THREE.Raycaster();

    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('click', onDocumentClick, false);

    window.addEventListener('resize', onWindowResize, false);

}

function initStartWindow() {
    const startWindow = document.createElement('div');
    startWindow.className = 'start-window';
    startWindow.innerHTML = `
        <div class="start-content">
            <h1>Welcome to 3D Tic Tac Toe</h1>
            <p>Developed by: Maksym Perenchuk & Andrei Dzemidovich</p>
            <p>Subject: Introduction to computer graphics</p>
            <p>Academic year: 2024</p>
            <p>(KPI FEI TUKE)</p>
            <button class="start-button">Start Game</button>
        </div>
    `;
    document.body.appendChild(startWindow);

    const startButton = startWindow.querySelector('.start-button');
    startButton.onclick = () => {
        gameStarted = true;
        document.body.removeChild(startWindow);
        init();
        render();
    };
}

function setupLights() {
    const directionalLight1 = new THREE.DirectionalLight(coneLightColors.red, 1); // Red light
    directionalLight1.position.set(-10, 10, 0);
    scene.add(directionalLight1);

    const projector1 = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1, 32),
        new THREE.MeshStandardMaterial({ color: coneLightColors.red })
    );
    projector1.position.set(-10, 10, 10);
    projector1.rotation.x = Math.PI / 2;
    scene.add(projector1);

    const directionalLight2 = new THREE.DirectionalLight(coneLightColors.blue, 1); // Blue light
    directionalLight2.position.set(10, 10, 10);
    scene.add(directionalLight2);

    const projector2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1, 32),
        new THREE.MeshStandardMaterial({ color: coneLightColors.blue })
    );
    projector2.position.set(10, 10, 10);
    projector2.rotation.x = Math.PI / 2;
    scene.add(projector2);

    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const cornerLights = colors.map((color, index) => {
        const light = new THREE.PointLight(color, 0.3);
        const angle = (index / colors.length) * Math.PI * 2;
        const radius = 8;
        light.position.set(
            Math.cos(angle) * radius,
            2,
            Math.sin(angle) * radius
        );
        return light;
    });
    cornerLights.forEach(light => scene.add(light));

    window.gameLights = {
        cornerLights,
        update: function(time) {
            if (cornerLightsEnabled) {
                cornerLights.forEach((light, index) => {
                    const angle = ((time / 3000) + (index / colors.length)) * Math.PI * 2;
                    const radius = 8;
                    light.position.x = Math.cos(angle) * radius;
                    light.position.z = Math.sin(angle) * radius;
                });
            }
        }
    };
}

function addObjects() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.ShadowMaterial({ opacity: 0.5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Calculate a new SPACING based on the grid size
    SPACING = 2.5 * (4 / gridSize);

    const cellSize = 0.8 * (3 / gridSize);
    const cellGeometry = new THREE.BoxGeometry(cellSize,cellSize,cellSize);
    const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        opacity: 0.5,
        transparent: true
    });
    const highlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        opacity: 0.5,
        transparent: true
    });

    // Clearing existing cells
    cells.forEach(cell => scene.remove(cell));
    cells = [];

    for (let i = 0; i < totalCells; i++) {
        const position = calculatePosition(i);
        const cell = new THREE.Mesh(cellGeometry, defaultMaterial.clone());
        cell.position.copy(position);
        cell.userData.index = i;
        cell.userData.defaultMaterial = cell.material;
        cell.userData.highlightMaterial = highlightMaterial.clone();
        cells.push(cell);
        scene.add(cell);
    }
}


function render() {
    requestAnimationFrame(render);
    update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
    if (!raycaster || !mouse || !controls) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cells);

    if (INTERSECTED !== null && INTERSECTED >= 0 && INTERSECTED < cells.length) {
        const prevCell = cells[INTERSECTED];
        if (prevCell && prevCell.userData) {
            prevCell.material = prevCell.userData.defaultMaterial;
        }
    }

    INTERSECTED = null;
    if (intersects.length > 0) {
        const index = intersects[0].object.userData.index;
        if (index !== undefined && !gameBoard[index] && !winInfo) {
            INTERSECTED = index;
            const cell = cells[index];
            if (cell && cell.userData) {
                cell.material = cell.userData.highlightMaterial;
            }
        }
    }

    controls.update();

    if (window.gameLights) {
        window.gameLights.update(performance.now());
    }

}

// Function to load obj models
function loadOBJectsStandard(x, y, z, path, scalex, scaley, scalez, texturePath, colorMaterial) {
    var loader = new THREE.OBJLoader();
    var textureSurface = new THREE.TextureLoader().load(texturePath);
    var material = new THREE.MeshStandardMaterial({
        color: colorMaterial,
        map: textureSurface,
        roughness: 0.05,
        metalness: 0.45
    });

    return new Promise((resolve) => {
        loader.load(path, function(object) {
            object.traverse(function(node) {
                object.position.set(x, y, z);
                object.material = material;
                object.scale.set(scalex, scaley, scalez);
                if (node.isMesh) node.material = material;
            });
            resolve(object);
        });
    });
}

function handleModelUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Check for the same models
    if (type === 'X' && file.name === modelOName) {
        showGameAlert('This model is already used for O. Please choose a different model.');
        event.target.value = '';
        return;
    } else if (type === 'O' && file.name === modelXName) {
        showGameAlert('This model is already used for X. Please choose a different model.');
        event.target.value = '';
        return;
    }

    const loader = new THREE.OBJLoader();
    const material = new THREE.MeshStandardMaterial({
        color: type === 'X' ? 0xffff00 : 0xff8c00,
        roughness: 0.5,
        metalness: 0.5
    });

    return new Promise((resolve) => {
        loader.load(
            URL.createObjectURL(file),
            (object) => {
                object.traverse((child) => {
                    if (child.isMesh) child.material = material;
                });

                // Scale new model to default
                const bbox = new THREE.Box3().setFromObject(object);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1.5 / maxDim;
                object.scale.set(scale, scale, scale);

                if (type === 'X') {
                    customModelX = object;
                    modelXName = file.name;
                } else {
                    customModelO = object;
                    modelOName = file.name;
                }
                resolve(object);
            },
        );
    });
}

function handleTextureUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if model exists before loading texture
    if ((type === 'X' && !customModelX) || (type === 'O' && !customModelO)) {
        showGameAlert('You can\'t load a texture until the model is loaded');
        event.target.value = '';
        return;
    }

    const loader = new THREE.TextureLoader();
    const material = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.5
    });

    return new Promise((resolve) => {
        loader.load(
            URL.createObjectURL(file),
            (texture) => {
                material.map = texture;
                material.needsUpdate = true;

                if (type === 'X' && customModelX) {
                    customModelX.traverse((child) => {
                        if (child.isMesh) {
                            child.material = material;
                        }
                    });
                } else if (type === 'O' && customModelO) {
                    customModelO.traverse((child) => {
                        if (child.isMesh) {
                            child.material = material;
                        }
                    });
                }
                resolve(material);
            },
        );
    });
}

function resetCustomModels() {
    customModelX = null;
    customModelO = null;
    modelOName = null;
    modelXName = null;

    // Clear file inputs
    const fileInputs = document.querySelectorAll('.model-upload-container input[type="file"]');
    fileInputs.forEach(input => {
        input.value = '';
    });
}

// Refuses to load models if the game has started
function disableFileInputs() {
    const gameInProgress = gameBoard.some(cell => cell !== null) && !winInfo;
    const inputs = document.querySelectorAll('.model-upload-container input[type="file"]');
    inputs.forEach(input => {
        input.disabled = gameInProgress;
    });
}

function showGameAlert(message, duration = 2000) {
    const alertBox = document.createElement('div');
    alertBox.className = 'game-alert';
    alertBox.textContent = message;

    document.body.appendChild(alertBox);

    setTimeout(() => {
        alertBox.remove();
    }, duration);
}

function calculatePosition(index) {
    const SPACING = 2.5 * (4 / gridSize);
    const x = (index % gridSize - Math.floor(gridSize/2)) * SPACING;
    const y = (Math.floor(index / (gridSize * gridSize)) - Math.floor(gridSize/2)) * SPACING;
    const z = (Math.floor((index % (gridSize * gridSize)) / gridSize) - Math.floor(gridSize/2)) * SPACING;
    return new THREE.Vector3(x, y, z);
}

function onDocumentMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onDocumentClick() {
    if (INTERSECTED !== null && !gameBoard[INTERSECTED] && !winInfo) {
        handleMove(INTERSECTED);
    }
}

function handleMove(index) {
    const mark = isXNext ? 'X' : 'O';
    gameBoard[index] = mark;

    cells[index].visible = false;

    const position = calculatePosition(index);
    const markMesh = createMark(mark, position);
    marks.push(markMesh);
    scene.add(markMesh);

    const result = calculateWinner(gameBoard);
    if (result) {
        winInfo = result;
        updateUI();
        if (result.positions) {
            const startPos = calculatePosition(result.positions[0]);
            const endPos = calculatePosition(result.positions[result.positions.length - 1]);
            const winLine = createWinLine(startPos, endPos);
            scene.add(winLine);

            // Add fireworks
            const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
            scene.add(createFirework(midPoint));

            // Add some delayed fireworks
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2
                    );
                    const fireWorkPos = midPoint.clone().add(offset);
                    scene.add(createFirework(fireWorkPos));
                }, i * 500);
            }
        }


        // Load and display the "WIN!" text
        const loader = new THREE.FontLoader();
        loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
            const textGeometry = new THREE.TextGeometry('WIN!', {
                font: font,
                size: 4,
                height: 0.5,
                bevelEnabled: true,
                bevelThickness: 0.1,
                bevelSize: 0.07,
            });

            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Set the position of the text
            textMesh.position.set(-5, 5, 0); // Change these values to position the text

            scene.add(textMesh);
            window.winTextMesh = textMesh; // Store reference to the text mesh

            let hue = 0;
            const colorChangeSpeed = 0.01;

            function animateTextColor() {
                requestAnimationFrame(animateTextColor);
                hue += colorChangeSpeed;
                if (hue > 1) hue = 0;
                textMaterial.color.setHSL(hue, 1, 0.5);
            }

            animateTextColor();
        });

    } else {
        isXNext = !isXNext;
        updateUI();
    }
    disableFileInputs();
}

function createMark(type, position) {
    let model;
    if (type === 'X' && customModelX) {
        model = customModelX.clone();
    } else if (type === 'O' && customModelO) {
        model = customModelO.clone();
    } else {
        model = type === 'X' ? modelX.clone() : modelO.clone();
    }
    model.position.copy(position);
    // Move y down for lemon and orange models only
    model.position.y -= 0.5;
    return model;
}


// function for creating x using primitives
function createX(position) {
    const group = new THREE.Group();

    const createCross = (rotation) => {
        const geometry = new THREE.BoxGeometry(1.4 * (3/gridSize), 0.2, 0.2);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        const cross = new THREE.Mesh(geometry, material);
        cross.rotation.z = rotation;
        cross.castShadow = true;
        return cross;
    };

    group.add(createCross(Math.PI / 4));
    group.add(createCross(-Math.PI / 4));
    group.position.copy(position);
    return group;
}

// function for creating o using primitives
function createO(position) {
    const geometry = new THREE.TorusGeometry(0.5 * (3/gridSize), 0.1, 16, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const torus = new THREE.Mesh(geometry, material);
    torus.position.copy(position);
    torus.castShadow = true;
    return torus;
}

function createWinLine(startPos, endPos) {
    // Create Line2 to change linewidth
    const positions = new Float32Array([
        startPos.x, startPos.y, startPos.z,
        endPos.x, endPos.y, endPos.z
    ]);
    const lineGeometry = new THREE.LineGeometry();
    lineGeometry.setPositions(positions);
    const lineMaterial = new THREE.LineMaterial({
        color: 0x00ff00,
        linewidth: 5,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const line = new THREE.Line2(lineGeometry, lineMaterial);

    const colorChangeSpeed = 0.01;
    let hue = 0;
    let time = 0;

    function animateLine() {
        requestAnimationFrame(animateLine);

        // Color change effect
        hue += colorChangeSpeed;
        if (hue > 1) hue = 0;
        lineMaterial.color.setHSL(hue, 1, 0.5);

        time += 0.05;
        lineMaterial.linewidth = 10.5 + Math.sin(time) * 9.5;
        lineMaterial.needsUpdate = true;
    }

    animateLine();
    return line;
}

function createFirework(position) {
    const group = new THREE.Group();
    const particles = [];
    const particleCount = 50; // Number

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
                transparent: true
            })
        );

        // Set a random direction of movement
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        );
        particle.userData.life = 1.0;

        particle.position.copy(position);
        particles.push(particle);
        group.add(particle);
    }

    function animateFirework() {
        let alive = false;
        particles.forEach(particle => {
            if (particle.userData.life > 0) {
                alive = true;
                // Particle movement
                particle.position.add(particle.userData.velocity);
                // Reduced particle lifetime and transparency
                particle.userData.life -= 0.02;
                particle.material.opacity = particle.userData.life;
                particle.userData.velocity.multiplyScalar(0.98);
            }
        });

        if (alive) {
            // calls this function before each frame
            requestAnimationFrame(animateFirework);
        } else {
            scene.remove(group);
        }
    }

    animateFirework();
    return group;
}


function createUI() {
    const gameInfo = document.createElement('div');
    gameInfo.className = 'game-info';
    document.body.appendChild(gameInfo);
    window.gameInfo = gameInfo;

    const controlsHelp = document.createElement('div');
    controlsHelp.className = 'controls-help';
    controlsHelp.innerHTML = `
        <div>Controls:</div>
        <div>• Left mouse button - rotate camera</div>
        <div>• Right mouse button - pan camera</div>
        <div>• Mouse wheel - zoom in/out</div>
    `;
    document.body.appendChild(controlsHelp);

    const lightSwitcherContainer = document.createElement('div');
    lightSwitcherContainer.className = 'light-switcher-container';
    document.body.appendChild(lightSwitcherContainer);

    const lightSwitcher = document.createElement('button');
    lightSwitcher.innerText = 'Toggle Lights';
    lightSwitcher.className = 'light-switcher-button';
    lightSwitcher.onclick = () => {
        cornerLightsEnabled = !cornerLightsEnabled;
        window.gameLights.cornerLights.forEach(light => {
            light.visible = cornerLightsEnabled;
        });
    };
    lightSwitcherContainer.appendChild(lightSwitcher);

    const lightColorContainer = document.createElement('div');
    lightColorContainer.className = 'light-color-container';
    document.body.appendChild(lightColorContainer);

    const redColorLabel = document.createElement('label');
    redColorLabel.innerText = 'Left Light Color: ';
    lightColorContainer.appendChild(redColorLabel);

    const redColorPicker = document.createElement('input');
    redColorPicker.type = 'color';
    redColorPicker.value = '#ff0000';
    redColorPicker.oninput = (event) => {
        coneLightColors.red = parseInt(event.target.value.replace('#', '0x'));
        updateConeLightColors();
    };
    lightColorContainer.appendChild(redColorPicker);

    const blueColorLabel = document.createElement('label');
    blueColorLabel.innerText = 'Right Light Color: ';
    lightColorContainer.appendChild(blueColorLabel);

    const blueColorPicker = document.createElement('input');
    blueColorPicker.type = 'color';
    blueColorPicker.value = '#0000ff';
    blueColorPicker.oninput = (event) => {
        coneLightColors.blue = parseInt(event.target.value.replace('#', '0x'));
        updateConeLightColors();
    };
    lightColorContainer.appendChild(blueColorPicker);

    // Add a container for size settings
    const sizeContainer = document.createElement('div');
    sizeContainer.className = 'size-controls';
    document.body.appendChild(sizeContainer);

    // Add a slider to set size
    const sizeLabel = document.createElement('label');
    sizeLabel.innerText = 'Grid Size: ';
    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.min = '2';
    sizeSlider.max = '5';
    sizeSlider.value = '3';
    sizeSlider.step = '1';

    const sizeValue = document.createElement('span');
    sizeValue.innerText = `${sizeSlider.value}x${sizeSlider.value}x${sizeSlider.value}`;

    // Apply size button
    const applyButton = document.createElement('button');
    applyButton.innerText = 'Apply Size';
    applyButton.className = 'apply-size-button';

    sizeSlider.oninput = () => {
        sizeValue.innerText = `${sizeSlider.value}x${sizeSlider.value}x${sizeSlider.value}`;
    };

    applyButton.onclick = () => {
        const newSize = parseInt(sizeSlider.value);
        if (newSize !== gridSize) {
            gridSize = newSize;
            resetGame(true);
        }
    };

    sizeContainer.appendChild(sizeLabel);
    sizeContainer.appendChild(sizeSlider);
    sizeContainer.appendChild(sizeValue);
    sizeContainer.appendChild(applyButton);

    // Add container for model upload controls
    const modelUploadContainer = document.createElement('div');
    modelUploadContainer.className = 'model-upload-container';
    document.body.appendChild(modelUploadContainer);

    // Title for model upload container
    const titleLabel = document.createElement('div');
    titleLabel.innerText = 'Custom Models (.obj) & Textures (.jpeg,.jpg,.png)';
    titleLabel.className = 'model-title';
    modelUploadContainer.appendChild(titleLabel);

    // X Model Group
    const xGroup = document.createElement('div');
    xGroup.className = 'model-group';

    const xLabel = document.createElement('div');
    xLabel.innerText = 'X Model & Texture:';
    xGroup.appendChild(xLabel);

    const xModelInput = document.createElement('input');
    xModelInput.type = 'file';
    xModelInput.accept = '.obj';
    xModelInput.className = 'input-file';
    xModelInput.onchange = (e) => handleModelUpload(e, 'X');
    xGroup.appendChild(xModelInput);

    const xTextureInput = document.createElement('input');
    xTextureInput.type = 'file';
    xTextureInput.accept = '.jpg,.jpeg,.png';
    xTextureInput.className = 'input-file';
    xTextureInput.onchange = (e) => handleTextureUpload(e, 'X');
    xGroup.appendChild(xTextureInput);

    modelUploadContainer.appendChild(xGroup);

    // O Model Group
    const oGroup = document.createElement('div');
    oGroup.className = 'model-group';

    const oLabel = document.createElement('div');
    oLabel.innerText = 'O Model & Texture:';
    oGroup.appendChild(oLabel);

    const oModelInput = document.createElement('input');
    oModelInput.type = 'file';
    oModelInput.accept = '.obj';
    oModelInput.className = 'input-file';
    oModelInput.onchange = (e) => handleModelUpload(e, 'O');
    oGroup.appendChild(oModelInput);

    const oTextureInput = document.createElement('input');
    oTextureInput.type = 'file';
    oTextureInput.accept = '.jpg,.jpeg,.png';
    oTextureInput.className = 'input-file';
    oTextureInput.onchange = (e) => handleTextureUpload(e, 'O');
    oGroup.appendChild(oTextureInput);

    modelUploadContainer.appendChild(oGroup);

    // Reset models button
    const resetButton = document.createElement('button');
    resetButton.innerText = 'Reset Models';
    resetButton.className = 'reset-button';
    resetButton.onclick = () => {
        // Check if game is in progress
        const gameInProgress = gameBoard.some(cell => cell !== null) && !winInfo;
        if (gameInProgress) {
            showGameAlert('Cannot reset models while game is in progress!');
            return;
        }
        resetCustomModels();
    };
    modelUploadContainer.appendChild(resetButton);



    // Add a container for the info button
    const infoButtonContainer = document.createElement('div');
    infoButtonContainer.className = 'info-button-container';
    document.body.appendChild(infoButtonContainer);

    // Add the info button
    const infoButton = document.createElement('button');
    infoButton.innerText = '?';
    infoButton.className = 'info-button';
    infoButton.onclick = () => {
        const infoWindow = document.createElement('div');
        infoWindow.className = 'info-window';
        infoWindow.innerHTML = `
            <div class="info-content">
                <h2>Developed by: Maksym Perenchuk & Andrei Dzemidovich</h2>
                <p>Subject: Introduction to computer graphics</p>
                <p>Academic year: 2024</p>
                <p>(KPI FEI TUKE)</p>
                <button class="close-button">Close</button>
            </div>
        `;
        document.body.appendChild(infoWindow);

        const closeButton = infoWindow.querySelector('.close-button');
        closeButton.onclick = () => {
            document.body.removeChild(infoWindow);
        };
    };
    infoButtonContainer.appendChild(infoButton);

    updateUI();
}

function updateUI() {
    if (winInfo) {
        window.gameInfo.innerHTML = `
            <div class="winner-info">
                ${winInfo.winner === 'draw' ? 'Draw!' : `Winner is: ${winInfo.winner}`}
                <button onclick="resetGame()">New Game</button>
            </div>
        `;
    } else {
        window.gameInfo.innerHTML = `
            <div class="turn-indicator">
                ${isXNext ? "X's" : "O's"} move
            </div>
        `;
    }
}

function resetGame(resizing = false) {
    if (resizing) {
        totalCells = gridSize * gridSize * gridSize;
    }

    gameBoard = Array(totalCells).fill(null);
    isXNext = true;
    winInfo = null;

    marks.forEach(mark => scene.remove(mark));
    marks = [];

    const winLine = scene.children.find(child => child instanceof THREE.Line);
    if (winLine) {
        scene.remove(winLine);
    }

    cells.forEach(cell => cell.visible = true);

    // Remove the "WIN!" text if it exists
    if (window.winTextMesh) {
        scene.remove(window.winTextMesh);
        window.winTextMesh = null;
    }

    if (resizing) {
        addObjects(); // Recreate the playing field
        // Update the camera position depending on the field size
        const distance = gridSize === 2 ? 16 : 5 + (gridSize - 2) * 3;
        camera.position.set(-distance, -distance, -distance);
        controls.minDistance = distance;
        controls.maxDistance = distance * 2;
    }

    updateUI();
    disableFileInputs();
}

function updateConeLightColors() {
    scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight) {
            if (child.position.x < 0) {
                child.color.setHex(coneLightColors.red);
            } else {
                child.color.setHex(coneLightColors.blue);
            }
        } else if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
            if (child.position.x < 0) {
                child.material.color.setHex(coneLightColors.red);
            } else {
                child.material.color.setHex(coneLightColors.blue);
            }
        }
    });
}

function calculateWinner(board) {
    const lines = generateWinningLines();

    for (let line of lines) {
        const firstValue = board[line[0]];
        if (!firstValue) continue;

        let isWinningLine = true;
        for (let i = 1; i < line.length; i++) {
            if (board[line[i]] !== firstValue) {
                isWinningLine = false;
                break;
            }
        }

        if (isWinningLine) {
            return {
                winner: firstValue,
                positions: line
            };
        }
    }

    if (board.every(cell => cell !== null)) {
        return { winner: 'draw' };
    }
    return null;
}

// Function for generating all possible winning lines
function generateWinningLines() {
    const lines = [];

    // Horizontal lines in each layer
    for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
            const line = [];
            for (let x = 0; x < gridSize; x++) {
                line.push(y * gridSize * gridSize + z * gridSize + x);
            }
            lines.push(line);
        }
    }

    // Vertical lines in each layer
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            const line = [];
            for (let y = 0; y < gridSize; y++) {
                line.push(y * gridSize * gridSize + z * gridSize + x);
            }
            lines.push(line);
        }
    }

    // Vertical lines through layers
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            const line = [];
            for (let z = 0; z < gridSize; z++) {
                line.push(y * gridSize * gridSize + z * gridSize + x);
            }
            lines.push(line);
        }
    }

    // Diagonals in each layer
    for (let x = 0; x < gridSize; x++) {
        const line1 = [], line2 = [];
        for (let i = 0; i < gridSize; i++) {
            line1.push(i * gridSize * gridSize + i * gridSize + x);
            line2.push(i * gridSize * gridSize + (gridSize - 1 - i) * gridSize + x);
        }
        lines.push(line1, line2);
    }

    // Diagonals through layers by rows
    for (let y = 0; y < gridSize; y++) {
        const line1 = [], line2 = [];
        for (let i = 0; i < gridSize; i++) {
            line1.push(y * gridSize * gridSize + i * gridSize + i);
            line2.push(y * gridSize * gridSize + i * gridSize + (gridSize - 1 - i));
        }
        lines.push(line1, line2);
    }

    // Diagonals through layers by columns
    for (let z = 0; z < gridSize; z++) {
        const line1 = [], line2 = [];
        for (let i = 0; i < gridSize; i++) {
            line1.push(i * gridSize * gridSize + z * gridSize + i);
            line2.push(i * gridSize * gridSize + z * gridSize + (gridSize - 1 - i));
        }
        lines.push(line1, line2);
    }

    // Main diagonals
    const mainDiag1 = [], mainDiag2 = [], mainDiag3 = [], mainDiag4 = [];
    for (let i = 0; i < gridSize; i++) {
        mainDiag1.push(i * gridSize * gridSize + i * gridSize + i);
        mainDiag2.push(i * gridSize * gridSize + i * gridSize + (gridSize - 1 - i));
        mainDiag3.push(i * gridSize * gridSize + (gridSize - 1 - i) * gridSize + i);
        mainDiag4.push(i * gridSize * gridSize + (gridSize - 1 - i) * gridSize + (gridSize - 1 - i));
    }
    lines.push(mainDiag1, mainDiag2, mainDiag3, mainDiag4);

    return lines;
}
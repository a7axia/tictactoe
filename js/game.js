let camera, scene, renderer, controls;
let gameBoard, cells = [], marks = [];
let raycaster, mouse = { x: 0, y: 0 };
let INTERSECTED = null;
let isXNext = true;
let winInfo = null;
const SPACING = 2.5;

init();
render();

function init() {

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-10, -10, -15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas1').appendChild(renderer.domElement);

    scene = new THREE.Scene();

    // Create a canvas for the gradient
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    // Create a vertical gradient
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#87ceeb'); // Light sky blue
    gradient.addColorStop(1, '#ffffff'); // White

    // Fill the canvas with the gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, 256);

    // Create a texture and set it as the background
    const bgTexture = new THREE.CanvasTexture(canvas);
    scene.background = bgTexture;

    gameBoard = Array(27).fill(null);

    setupLights();

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
    createUI();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.9);
    pointLight.position.set(-150, 300, -300);
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);


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
            cornerLights.forEach((light, index) => {
                const angle = ((time / 3000) + (index / colors.length)) * Math.PI * 2;
                const radius = 8;
                light.position.x = Math.cos(angle) * radius;
                light.position.z = Math.sin(angle) * radius;
            });
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

    const cellGeometry = new THREE.BoxGeometry(1, 1, 1);
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

    for (let i = 0; i < 27; i++) {
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

function calculatePosition(index) {
    const x = (index % 3 - 1) * SPACING;
    const y = (Math.floor(index / 9) - 1) * SPACING;
    const z = (Math.floor((index % 9) / 3) - 1) * SPACING;
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
            const endPos = calculatePosition(result.positions[2]);
            const winLine = createWinLine(startPos, endPos);
            scene.add(winLine);
        }
    } else {
        isXNext = !isXNext;
        updateUI();
    }
}

function createMark(type, position) {
    if (type === 'X') {
        const group = new THREE.Group();

        const createCross = (rotation) => {
            const geometry = new THREE.BoxGeometry(1.4, 0.2, 0.2);
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
    } else {
        const geometry = new THREE.TorusGeometry(0.5, 0.1, 16, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const torus = new THREE.Mesh(geometry, material);
        torus.position.copy(position);
        torus.castShadow = true;
        return torus;
    }
}

function createWinLine(startPos, endPos) {
    const points = [startPos, endPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
    return new THREE.Line(geometry, material);
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

function resetGame() {
    gameBoard = Array(27).fill(null);
    isXNext = true;
    winInfo = null;

    marks.forEach(mark => scene.remove(mark));
    marks = [];

    const winLine = scene.children.find(child => child instanceof THREE.Line);
    if (winLine) {
        scene.remove(winLine);
    }

    updateUI();
}

function calculateWinner(board) {
    const lines = [];

    // Horizontal lines in each layer
    for (let layer = 0; layer < 3; layer++) {
        for (let row = 0; row < 3; row++) {
            lines.push([
                layer * 9 + row * 3 + 0,
                layer * 9 + row * 3 + 1,
                layer * 9 + row * 3 + 2
            ]);
        }
    }

    // Vertical lines in each layer
    for (let layer = 0; layer < 3; layer++) {
        for (let col = 0; col < 3; col++) {
            lines.push([
                layer * 9 + 0 * 3 + col,
                layer * 9 + 1 * 3 + col,
                layer * 9 + 2 * 3 + col
            ]);
        }
    }

    // Diagonals in each layer
    for (let layer = 0; layer < 3; layer++) {
        lines.push([
            layer * 9 + 0 * 3 + 0,
            layer * 9 + 1 * 3 + 1,
            layer * 9 + 2 * 3 + 2
        ]);
        lines.push([
            layer * 9 + 0 * 3 + 2,
            layer * 9 + 1 * 3 + 1,
            layer * 9 + 2 * 3 + 0
        ]);
    }

    // Vertical lines through layers
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            lines.push([
                0 * 9 + row * 3 + col,
                1 * 9 + row * 3 + col,
                2 * 9 + row * 3 + col
            ]);
        }
    }

    // Diagonals through layers by rows
    for (let row = 0; row < 3; row++) {
        lines.push([
            0 * 9 + row * 3 + 0,
            1 * 9 + row * 3 + 1,
            2 * 9 + row * 3 + 2
        ]);
        lines.push([
            0 * 9 + row * 3 + 2,
            1 * 9 + row * 3 + 1,
            2 * 9 + row * 3 + 0
        ]);
    }

    // Diagonals through layers by columns
    for (let col = 0; col < 3; col++) {
        lines.push([
            0 * 9 + 0 * 3 + col,
            1 * 9 + 1 * 3 + col,
            2 * 9 + 2 * 3 + col
        ]);
        lines.push([
            0 * 9 + 2 * 3 + col,
            1 * 9 + 1 * 3 + col,
            2 * 9 + 0 * 3 + col
        ]);
    }

    // Spatial diagonals
    lines.push([0, 13, 26]);
    lines.push([2, 13, 24]);
    lines.push([6, 13, 20]);
    lines.push([8, 13, 18]);

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return {
                winner: board[a],
                positions: [a, b, c]
            };
        }
    }

    if (board.every(cell => cell !== null)) {
        return { winner: 'draw' };
    }

    return null;
}
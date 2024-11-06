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
    scene.background = new THREE.Color(0x87ceeb);

    gameBoard = Array(27).fill(null);

    setupLights();

    addObjects();

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    raycaster = new THREE.Raycaster();

    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('click', onDocumentClick, false);

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
    const lines = [
        // horizontal
        [0,1,2], [3,4,5], [6,7,8],
        [9,10,11], [12,13,14], [15,16,17],
        [18,19,20], [21,22,23], [24,25,26],

        // vertical
        [0,9,18], [1,10,19], [2,11,20],
        [3,12,21], [4,13,22], [5,14,23],
        [6,15,24], [7,16,25], [8,17,26],

        //depth
        [0,3,6], [9,12,15], [18,21,24],
        [1,4,7], [10,13,16], [19,22,25],
        [2,5,8], [11,14,17], [20,23,26],

        // diagonal
        [0,4,8], [18,22,26],
        [2,4,6], [20,22,24],
        [9,13,17], [11,13,15],
        [0,13,26], [2,13,24],
        [6,13,20], [8,13,18],
        [0,10,20], [6,16,26],
        [2,10,18], [8,16,24],
        [0,12,24], [2,14,26],
        [6,12,18], [8,14,20],
        [18,22,26], [0,4,8],
        [20,22,24], [2,4,6]
    ];

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
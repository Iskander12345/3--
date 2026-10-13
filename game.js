// ============ ИГРА CS 1.6 CLONE ============

let scene, camera, renderer;
let clock;
let gameState = 'menu'; // menu, playing, paused, gameover
let score = 0;
let wave = 1;
let health = 100;
let ammo = 30;
let maxAmmo = 30;
let reserveAmmo = 90;
let isReloading = false;

// Игрок
const player = {
    position: new THREE.Vector3(0, 1.7, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    speed: 0.1,
    sprintMultiplier: 1.8,
    onGround: true
};

// Клавиши
const keys = {};
const mouse = { x: 0, y: 0 };

// Враги и объекты
let enemies = [];
let bullets = [];
let obstacles = [];

// Raycaster для стрельбы
const raycaster = new THREE.Raycaster();

// ============ ИНИЦИАЛИЗАЦИЯ ============
function init() {
    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 80);
    
    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(player.position);
    
    // Рендерер
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('gameCanvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    clock = new THREE.Clock();
    
    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);
    
    // Создание карты
    createMap();
    
    // Оружие (viewmodel)
    createWeapon();
    
    // События
    setupEventListeners();
    
    // Запуск игрового цикла
    animate();
}

// ============ КАРТА ============
function createMap() {
    // Пол
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x556655,
        roughness: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Стены по периметру
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const wallHeight = 5;
    
    // Создаём стены, ящики и укрытия
    createObstacle(-40, wallHeight/2, 0, 1, wallHeight, 80, 0x777777);
    createObstacle(40, wallHeight/2, 0, 1, wallHeight, 80, 0x777777);
    createObstacle(0, wallHeight/2, -40, 80, wallHeight, 1, 0x777777);
    createObstacle(0, wallHeight/2, 40, 80, wallHeight, 1, 0x777777);
    
    // Ящики
    const boxPositions = [
        [10, 1, 10, 3, 2, 3],
        [-10, 1, -10, 3, 2, 3],
        [15, 1, -15, 2, 2, 2],
        [-15, 1, 15, 2, 2, 2],
        [5, 1, -20, 4, 2, 4],
        [-20, 1, 5, 4, 2, 4],
        [20, 1, 20, 3, 3, 3],
        [-25, 1.5, -25, 4, 3, 4],
        [0, 2, 25, 6, 4, 2],
        [25, 1, 0, 2, 2, 6],
        [-30, 2, 10, 5, 4, 5],
        [30, 1.5, -10, 3, 3, 3],
        [12, 1, 30, 4, 2, 4],
        [-12, 1, -30, 4, 2, 4]
    ];
    
    boxPositions.forEach(box => {
        createObstacle(box[0], box[1], box[2], box[3], box[4], box[5], 0x9b7653);
    });
    
    // Пара высоких стен для укрытий
    createObstacle(8, 2.5, -5, 1, 5, 15, 0x666666);
    createObstacle(-8, 2.5, 5, 1, 5, 15, 0x666666);
}

function createObstacle(x, y, z, w, h, d, color) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.8,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);
    return mesh;
}

// ============ ОРУЖИЕ (VIEWMODEL) ============
let weaponModel;
function createWeapon() {
    weaponModel = new THREE.Group();
    
    // Корпус оружия
    const bodyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.3);
    weaponModel.add(body);
    
    // Ствол
    const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.6);
    weaponModel.add(barrel);
    
    // Рукоять
    const gripGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.12, -0.15);
    weaponModel.add(grip);
    
    // Прицел
    const sightGeo = new THREE.BoxGeometry(0.02, 0.04, 0.02);
    const sightMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.07, -0.5);
    weaponModel.add(sight);
    
    // Позиция оружия в руках
    weaponModel.position.set(0.3, -0.25, -0.5);
    camera.add(weaponModel);
    scene.add(camera);
}

// ============ ВРАГИ ============
function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * 15;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    
    const enemyGroup = new THREE.Group();
    
    // Тело
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    enemyGroup.add(body);
    
    // Голова
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    head.castShadow = true;
    enemyGroup.add(head);
    
    // Ноги
    const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.3, 0);
    leftLeg.castShadow = true;
    enemyGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.2, 0.3, 0);
    rightLeg.castShadow = true;
    enemyGroup.add(rightLeg);
    
    // Оружие врага
    const gunGeo = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.4, 1, -0.3);
    enemyGroup.add(gun);
    
    enemyGroup.position.set(x, 0, z);
    scene.add(enemyGroup);
    
    const enemy = {
        mesh: enemyGroup,
        health: 30 + wave * 10,
        speed: 0.02 + wave * 0.005,
        lastShot: 0,
        shootInterval: Math.max(500, 2000 - wave * 100)
    };
    
    enemies.push(enemy);
}

// ============ СТРЕЛЬБА ============
function shoot() {
    if (gameState !== 'playing' || isReloading) return;
    if (ammo <= 0) {
        reload();
        return;
    }
    
    ammo--;
    updateHUD();
    
    // Анимация отдачи
    weaponModel.position.z = -0.4;
    setTimeout(() => {
        weaponModel.position.z = -0.5;
    }, 50);
    
    // Raycast из центра экрана
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Собираем все цели (враги + препятствия)
    const targets = [];
    enemies.forEach(e => {
        e.mesh.traverse(child => {
            if (child.isMesh) {
                child.userData.enemy = e;
                targets.push(child);
            }
        });
    });
    obstacles.forEach(o => targets.push(o));
    
    const intersects = raycaster.intersectObjects(targets, false);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.object.userData.enemy) {
            const enemy = hit.object.userData.enemy;
            enemy.health -= 25;
            createHitEffect(hit.point);
            
            if (enemy.health <= 0) {
                killEnemy(enemy);
            }
        } else {
            createHitEffect(hit.point);
        }
    }
    
    // Создаём визуальный эффект выстрела
    createMuzzleFlash();
}

function createMuzzleFlash() {
    const flash = new THREE.PointLight(0xffff00, 2, 5);
    flash.position.copy(camera.position);
    flash.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 50);
}

function createHitEffect(position) {
    const geo = new THREE.SphereGeometry(0.1, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const effect = new THREE.Mesh(geo, mat);
    effect.position.copy(position);
    scene.add(effect);
    
    setTimeout(() => scene.remove(effect), 200);
}

function killEnemy(enemy) {
    const idx = enemies.indexOf(enemy);
    if (idx > -1) {
        scene.remove(enemy.mesh);
        enemies.splice(idx, 1);
        score += 100;
        updateHUD();
    }
}

function reload() {
    if (isReloading || ammo === maxAmmo || reserveAmmo <= 0) return;
    isReloading = true;
    
    setTimeout(() => {
        const needed = maxAmmo - ammo;
        const available = Math.min(needed, reserveAmmo);
        ammo += available;
        reserveAmmo -= available;
        isReloading = false;
        updateHUD();
    }, 2000);
}

// ============ ОБНОВЛЕНИЕ HUD ============
function updateHUD() {
    document.getElementById('health').textContent = `❤️ ${Math.max(0, health)}`;
    document.getElementById('ammo').textContent = `🔫 ${ammo} / ${reserveAmmo}`;
    document.getElementById('score').textContent = `Счёт: ${score}`;
    document.getElementById('wave').textContent = `Волна: ${wave}`;
}

// ============ УПРАВЛЕНИЕ ============
function setupEventListeners() {
    // Клавиатура
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        if (e.code === 'KeyR') reload();
        
        if (e.code === 'Escape' && gameState === 'playing') {
            pauseGame();
        } else if (e.code === 'Escape' && gameState === 'paused') {
            resumeGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Мышь
    document.addEventListener('mousemove', (e) => {
        if (gameState !== 'playing') return;
        player.yaw -= e.movementX * 0.002;
        player.pitch -= e.movementY * 0.002;
        player.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.pitch));
    });
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameState === 'playing') {
            shoot();
        }
    });
    
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Кнопки
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('play-again-btn').addEventListener('click', restartGame);
    
    // Ресайз
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ============ ИГРОВЫЕ СОСТОЯНИЯ ============
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    
    resetGame();
    gameState = 'playing';
}

function pauseGame() {
    gameState = 'paused';
    document.getElementById('pause-screen').classList.remove('hidden');
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-screen').classList.add('hidden');
}

function restartGame() {
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    resetGame();
    gameState = 'playing';
}

function resetGame() {
    // Очистка врагов
    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];
    
    // Сброс параметров
    score = 0;
    wave = 1;
    health = 100;
    ammo = 30;
    reserveAmmo = 90;
    isReloading = false;
    
    player.position.set(0, 1.7, 0);
    player.yaw = 0;
    player.pitch = 0;
    player.velocity.set(0, 0, 0);
    
    // Спавн первой волны
    for (let i = 0; i < 3; i++) {
        spawnEnemy();
    }
    
    updateHUD();
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-wave').textContent = wave;
    
    saveHighScore(score);
    displayHighScores();
    
    document.getElementById('gameover-screen').classList.remove('hidden');
}

// ============ РЕКОРДЫ (LocalStorage) ============
function saveHighScore(scoreValue) {
    let scores = JSON.parse(localStorage.getItem('cs_scores') || '[]');
    scores.push({
        score: scoreValue,
        date: new Date().toLocaleDateString('ru-RU')
    });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem('cs_scores', JSON.stringify(scores));
}

function displayHighScores() {
    const list = document.getElementById('highscores');
    list.innerHTML = '';
    const scores = JSON.parse(localStorage.getItem('cs_scores') || '[]');
    
    if (scores.length === 0) {
        list.innerHTML = '<li>Пока нет рекордов</li>';
        return;
    }
    
    scores.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.score} очков (${s.date})`;
        list.appendChild(li);
    });
}

// ============ ДВИЖЕНИЕ ============
function updateMovement(delta) {
    if (gameState !== 'playing') return;
    
    const speed = keys['ShiftLeft'] || keys['ShiftRight'] 
        ? player.speed * player.sprintMultiplier 
        : player.speed;
    
    // Направление движения
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    
    const moveDir = new THREE.Vector3(0, 0, 0);
    
    if (keys['KeyW']) moveDir.add(forward);
    if (keys['KeyS']) moveDir.sub(forward);
    if (keys['KeyD']) moveDir.add(right);
    if (keys['KeyA']) moveDir.sub(right);
    
    if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(speed);
    }
    
    // Простое движение без физики столкновений с проверкой стен
    const newPos = player.position.clone();
    newPos.x += moveDir.x;
    newPos.z += moveDir.z;
    
    // Границы карты
    const limit = 39;
    newPos.x = Math.max(-limit, Math.min(limit, newPos.x));
    newPos.z = Math.max(-limit, Math.min(limit, newPos.z));
    
    // Проверка столкновений с препятствиями
    let collision = false;
    const playerRadius = 0.5;
    for (const obs of obstacles) {
        const box = new THREE.Box3().setFromObject(obs);
        if (
            newPos.x + playerRadius > box.min.x &&
            newPos.x - playerRadius < box.max.x &&
            newPos.z + playerRadius > box.min.z &&
            newPos.z - playerRadius < box.max.z &&
            player.position.y - 0.9 < box.max.y &&
            player.position.y + 0.1 > box.min.y
        ) {
            collision = true;
            break;
        }
    }
    
    if (!collision) {
        player.position.x = newPos.x;
        player.position.z = newPos.z;
    }
    
    // Обновление камеры
    camera.position.copy(player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
}

// ============ ОБНОВЛЕНИЕ ВРАГОВ ============
function updateEnemies(delta) {
    if (gameState !== 'playing') return;
    
    const now = performance.now();
    
    enemies.forEach(enemy => {
        const dir = new THREE.Vector3().subVectors(player.position, enemy.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        dir.normalize();
        
        // Движение к игроку, если далеко
        if (dist > 8) {
            enemy.mesh.position.x += dir.x * enemy.speed;
            enemy.mesh.position.z += dir.z * enemy.speed;
        }
        
        // Поворот к игроку
        enemy.mesh.lookAt(player.position.x, enemy.mesh.position.y, player.position.z);
        
        // Стрельба
        if (now - enemy.lastShot > enemy.shootInterval && dist < 30) {
            enemy.lastShot = now;
            
            // Шанс попадания зависит от дистанции
            const hitChance = Math.max(0.1, 1 - dist / 40);
            if (Math.random() < hitChance) {
                damagePlayer(10);
            }
        }
        
        // Проверка столкновений с препятствиями
        for (const obs of obstacles) {
            const box = new THREE.Box3().setFromObject(obs);
            const pos = enemy.mesh.position;
            if (
                pos.x + 0.4 > box.min.x &&
                pos.x - 0.4 < box.max.x &&
                pos.z + 0.4 > box.min.z &&
                pos.z - 0.4 < box.max.z
            ) {
                // Отталкивание
                const center = new THREE.Vector3();
                box.getCenter(center);
                const push = new THREE.Vector3().subVectors(pos, center);
                push.y = 0;
                push.normalize().multiplyScalar(0.05);
                pos.add(push);
            }
        }
    });
}

function damagePlayer(amount) {
    health -= amount;
    updateHUD();
    
    // Визуальный эффект урона
    const overlay = document.getElementById('damage-overlay');
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 150);
    
    if (health <= 0) {
        health = 0;
        updateHUD();
        gameOver();
    }
}

// ============ ВОЛНЫ ============
let enemiesKilledThisWave = 0;
function checkWave() {
    if (gameState !== 'playing') return;
    
    if (enemies.length === 0) {
        wave++;
        // Восстановление здоровья
        health = Math.min(100, health + 30);
        // Пополнение патронов
        reserveAmmo += 30;
        updateHUD();
        
        // Спавн новых врагов
        const count = 2 + wave;
        for (let i = 0; i < count; i++) {
            setTimeout(() => spawnEnemy(), i * 500);
        }
    }
}

// ============ ИГРОВОЙ ЦИКЛ ============
function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'playing') {
        updateMovement(1);
        updateEnemies(1);
        checkWave();
    }
    
    renderer.render(scene, camera);
}

// ============ СТАРТ ============
init();
displayHighScores();
import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container;
let camera, scene, renderer;
let reticle;
let controller;
let model = null;
let currentHeldToy = null; 
let boxSurfacePosition = new THREE.Vector3();

let toys = [];
let availableToys = [];
const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();

const toysUrls = [
    'https://kvit-dev.github.io/Lab2-AR/task4/hatsune_miku/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/rocket/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/freddy/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/bunny/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/shark/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/spiderman/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/unicorn/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/itadori/scene.gltf',
    'https://kvit-dev.github.io/Lab2-AR/task4/bonnie/scene.gltf'
];

init();

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    // Сцена
    scene = new THREE.Scene();
    // Камера
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    // Рендеринг
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    // Світло
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Додаємо сильне світло, щоб коробка і іграшки були добре освітлені
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Контролер додавання об'єкта на сцену
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Додаємо нашу мітку поверхні на сцену
    addReticleToScene();

    // Тепер для AR-режиму необхідно застосувати режим hit-test
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"]
    });
    document.body.appendChild(button);

    window.addEventListener("resize", onWindowResize, false);
    renderer.setAnimationLoop(render);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial();
    reticle = new THREE.Mesh(geometry, material);

    // Є прекрасна можливість автоматично визначати позицію і обертання мітки поверхні
    // через параметр 'matrixAutoUpdate', але це не весело, тому спробуємо це зробити самотужки
    // у функції render()
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Додає систему координат, щоб ви краще розуміли, де буде розміщений об'єкт
    // reticle.add(new THREE.AxesHelper(1));
}

// Функція для перемішування масиву 
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function onSelect() {
    // Стан 1: тримаємо іграшку - ставимо її на поверхню
    if (currentHeldToy) {
        currentHeldToy.position.setFromMatrixPosition(reticle.matrix);
        currentHeldToy.updateMatrixWorld(true);

        const toyBox = new THREE.Box3().setFromObject(currentHeldToy);
        currentHeldToy.position.y += (currentHeldToy.position.y - toyBox.min.y);

        toys.push(currentHeldToy);
        currentHeldToy = null;
        return;
    }

    // Стан 2: клац по коробці - витягуємо іграшку
    if (model) {
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const intersects = raycaster.intersectObject(model, true);

        if (intersects.length > 0) {
            if (availableToys.length > 0) {
                // Ще є іграшки, дістаємо наступну
                spawnNextToy();
            } else {
                // Іграшки скінчились, прибираємо коробку
                scene.remove(model);
                model = null;
                toys.forEach(t => scene.remove(t));
                toys = [];
            }
            return;
        }
    }
    // Стан 3: ставимо коробку, якщо її ще немає
    if (reticle.visible && !model && !currentHeldToy) {
        resetSession();
        createBox();
    }
}

function createBox() {
    loader.load('https://kvit-dev.github.io/Lab2-AR/task4/gift_box/scene.gltf', function (gltf) {
        model = gltf.scene;
        model.position.setFromMatrixPosition(reticle.matrix);
        model.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().extractRotation(reticle.matrix)
        );
        model.scale.set(13, 13, 13);

        scene.add(model);
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        model.position.y += (model.position.y - box.min.y);

        // Зберігаємо позицію верху коробки після вирівнювання
        boxSurfacePosition.copy(model.position);
        boxSurfacePosition.y += 0.15;

        model.rotateX(THREE.MathUtils.degToRad(15));
    });
}

function spawnNextToy() {
    const url = availableToys.pop(); // беремо з перемішаного списку

    loader.load(url, function (gltf) {
        const toy = gltf.scene;

        const box = new THREE.Box3().setFromObject(toy);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = 0.2 / Math.max(size.x, size.y, size.z);
        toy.scale.set(scale, scale, scale);

        toy.position.copy(boxSurfacePosition);

        scene.add(toy);
        currentHeldToy = toy;
    });
}

function resetSession() {
    // Видаляємо всі розставлені іграшки
    toys.forEach(t => scene.remove(t));
    toys = [];

    // Перемішуємо іграшки в рандомному порядку
    availableToys = shuffleArray(toysUrls);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Hit Testing у WebXR повертає лише координати (позицію) та орієнтацію точки перетину віртуального променя (Raycast) 
// із реальним світом. Але він не надає інформації про саму поверхню, з якою було перетинання (яка саме це поверхня;
// вертикальна чи горизонтальна і тд)
let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

// Мета даної функції отримати hitTestSource для відслідковування поверхонь у AR
// та створює referenceSpace, тобто як ми інтерпретуватимемо координати у WebXR
// параметр 'viewer' означає, що ми відстежуємо камеру мобільного пристрою
async function initializeHitTestSource() {
    const session = renderer.xr.getSession(); // XRSession
    
    // 'viewer' базується на пололежнні пристрою під час хіт-тесту
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    // Далі ми використовуємо 'local' referenceSpace, оскільки він забезпечує 
    // стабільність відносно оточення. Це фіксована координатна система, яка дозволяє стабільно
    // відмальовувати наші 3D-об'єкти, навіть якщо користувач рухається. 
    localSpace = await session.requestReferenceSpace("local");

    // Цей крок необхідний, щоб постійно не викликати пошук поверхонь
    hitTestSourceInitialized = true;
    
    // Завершуємо AR-сесію
    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

function render(timestamp, frame) {
    if (frame) {
        // 1. Створюємо hitTestSource для усіх наших кадрів
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        // 2. Отримуємо результати hitResults
        if (hitTestSourceInitialized) {
            // проте результати йдуть окремо для кожного кадру
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            // Ми можемо отримати багато поверхонь у результатах, але та поверхня, яка буде найближчою 
            // до камери буде під номер 1.
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];

                // Pose являє собою положення точки на поверхні
                const pose = hit.getPose(localSpace);

                reticle.visible = true;
                // Перетворюємо мітку поверхні відповідно до позиції хіт-тесту
                reticle.matrix.fromArray(pose.transform.matrix);
                reticle.updateMatrixWorld(true); // Важливо оновити світову матрицю після зміни локальної
                
                // Якщо ми тримаємо іграшку, оновлюємо її позицію відповідно до мітки поверхні
                if (currentHeldToy) {
                    currentHeldToy.position.setFromMatrixPosition(reticle.matrix);
                    currentHeldToy.quaternion.setFromRotationMatrix(
                    new THREE.Matrix4().extractRotation(reticle.matrix));
                    const wave = Math.sin(timestamp * 0.005) * 0.02;
                    currentHeldToy.position.y += 0.05 + wave;}
            } else {
                reticle.visible = false;
            }
        }
        renderer.render(scene, camera);
    }
}
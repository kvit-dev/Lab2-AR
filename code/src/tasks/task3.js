import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"

let container;
let camera, scene, renderer;
let reticle;
let controller;

init();
animate();

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
    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);
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
    renderer.domElement.style.display = "none";

    window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(
        -Math.PI / 2
    );
    // geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    const material = new THREE.MeshBasicMaterial();

    reticle = new THREE.Mesh(geometry, material);

    // Є прекрасна можливість автоматично визначати позицію і обертання мітки поверхні
    // через параметр 'matrixAutoUpdate', але це не весело, тому спробуємо це зробити самотужки
    // у функції render()
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

function onSelect() {        
    if (reticle.visible) {
        // Створюю групу, щоб об'єднати 6 променів сніжинки в один об'єкт
        const snowflakeGroup = new THREE.Group();
        
        // Опису контура одного променя 
        const shape = new THREE.Shape();
        // Права половина променя 
        shape.moveTo(0, 0);
        shape.lineTo(0.01, 0.01);
        shape.lineTo(0.01, 0.03);
        shape.lineTo(0.03, 0.05); //відгалуження 1
        shape.lineTo(0.03, 0.06);
        shape.lineTo(0.01, 0.05);
        shape.lineTo(0.01, 0.08);
        shape.lineTo(0.04, 0.11); //відгалуження 2
        shape.lineTo(0.04, 0.12);
        shape.lineTo(0.01, 0.10);
        shape.lineTo(0.01, 0.14);
        shape.lineTo(0, 0.16);   
        // Ліва половина (дзеркально)
        shape.lineTo(-0.01, 0.14);
        shape.lineTo(-0.01, 0.10);
        shape.lineTo(-0.04, 0.12);
        shape.lineTo(-0.04, 0.11);
        shape.lineTo(-0.01, 0.08);
        shape.lineTo(-0.01, 0.05);
        shape.lineTo(-0.03, 0.06);
        shape.lineTo(-0.03, 0.05);
        shape.lineTo(-0.01, 0.03);
        shape.lineTo(-0.01, 0.01);
        shape.lineTo(0, 0);

        // ExtrudeGeometry
        const extrudeSettings = {
            depth: 0.01,        
            bevelEnabled: true,
            bevelThickness: 0.005,
            bevelSize: 0.005,
            bevelSegments: 2
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        const colorWhite = new THREE.Color(0xffffff); 
        const colorBlue = new THREE.Color(0x2266d4); 

        // 0 - білий, 1 - синій, 0.5 - блакитний
        const factor = Math.random();

        // Новий колір, змішуючи білий та синій
        const finalColor = new THREE.Color().copy(colorWhite).lerp(colorBlue, factor);

        const material = new THREE.MeshPhysicalMaterial({
            color: finalColor,
            metalness: 0.0,       
            roughness: 0.05,     
            reflectivity: 1.0,    
            clearcoat: 1.0,       
            clearcoatRoughness: 0.1,
            transmission: 0.9,    
            thickness: 0.01,      
            ior: 1.31,           
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide 
        });

        // Створення 6 променів сніжинки
        for (let i = 0; i < 6; i++) {
            const beam = new THREE.Mesh(geometry, material);
            beam.rotation.z = (i * Math.PI) / 3; // Поворот на 60 градусів
            snowflakeGroup.add(beam);
        }

        // Встановлюємо позицію групи там, де reticle
        snowflakeGroup.position.setFromMatrixPosition(reticle.matrix);
        snowflakeGroup.quaternion.setFromRotationMatrix(reticle.matrix);
        
        snowflakeGroup.scale.set(0.5, 0.5, 0.5);
        
        // Мітка для анімації
        snowflakeGroup.userData.isAnimated = true;
    
        scene.add(snowflakeGroup); 
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
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
            } else {
                reticle.visible = false;
            }
        }
        
        scene.children.forEach(child => {
            if (child.userData.isAnimated) {
                child.rotation.y += 0.005;  // повільне обертання навколо осі Y
                child.rotation.z += 0.002;  // легке похитування
            }
        });
        renderer.render(scene, camera);
    }
}
import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer;
let loader;
let mainStage, guitar, bass, sample_pad, piano, singer, drums, crew, speaker;
let spotLight1, spotLight2;
let singerMixer;
let clock = new THREE.Timer();

init();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Не забуваємо про цей рядок коду.
    container.appendChild(renderer.domElement);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    //Сильне фонове світло, щоб нічого не було темним
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
    scene.add(ambientLight);

    //Прожектор 1: рожевий
    spotLight1 = new THREE.SpotLight(0xff00ff, 50);
    spotLight1.position.set(-5, 8, -5); 
    spotLight1.angle = 0.5;
    spotLight1.penumbra = 0.3;
    spotLight1.decay = 1; // Світло світить далі
    scene.add(spotLight1);

    //Прожектор 2: блакитний
    spotLight2 = new THREE.SpotLight(0x00ffff, 40); 
    spotLight2.position.set(5, 8, -5);
    spotLight2.angle = 0.5;
    spotLight2.penumbra = 0.3;
    spotLight2.decay = 1;
    scene.add(spotLight2);

    //Ціль для прожекторів - центр сцени
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, -1, -8);
    scene.add(lightTarget);
    spotLight1.target = lightTarget;
    spotLight2.target = lightTarget;

    loader = new GLTFLoader();

    // Створюємо завантажувач
    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/stage/scene.gltf', (gltf) => {
        mainStage = gltf.scene;
        mainStage.scale.set(0.9, 0.9, 0.9);
        mainStage.position.set(0, -3, -8); 
        scene.add(mainStage);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/guitar/scene.gltf', (gltf) => {
        guitar = gltf.scene;
        guitar.position.set(-1, -0.6, -4.5);
        guitar.scale.set(0.5, 0.5, 0.5);
        guitar.rotation.y = THREE.MathUtils.degToRad(45);
        scene.add(guitar);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/bass/scene.gltf', (gltf) => {
        bass = gltf.scene;
        bass.position.set(-1.6, -0.9, -4.95);
        bass.scale.set(0.6, 0.6, 0.6);
        bass.rotation.y = THREE.MathUtils.degToRad(40);
        scene.add(bass);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/sample_pad/scene.gltf', (gltf) => {
        sample_pad = gltf.scene;
        sample_pad.position.set(0.67, -1, -5.1);
        sample_pad.scale.set(0.7, 0.7, 0.7);
        sample_pad.rotation.y = THREE.MathUtils.degToRad(-45);
        scene.add(sample_pad);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/piano/scene.gltf', (gltf) => {
        piano = gltf.scene;
        piano.position.set(1, -1.4, -8);
        piano.scale.set(0.03, 0.03, 0.03);
        piano.rotation.y = THREE.MathUtils.degToRad(-30);
        scene.add(piano);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/singer/scene.gltf', (gltf) => {
        singer = gltf.scene;
        singer.position.set(-0.5, -1, -5.2);
        singer.scale.set(0.6, 0.6, 0.6);
        scene.add(singer);

        singerMixer = new THREE.AnimationMixer(singer);

        if (gltf.animations && gltf.animations.length > 0) {
            const action = singerMixer.clipAction(gltf.animations[0]);
            action.play();
        }
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/drums/scene.gltf', (gltf) => {
        drums = gltf.scene;
        drums.position.set(-0.3, -0.5, -7);
        drums.scale.set(0.5, 0.5, 0.5);
        scene.add(drums);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/crew_member/scene.gltf', (gltf) => {
        crew = gltf.scene;
        crew.position.set(1.2, -1.5, -9.5);
        crew.scale.set(0.9, 0.9, 0.9);
        crew.rotation.y = THREE.MathUtils.degToRad(-30);
        scene.add(crew);
    });

    loader.load('https://kvit-dev.github.io/Lab2-AR/task2/speaker/scene.gltf', (gltf) => {
        speaker = gltf.scene;
        speaker.position.set(3.75, -1.9, -8.7);
        speaker.scale.set(0.3, 0.3, 0.3);
        speaker.rotation.y = THREE.MathUtils.degToRad(-45);
        scene.add(speaker);
    });

    document.body.appendChild(ARButton.createButton(renderer));
    renderer.setAnimationLoop(render);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
    clock.update();
    const delta = clock.getDelta();
    if (singerMixer){
        singerMixer.update(delta);
    } 

    if (timestamp) {
        const time = timestamp * 0.0015; // Перетворюємо мілісекунди в секунди для більш плавної анімації

        if (spotLight1 && spotLight2) {
            // Рух позицією прожекторів
            spotLight1.position.x = Math.sin(time) * 6;
            spotLight2.position.x = Math.sin(time + Math.PI) * 6;
            
            // Зміна інтенсивності
            spotLight1.intensity = 100 + Math.sin(time * 4) * 20;
            spotLight2.intensity = 100 + Math.cos(time * 4) * 20;
            
        }
    }
    renderer.render(scene, camera);
}

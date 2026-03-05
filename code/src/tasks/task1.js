import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let camera, scene, renderer;
let boxMesh, sphereMesh, cylinderMesh;
let controls;

init();
animate();

function init() {
  const container = document.createElement('div');
    document.body.appendChild(container);

    // Сцена
    scene = new THREE.Scene();

    // Камера
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

    // Об'єкт рендерингу
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
            
    renderer.xr.enabled = true; // Життєво важливий рядок коду для вашого застосунку!
    container.appendChild(renderer.domElement);

    // Світло
    const directionalLight = new THREE.DirectionalLight(0xffffff, 4); 
    directionalLight.position.set(3, 3, 3);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 10); 
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
    scene.add(ambientLight);
    
    // 1. Створюємо об'єкт куба
    const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    // Матеріал для першого об'єкту 
    const chameleonMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x4444ff,           
        metalness: 0.9,           
        roughness: 0.4,            
        sheen: 1.0,                
        sheenColor: 0xff00ff,      
        sheenRoughness: 0.2,
        iridescence: 0.8,          
        iridescenceIOR: 1.2,
    });

    // Створюємо меш
    boxMesh = new THREE.Mesh(boxGeometry, chameleonMaterial);
    boxMesh.position.set(-0.4, 0, -1.5);
    scene.add(boxMesh);

    // 2. Створюємо ою'єкт SphereGeometry, матеріал MeshStandardMaterial (золото)
    const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 1.0,
        roughness: 0.2,
        clearcoat: 1.0,           
        clearcoatRoughness: 0.05  
    });

    sphereMesh = new THREE.Mesh(sphereGeometry, goldMaterial);
    sphereMesh.position.set(0, 0, -1.5);
    scene.add(sphereMesh);

    // 3. Створюємо об'єкт CylinderGeometry, матеріал MeshStandardMaterial (метал)
    const cylinderGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 32); 
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0xF4989C,
        metalness: 1.0,
        roughness: 0.3,
        
    });
    cylinderMesh = new THREE.Mesh(cylinderGeometry, metalMaterial);
    cylinderMesh.position.set(0.4, 0, -1.5);
    scene.add(cylinderMesh);

    // Позиція для камери
    camera.position.z = 3;

    // Контролери для 360 огляду на вебсторінці, але не під час AR-сеансу
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    document.body.appendChild(ARButton.createButton(renderer));

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
    controls.update();
}

function render() {
    rotateObjects();
    renderer.render(scene, camera);
}

function rotateObjects() {
    boxMesh.rotation.y -= 0.01;
    sphereMesh.rotation.x -= 0.01;
    cylinderMesh.rotation.x -= 0.01;

    const time = Date.now() * 0.0015;
    sphereMesh.position.y = Math.sin(time) * 0.1; //Сфера плаває вгору-вниз 
}

<template>
    <canvas ref="canvas" class="w-screen h-screen block"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const canvas = ref<HTMLCanvasElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let cube: THREE.Mesh;

let raf = 0;

function resize() {
    if (!canvas.value || !renderer) {
        return;
    }
    const width = canvas.value.clientWidth;
    const height = canvas.value.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

function fitCameraToObject(camera, object, controls) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let dist = (maxDim / 2) / Math.tan(fov / 2);
    dist *= 1.4; // add a little padding

    const dir = new THREE.Vector3(0, 0, 1);
    camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    camera.near = dist / 100;
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    controls?.target.copy(center);
    controls?.update();
}

onMounted(() => {
    if (!canvas.value) {
        return;
    }

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas.value });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; // Crucial for shadows to work
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaebd7);
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(2, 1.5, 3);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(4, 10, 3);
    dirLight.castShadow = true;

    // Make sure the shadow camera covers Kermit fully
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 30;

    // Optional: soften the edges of the shadow
    dirLight.shadow.radius = 4;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    // === Ground plane that actually receives the shadow ===
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.5 }); // shadow visible but surface hidden
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    window.addEventListener('resize', resize);
    resize();
    const loader = new GLTFLoader();
    let mixer;
    let frog = null;
    loader.load(
        './public/kermit_the_frog_dancing_4.glb',
        (gltf) => {
            const root = gltf.scene;
            root.traverse((obj) => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(root);
                gltf.animations.forEach((clip) => {
                    mixer!.clipAction(clip).play(); // play each clip
                });
            }
            scene.add(root);
            fitCameraToObject(camera, root, controls);
            frog = root;
        }
    )
    const clock = new THREE.Clock();
    function tick() {
        const dt = clock.getDelta();
        if (mixer) mixer.update(dt);
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
        frog.rotation.y += 0.005;
    }
    tick();
});
</script>

<style scoped>
:root,
html,
body {
    margin: 0;
    height: 100%;
}

canvas {
    width: 100%;
    height: 100%;
    display: block;
}
</style>
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneContext } from './types';

export function createScene(host: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f1ece3');

  const camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.1, 1000);
  camera.position.set(12, 12, 12);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.target.set(0, 1.8, 0);

  const ambient = new THREE.AmbientLight('#ffffff', 0.5);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.3);
  scene.add(hemi);

  const directional = new THREE.DirectionalLight('#ffffff', 1);
  directional.position.set(20, 40, 20);
  directional.castShadow = true;
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.camera.near = 0.1;
  directional.shadow.camera.far = 120;
  directional.shadow.camera.left = -40;
  directional.shadow.camera.right = 40;
  directional.shadow.camera.top = 40;
  directional.shadow.camera.bottom = -40;
  scene.add(directional);

  const worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const buildPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: '#e9dccf', roughness: 0.95, metalness: 0 }),
  );
  buildPlane.name = 'build-plane';
  buildPlane.rotation.x = -Math.PI / 2;
  buildPlane.receiveShadow = true;
  scene.add(buildPlane);

  const grid = new THREE.GridHelper(300, 300, '#8f8578', '#c8bbaa');
  grid.position.y = 0.001;
  scene.add(grid);

  const resize = (): void => {
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  };
  window.addEventListener('resize', resize);

  const tick = (): void => {
    orbitControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  return {
    scene,
    camera,
    renderer,
    orbitControls,
    worldRoot,
    buildPlane,
  };
}

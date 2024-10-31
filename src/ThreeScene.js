import React, { useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ThreeScene = () => {
  useEffect(() => {
    let camera, scene, renderer, controls;
    let sphere;
    const clock = new THREE.Clock();

    init();
    render();

    function init() {
      camera = new THREE.PerspectiveCamera(
        100,
        window.innerWidth / window.innerHeight,
        0.5,
        100
      );
      camera.position.set(-2, 3, 4);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      addBackground();
      controls = new OrbitControls(camera, renderer.domElement);
      update();
    }

    function render() {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
      camera.lookAt(scene.position);
      update();
    }

    function addBackground() {
      const geometrySphere = new THREE.SphereGeometry(40, 100, 100);
      const sphereTexture = new THREE.TextureLoader().load('/models/texture/tuke.jpg');
      const materialSphere = new THREE.MeshBasicMaterial({
        map: sphereTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      sphere = new THREE.Mesh(geometrySphere, materialSphere);
      sphere.position.set(0, 0, 0);
      scene.add(sphere);
    }

    function update() {
      const delta = clock.getDelta();
      controls.update();
    }

    return () => {
      // Clean up on component unmount
      document.body.removeChild(renderer.domElement);
    };
  }, []);

  return null;
};

export default ThreeScene;
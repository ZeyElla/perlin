import * as THREE from './threejs/build/three.module.js';

/*DEPENDENCIES: THREE JS, NOISE.JS

Copyright 2020 Julian Karrer

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//CONFIG
const PARTICLE_COUNT = 10000;
const SCALE = 2.0;
const SPEED = 0.005;
const AMPLITUDE = 0.05;
	//RANDOMNESS
const PERTURBATION = 1e-3;
const SIMPLEX_OFFSET_Y = 360*420.69*Math.random();	
const SIMPLEX_OFFSET_Z = 1337*42*Math.random();
	//DIMENSIONS
const bounds = 1.;
const pointSize = 2.5;
const rotationspeed = 2*Math.PI/60/30;



let middle = bounds/2;
let cameraDistance = bounds*1.8;

//RENDERER
let canvas = createCanvas("sceneCanvas");
let renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight);


//CAMERA
let camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight,0.1,3000);
camera.position.set(middle+cameraDistance,middle+cameraDistance,middle+cameraDistance);
camera.lookAt(middle,middle,middle)
camera.updateProjectionMatrix();

let scene = new THREE.Scene();

//LIGHTING
let ambientlight = new THREE.AmbientLight(0xffffff,1.0);
scene.add(ambientlight);



//PARTICLE SYSTEM - GEOMETRY
const geometry = new THREE.BufferGeometry();
let initPos = new Float32Array(PARTICLE_COUNT*3);

//populate arrays with initial values to be turned into attribute buffers
for (var i = PARTICLE_COUNT - 1; i >= 0; i--) {
	//initPos x y z
	initPos[i*3+0] = Math.random()*bounds;
	initPos[i*3+1] = Math.random()*bounds;
	initPos[i*3+2] = Math.random()*bounds;
}

//set attributes
geometry.setAttribute("position", new THREE.BufferAttribute(initPos,3));

//frustum culling check disabled
geometry.frustumCulled = false;

//PARTICLE SYSTEM - MATERIAL
const vertShader = `
precision mediump float;
varying vec2 vUv;
uniform float psize;
uniform float cameradist;

void main() {
	vUv = uv;

	//point size attenuation along z to create depth
	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = psize * (cameradist / - mvPosition.z);
	gl_Position = projectionMatrix * mvPosition;
}
`;
const fragShader = `
void main() {
	if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
	gl_FragColor = vec4(1.);
}
`;
let material = new THREE.ShaderMaterial( {
	vertexShader: vertShader,
	fragmentShader: fragShader,
	uniforms: {
		psize: {value: pointSize},
		cameradist: {value: cameraDistance},
	},
});


//PARTICLE SYSTEM - MESH
let points = new THREE.Points(geometry, material);
points.position.set(-middle,-middle,-middle);

let pivot = new THREE.Object3D();
pivot.add(points);
pivot.position.set(middle,middle,middle);

scene.add(pivot);


//PARTICLE SYSTEM - UPDATE FUNCTION
let positions = points.geometry.attributes.position.array;
//time
let incrementor = 0; 
const getTime = () => (incrementor*SPEED);
//get values from simplex space
const noiseval = (i, offset = 0) => {
	return -1+2*(noise.simplex3(
		positions[i*3+0] * SCALE + getTime() +offset, 
		positions[i*3+1] * SCALE + getTime() +offset, 
		positions[i*3+2] * SCALE + getTime() +offset, 
	));
};

function update(){
	for (var i = PARTICLE_COUNT - 1; i >= 0; i--) {

		//update positions based on noise
		positions[i*3+0] += AMPLITUDE * noiseval(i);
		positions[i*3+1] += AMPLITUDE * noiseval(i,SIMPLEX_OFFSET_Y);
		positions[i*3+2] += AMPLITUDE * noiseval(i,SIMPLEX_OFFSET_Z);

		//perturb the resultant positions to prevent convergance
		positions[i*3+0] += (Math.random()*2-1)*PERTURBATION;
		positions[i*3+1] += (Math.random()*2-1)*PERTURBATION;
		positions[i*3+2] += (Math.random()*2-1)*PERTURBATION;

		//wrap around at the edges of the cube
		if (positions[i*3+0] <0) {positions[i*3+0]+=bounds;};
		if (positions[i*3+1] <0) {positions[i*3+1]+=bounds;};
		if (positions[i*3+2] <0) {positions[i*3+2]+=bounds;};
		positions[i*3+0] %= bounds;
		positions[i*3+1] %= bounds;
		positions[i*3+2] %= bounds;

	}
	points.geometry.attributes.position.needsUpdate = true;
	incrementor ++;
}

//BOUNDING BOX
/*
let boxGeometry = new THREE.BoxBufferGeometry(bounds, bounds, bounds);
let edges = new THREE.EdgesGeometry(boxGeometry);
let lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));
pivot.add(lines);
*/




//MAIN LOOP
function loop(){
	update();
	pivot.rotation.y += rotationspeed;
	renderer.render(scene, camera);
	requestAnimationFrame(loop);
}
loop();



//	UTILITY FUNCTIONS

function createCanvas(id){
	let cnv = document.createElement('canvas');
	cnv.width = 128;
	cnv.height = 128;
	cnv.id = id;
	cnv.style.position = "absolute";
	document.body.appendChild(cnv);
	return cnv;
}
//handle resizes
onWindowResize();
window.addEventListener('resize', onWindowResize, false);
function onWindowResize(){
	sizeCanvas(canvas);
	renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	camera.aspect = canvas.clientWidth / canvas.clientHeight;
	cameraDistance = window.innerWidth<500? bounds*3: bounds*1.8;
	camera.position.set(middle+cameraDistance,middle+cameraDistance,middle+cameraDistance);
	camera.updateProjectionMatrix();
}
function sizeCanvas(cnv){
	cnv.style.height = "100vh";
	cnv.style.width = "100vw";
	cnv.width = window.innerWidth;
	cnv.height = window.innerHeight;
}
"use strict";

// classes
import Shader from '../_classes/Shader.js';
import Renderer from '../_classes/Renderer.js';
//import Camera from '../_classes/Camera.js';
import OrbitCamera from '../_classes/OrbitCamera.js';
import Model from '../_classes/Model.js';
import Texture from '../_classes/Texture.js';
import Material from '../_classes/Material.js';
//import {DirectionalLight} from '../_classes/BasicLight.js';
import {DirectionalLight} from '../_classes/ShadowLight.js';

import dirDepthmapVertexShader from '../_shaders/dirDepthmapVertex.js';
import dirDepthmapFragmentShader from '../_shaders/dirDepthmapFragment.js';

import dirShadowVertexShader from '../_shaders/dirShadowPCFVertex.js';
import dirShadowFragmentShader from '../_shaders/dirShadowPCFFragment.js';

const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

async function main() {
    var canvas = document.querySelector("#c");
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    let ground = new Model();
    ground.LoadModel(gl, '../../resources/models/plane/SubdividedPlane_100.obj');

    let cube = new Model();
    cube.LoadModel(gl, '../../resources/models/cube/cube.obj');

    let teapot = new Model();
    teapot.LoadModel(gl, '../../resources/models/teapot/teapot.obj');

    //--Texture loading
    let checkerTexture = new Texture(gl);
    checkerTexture.LoadeTextureFromImage(gl,'../../resources/uv-grid.png');

    let internetTexture = new Texture(gl);
    internetTexture.LoadeTextureFromImage(gl, 'https://c1.staticflickr.com/9/8873/18598400202_3af67ef38f_q.jpg')

    let mainLight = new DirectionalLight(gl, 512, 512,            // depth map data
                                        [1.0, 1.0, 1.0], 0.1,     // ambient
                                        [2.0, -1.0, -2.0], 1.0);  // diffuse

    let shineMat = new Material(5.0, 32.0);
    let dullMat = new Material(0.5, 3.0);

    let eye = [0.0, 0.0, 5.0];
    let at = [0.0, 0.0, 0.0];
    let up = [0.0, 1.0, 0.0];
    let yaw = -90.0;
    let pitch = -45.0;
    let distance = 5.0;
    let turnspeed = 10.0;
    let mainCamera = new OrbitCamera(eye, at, up, yaw, pitch, distance, turnspeed);

    let fovRadian = 60.0 * Math.PI / 180;
    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    let proj = mat4.create();
    mat4.perspective(proj, fovRadian, aspect, 0.1, 100.0);

    let depthMapShader = new Shader(gl, dirDepthmapVertexShader, dirDepthmapFragmentShader);
    let shadowShader = new Shader(gl, dirShadowVertexShader, dirShadowFragmentShader);
    
    let renderer = new Renderer();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    webglLessonsUI.setupSlider("#camera-yaw", {slide: updateCameraYaw, min: -180, max: 180, step: 0.1});
    webglLessonsUI.setupSlider("#camera-pitch", {slide: updateCameraPitch, min: -90, max: 90, step: 0.1});
    webglLessonsUI.setupSlider("#camera-distance", {slide: updateCameraDistance, min: 0, max: 100, step: 0.1});
    
    webglLessonsUI.setupSlider("#Light-X-direction", {slide: updateLightXDir, min: -10, max: 10, step: 0.1});
    webglLessonsUI.setupSlider("#Light-Y-direction", {slide: updateLightYDir, min: -10, max: 10, step: 0.1});
    webglLessonsUI.setupSlider("#Light-Z-direction", {slide: updateLightZDir, min: -10, max: 10, step: 0.1});
    webglLessonsUI.setupSlider("#Light-Far-plane", {slide: updateLightFarPlane, min: 0.1, max: 100, step: 0.1});
    
    webglLessonsUI.setupSlider("#Teapot-Y-Rotation", {slide: updateTeapotYRotation, min: -180, max: 180, step: 0.1});
    webglLessonsUI.setupSlider("#Ground-Y-Position", {slide: updateGroundYPosition, min: -10, max: 5, step: 0.1});

    //let rotationAngle = 0;
    let teapotYRotation = 0;
    let groundYPosition = 0;

    requestAnimationFrame(drawFrame);

    function drawScene(shader) 
    {
        // teapot 1
        let modelMat = mat4.create();
        mat4.scale(modelMat, modelMat, [0.05, 0.05, 0.05]);
        mat4.translate(modelMat, modelMat, [20.0, 10.0, 0.0]);
        mat4.rotateY(modelMat, modelMat, teapotYRotation * Math.PI / 180.0);
        shader.SetUniformMat4f(gl, "u_model", modelMat);

        checkerTexture.Bind(gl, 0);
        shader.SetUniform1i(gl, "u_mainTexture", 0);
        shineMat.UseMaterial(gl, shader);

        teapot.RenderModel(gl, shader);

        // teapot 2
        modelMat = mat4.create();
        mat4.scale(modelMat, modelMat, [0.05, 0.05, 0.05]);
        mat4.translate(modelMat, modelMat, [-20.0, 10.0, 0.0]);
        mat4.rotateY(modelMat, modelMat, teapotYRotation * Math.PI / 180.0);
        shader.SetUniformMat4f(gl, "u_model", modelMat);

        dullMat.UseMaterial(gl, shader);

        teapot.RenderModel(gl, shader);

        // ground
        modelMat = mat4.create();
        mat4.translate(modelMat, modelMat, [0, groundYPosition, 0]);
        mat4.scale(modelMat, modelMat, [0.1, 0.1, 0.1]);

        shader.SetUniformMat4f(gl, "u_model", modelMat);

        internetTexture.Bind(gl, 0);
        shader.SetUniform1i(gl, "u_mainTexture", 0);
        dullMat.UseMaterial(gl, shader);

        ground.RenderModel(gl, shader);
    }

    function drawFrame()
    {
        // 1st pass
        {
            mainLight.depthMap.Bind(gl);
            gl.viewport(0, 0, mainLight.depthMapWidth, mainLight.depthMapHeight);

            renderer.Clear(gl);

            depthMapShader.Bind(gl);
            mainLight.UseLightForShadow(gl, depthMapShader);

            drawScene(depthMapShader);

            mainLight.depthMap.Unbind(gl);
            depthMapShader.Unbind(gl);
        }
        // 2nd pass
        {
            webglUtils.resizeCanvasToDisplaySize(gl.canvas);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            renderer.Clear(gl);

            shadowShader.Bind(gl);
            mainLight.depthMap.Read(gl, 1);
            shadowShader.SetUniform1i(gl, "u_depthMap", 1);

            var view = mainCamera.CalculateViewMatrix();
            shadowShader.SetUniformMat4f(gl, "u_view", view);
            shadowShader.SetUniformMat4f(gl, "u_projection", proj);

            var eyePos = mainCamera.eye;
            shadowShader.SetUniform3f(gl, "u_eyePosition", eyePos[0], eyePos[1], eyePos[2]);

            mainLight.UseLight(gl, shadowShader);

            drawScene(shadowShader);

            shadowShader.Unbind(gl);
        }

        requestAnimationFrame(drawFrame);
    }

    function updateCameraYaw(event, ui)
    {
      mainCamera.yaw = ui.value;
      mainCamera.Update();
    }
    function updateCameraPitch(event, ui)
    {
      mainCamera.pitch = ui.value;
      mainCamera.Update();
    }
    function updateCameraDistance(event, ui)
    {
      mainCamera.distance = ui.value;
      mainCamera.Update();
    }
  
    function updateLightXDir(event, ui)
    {
      mainLight.SetLightXDir(ui.value);
    }
    function updateLightYDir(event, ui)
    {
      mainLight.SetLightYDir(ui.value);
    }
    function updateLightZDir(event, ui)
    {
      mainLight.SetLightZDir(ui.value);
    }
    function updateLightFarPlane(event, ui)
    {
      mainLight.SetFarPlane(ui.value);
    }
  
    function updateTeapotYRotation(event, ui)
    {
      teapotYRotation = ui.value;
    }
    function updateGroundYPosition(event, ui)
    {
      groundYPosition = ui.value;
    }
}

main();
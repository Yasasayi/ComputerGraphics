"use strict";

//Classes
import Shader  from '../_classes/Shader.js';
import Renderer from '../_classes/Renderer.js';
import OrbitCamera from '../_classes/OrbitCamera.js';
import Model from '../_classes/Model.js';
import Texture from '../_classes/Texture.js';
import Material from '../_classes/Material.js';
import {DirectionalLight} from '../_classes/ShadowLight.js';
import ModelTangent from './ModelWithTangent.js'; // (Assign3) Tangent 및 Bitangent 계산 모델


//Shaders
//깊이맵 생성 셰이더
import dirDepthmapVertexShader from '../_shaders/dirDepthmapVertex.js';
import dirDepthmapFragmentShader from '../_shaders/dirDepthmapFragment.js';
// (Assign3) 조명 + 그림자 + 노멀 맵핑 셰이더
import normalMappingVertexShader from './normalMappingVertex.js'
import normalMappingFragmentShader from './normalMappingFragment.js'

const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

async function main() {
  // Get A WebGL context
  let canvas = document.querySelector("#c");
  let gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }
  
  //---Model Loading
  // (Assign3) Ground Model Loading
  let ground = new ModelTangent();
  ground.LoadModelWithTangentCalculation(gl, '../../resources/models/plane/SubdividedPlane_100.obj')

  let teapot = new Model();
  teapot.LoadModel(gl, '../../resources/models/teapot/teapot.obj')

  //--Texture Loading
  let checkerTexture = new Texture(gl);
  checkerTexture.LoadeTextureFromImage(gl,'../../resources/uv-grid.png');

  let internetTexture = new Texture(gl);
  internetTexture.LoadeTextureFromImage(gl, 'https://c1.staticflickr.com/9/8873/18598400202_3af67ef38f_q.jpg')

  // (Assign3) Load color and normal texture for ground
  let groundTexture = new Texture(gl);
  groundTexture.LoadeTextureFromImage(gl,'./diffuse.png')
  let groundNormalTexture = new Texture(gl);
  groundNormalTexture.LoadeTextureFromImage(gl,'./normal.png')
    
  //--Light Define
  let mainLight = new DirectionalLight(gl, 512, 512, //<--Depth map data
                                      [1.0,1.0,1.0], 0.1, //<--Ambient Data
                                      [2.0, -1.0, -2.0], 1.0); //<--light direction, diffuse intensity

  //--Material Define
  let shineMat = new Material(5.0, 32.0); // 반사도가 높은 머티리얼
  let dullMat = new Material(0.5, 3.0); // 반사도가 낮은 머티리얼

  //---Camera(view) Initialize
  let eye = [0.0, 0.0, 5.0];
  let at = [0.0, 0.0, 0.0];
  let up = [0.0, 1.0, 0.0];
  let yaw = -90.0;
  let pitch = -45.0;
  let distance = 5.0;
  let turnspeed = 10.0;
  let mainCamera = new OrbitCamera(eye,at,up,yaw,pitch,distance,turnspeed);
  
  //---Projection Initialize
  let fovRadian = 60.0 * Math.PI / 180;
  let aspect = gl.canvas.clientWidth/gl.canvas.clientHeight;
  let proj = mat4.create();
  mat4.perspective(proj, fovRadian, aspect, 0.1, 100.0);

  //---Shader Initialize
  // Depth map을 생성하는 shader (1st pass)
  let depthMapShader = new Shader(gl,dirDepthmapVertexShader,dirDepthmapFragmentShader);
  // (Assign3) 그림자와 normal mapping을 적용하여 그리는 shader
  let normalMapShader = new Shader(gl,normalMappingVertexShader,normalMappingFragmentShader);
  
  //---Renderer Initialize
  let renderer = new Renderer();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  //---Options
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //--------------------UI Setting---------------------//
  webglLessonsUI.setupSlider("#camera-yaw", {slide: updateCameraYaw, min: -180, max: 180, step: 0.1});
  webglLessonsUI.setupSlider("#camera-pitch", {slide: updateCameraPitch, min: -90, max: 90, step: 0.1});
  webglLessonsUI.setupSlider("#camera-distance", {slide: updateCameraDistance, min: 0, max: 50, step: 0.01});
  
  webglLessonsUI.setupSlider("#Light-X-direction", {slide: updateLightXDir, min: -10, max: 10, step: 0.1});
  webglLessonsUI.setupSlider("#Light-Y-direction", {slide: updateLightYDir, min: -10, max: 10, step: 0.1});
  webglLessonsUI.setupSlider("#Light-Z-direction", {slide: updateLightZDir, min: -10, max: 10, step: 0.1});
  webglLessonsUI.setupSlider("#Light-Far-plane", {slide: updateLightFarPlane, min: 0.1, max: 100, step: 0.1});
  
  webglLessonsUI.setupSlider("#Teapot-Y-Rotation", {slide: updateTeapotYRotation, min: -180, max: 180, step: 0.1});
  webglLessonsUI.setupSlider("#Ground-Y-Position", {slide: updateGroundYPosition, min: -10, max: 5, step: 0.1});

  // (Assign3) normal의 방향각 조정을 위한 intensity 파라메터 조정 ui
  webglLessonsUI.setupSlider("#Ground-Normal-Intensity", {slide: updateGroundNormalIntensity, min: 0, max: 5, step: 0.1});
  
  let teapotYRoatation = 0;
  let groundYPosition = 0;
  let groundNormalMappingIntensity = 0;
  //---------------------------------------------------//

  requestAnimationFrame(drawFrame);

  function drawScene(shader)
  {
    // 주전자 1 그리기
    let modelMat = mat4.create();
    mat4.scale(modelMat, modelMat, [0.05, 0.05, 0.05]);
    mat4.translate(modelMat, modelMat, [20.0, 10.0, 0.0]);
    mat4.rotateY(modelMat, modelMat, teapotYRoatation * Math.PI / 180.0);
    shader.SetUniformMat4f(gl, "u_model", modelMat);

    checkerTexture.Bind(gl,0);
    shader.SetUniform1i(gl, "u_mainTexture", 0);
    shineMat.UseMaterial(gl, shader);

    teapot.RenderModel(gl, shader);

    // 주전자 2 그리기
    modelMat = mat4.create();
    mat4.scale(modelMat, modelMat, [0.05, 0.05, 0.05]);
    mat4.translate(modelMat, modelMat, [-20.0, 10.0, 0.0]);
    mat4.rotateY(modelMat, modelMat, teapotYRoatation * Math.PI / 180.0);
    shader.SetUniformMat4f(gl, "u_model", modelMat);

    dullMat.UseMaterial(gl, shader);

    teapot.RenderModel(gl, shader);

    // (Assign3) TODO: 수직 벽면 그리기
    modelMat = mat4.create();
    mat4.scale(modelMat, modelMat, [0.05, 0.05, 0.05]);
    mat4.translate(modelMat, modelMat, [0.0, 100.0, -100.0]);
    mat4.rotateX(modelMat, modelMat, 90.0 * Math.PI / 180.0);
    mat4.rotateY(modelMat, modelMat, 180.0 * Math.PI / 180.0);
    shader.SetUniformMat4f(gl, "u_model", modelMat);

    internetTexture.Bind(gl, 0);
    shader.SetUniform1i(gl, "u_mainTexture", 0);

    dullMat.UseMaterial(gl, shader);

    ground.RenderModel(gl, shader);

    // (Assign3) TODO: 바닥면 그리기
    modelMat = mat4.create();
    mat4.translate(modelMat, modelMat, [0, groundYPosition, 0]);
    mat4.scale(modelMat, modelMat, [0.1, 0.1, 0.1]);
    shader.SetUniformMat4f(gl, "u_model", modelMat);
    
    groundTexture.Bind(gl, 0);
    shader.SetUniform1i(gl, "u_mainTexture", 0);
    groundNormalTexture.Bind(gl, 2);
    shader.SetUniform1i(gl, "u_normalMap", 2)
    shader.SetUniform1f(gl, "u_normalMappingIntensity", groundNormalMappingIntensity);
    shader.SetUniform1f(gl, "u_normalMapFlag", true);

    dullMat.UseMaterial(gl, shader);

    ground.RenderModel(gl, shader);

    shader.SetUniform1f(gl, "u_normalMapFlag", false); // flag 초기화
  }

  function drawFrame()
  {
    // --- 1st pass--- //
    {
      mainLight.depthMap.Bind(gl); 
      gl.viewport(0, 0, mainLight.depthMapWidth, mainLight.depthMapHeight); 
      
      renderer.Clear(gl);
      
      depthMapShader.Bind(gl); //depth map 생성 shader
      mainLight.UseLightForShadow(gl, depthMapShader); //View Projection 설정

      drawScene(depthMapShader); // 각 모델의 Model 설정 후 Depth map에 그리기
      
      mainLight.depthMap.Unbind(gl); //(주의!) depth map을 위한 FBO를 unbind하지 않으면 2nd pass에서 화면에 표시되는 프레임 버퍼가 그려지지 않음!
      depthMapShader.Unbind(gl);
    }

    // --- 2nd pass--- //
    {
      //화면 크기 재조정
  	  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      renderer.Clear(gl);

      normalMapShader.Bind(gl); //장면 그리기 shader
      mainLight.depthMap.Read(gl,1); //1번 슬롯에 depth map을 바인딩합니다.
      normalMapShader.SetUniform1i(gl, "u_depthMap", 1);

      var view = mainCamera.CalculateViewMatrix();
      normalMapShader.SetUniformMat4f(gl, "u_view", view);
	    normalMapShader.SetUniformMat4f(gl, "u_projection", proj);

      var eyePos = mainCamera.eye;
	    normalMapShader.SetUniform3f(gl,"u_eyePosition", eyePos[0], eyePos[1],eyePos[2]);

      mainLight.UseLight(gl, normalMapShader);

      drawScene(normalMapShader);
    }
   
    requestAnimationFrame(drawFrame);
  }

  //slider의 값이 변할 때마다 호출되는 함수
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
    teapotYRoatation = ui.value;
  }
  function updateGroundYPosition(event, ui)
  {
    groundYPosition = ui.value;
  }

  function updateGroundNormalIntensity(event, ui)
  {
    groundNormalMappingIntensity = ui.value;
  }

}

main();
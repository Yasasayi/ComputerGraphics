"use strict";

//Classes
import Shader  from '../_classes/Shader.js';
import Renderer from '../_classes/Renderer.js';
import OrbitCamera from '../_classes/OrbitCamera.js';
import Model from '../_classes/Model.js';
import Texture from '../_classes/Texture.js';
import Material from '../_classes/Material.js';
import { DirectionalLight } from '../_classes/BasicLight.js';
import {PointLight} from './PointLight.js' // [Assign2] Light 클래스의 유도 클래스인 PointLight 클래스를 구현해 놓았습니다.

//Shaders
import lightVertexShader from './lightVertex.js';
import lightFragmentShader from './lightFragment.js'; // [Assign2] Point Light 계산 기능을 lightFragment.js에 구현해야 합니다.

const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

async function main() {
  // Get A WebGL context
  let canvas = document.querySelector("#c");
  let gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }
  
  //---Model Loading
  let teapot = new Model();
  teapot.LoadModel(gl, '../../resources/models/teapot/teapot.obj')

  //--Texture Loading
  let checkerTexture = new Texture(gl);
  checkerTexture.LoadeTextureFromImage(gl,'../../resources/uv-grid.png');
  
  //--Directional Light Define
  // [Assign2] Scene에는 하나의 Directional Light와 세 개의 Point Light가 있습니다.
  let mainLight = new DirectionalLight([1.0,1.0,1.0], 0.0, //<--Ambient Data
                                      [2.0, -1.0, -2.0], 0.0); //<--light direction, diffuse intensity

  // [Assign2] 각 Point Light는 lightColor(vec3), ambientIntensity(float), diffuseIntensity(float)와 
  //           position(vec3), attenuation(float)을 속성으로 가지고 있습니다.
  //           이때 앞의 3개 속성은, Light 클래스로부터 상속 받았습니다.
  //           (중요) 마지막 인자인 light index의 존재 이유와 사용법은 PointLight.js 파일을 보고 유추하여
  //                  lightFragment Shader에서 사용해야 합니다.
  let pointLightRed = new PointLight([1.0, 0.0, 0.0], 0.0, 0.8, // <-- lightColor, ambientIntensity, diffuseIntensity
                                    [-1.0, -1.0, 2.0], 0.5, // <-- position, attenuation
                                    0); // <-- light index
  let pointLightGreen = new PointLight([0.0, 1.0, 0.0], 0.0, 0.8,
                                  [0.0, -1.0, 2.0], 0.5, 
                                  1);
  let pointLightBlue = new PointLight([0.0, 0.0, 1.0], 0.0, 0.8,
                                  [1.0, -1.0, 2.0], 0.5,
                                  2);


  //--Material Define
  let shineMat = new Material(5.0, 32.0); // 반사도가 높은 머티리얼

  //---Camera(view) Initialize
  let eye = [0.0, 0.0, 5.0];
  let at = [0.0, 0.0, 0.0];
  let up = [0.0, 1.0, 0.0];
  let yaw = -90.0;
  let pitch = 0.0;
  let distance = 5.0;
  let turnspeed = 10.0;
  let mainCamera = new OrbitCamera(eye,at,up,yaw,pitch,distance,turnspeed);
  
  //---Projection Initialize
  let fovRadian = 60.0 * Math.PI / 180;
  let aspect = gl.canvas.clientWidth/gl.canvas.clientHeight;
  let proj = mat4.create();
  mat4.perspective(proj, fovRadian, aspect, 0.1, 100.0);

  //---Shader Initialize
  let shader = new Shader(gl,lightVertexShader,lightFragmentShader);
  shader.Bind(gl);
  shader.SetUniformMat4f(gl, "u_projection", proj);
  shader.SetUniform1i(gl, "u_pointLightCount", 3) // [Assign2] (중요) Point Light의 갯수를 shader에 인자로 넘겨줍니다.
  shader.Unbind(gl);

  //---Renderer Initialize
  let renderer = new Renderer();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  //---Options
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //--------------------UI Setting---------------------//
  webglLessonsUI.setupSlider("#camera-yaw", {slide: updateCameraYaw, min: -180, max: 180, step: 0.5});
  webglLessonsUI.setupSlider("#camera-pitch", {slide: updateCameraPitch, min: -90, max: 90, step: 0.5});
  webglLessonsUI.setupSlider("#camera-distance", {slide: updateCameraDistance, min: 0, max: 10, step: 0.1});

  // [Assign2] 테스트를 위해 빨간색 point light의 위치와 attenuation factor를 slider를 통해 수정할 수 있도록 했습니다.
  webglLessonsUI.setupSlider("#red-light-x", {slide: updateRedPointLightX, min: -10, max: 10, step: 0.1});
  webglLessonsUI.setupSlider("#red-light-y", {slide: updateRedPointLightY, min: -10, max: 10, step: 0.1});
  webglLessonsUI.setupSlider("#red-light-z", {slide: updateRedPointLightZ, min: -10, max: 10, step: 0.1});
  webglLessonsUI.setupSlider("#red-light-atten", {slide: updateRedPointLightAtten, min: 0.01, max: 1, step: 0.01});
  //---------------------------------------------------//

  requestAnimationFrame(drawScene);

  function drawScene()
  {
    //화면 크기 재조정
  	webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    renderer.Clear(gl);

    shader.Bind(gl); //Uniform 설정에 필요하기 때문에 바인딩
    {
      //---카메라 설정(현재는 모든 모델에 대해 동일한 뷰행렬 사용)
      let view = mainCamera.CalculateViewMatrix();
      shader.SetUniformMat4f(gl, "u_view", view);

      //(중요!) specular 효과를 위해서는 카메라 eye 위치를 전달해 주어야 함!
	    var eyePos = mainCamera.eye;
	    shader.SetUniform3f(gl,"u_eyePosition", eyePos[0], eyePos[1],eyePos[2]);

      //Light 적용
	    mainLight.UseLight(gl, shader);

      // [Assign2] 세 개의 Point Light와 관련된 uniform들을 shader에 넘겨줍니다.
      pointLightRed.UseLight(gl, shader);
      pointLightGreen.UseLight(gl, shader);
      pointLightBlue.UseLight(gl, shader);
      
      //---왼쪽 주전자, dullMat으로 그리기
      let model = mat4.create();
      mat4.scale(model, model, [0.1, 0.1, 0.1]);
      shader.SetUniformMat4f(gl, "u_model", model);

      checkerTexture.Bind(gl,0);
      shader.SetUniform1i(gl, "u_mainTexture", 0);

      shineMat.UseMaterial(gl, shader);

      teapot.RenderModel(gl, shader);
    }
    
    shader.Unbind(gl);

    requestAnimationFrame(drawScene);
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

  // [Assign2] slider를 통해 수정된 값으로 pointLightRed 객체의 속성을 갱신합니다.
  function updateRedPointLightX(event, ui)
  {
    pointLightRed.position = [ui.value, pointLightRed.position[1], pointLightRed.position[2]];
  }
  function updateRedPointLightY(event, ui)
  {
    pointLightRed.position = [pointLightRed.position[0], ui.value, pointLightRed.position[2]];
  }
  function updateRedPointLightZ(event, ui)
  {
    pointLightRed.position = [pointLightRed.position[0], pointLightRed.position[1], ui.value];
  }
  function updateRedPointLightAtten(event, ui)
  {
    pointLightRed.attenuationFactor = ui.value;
  }

}

main();
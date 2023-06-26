"use strict"

// classes
import Shader from "../_classes/Shader.js";
import Renderer from "../_classes/Renderer.js";
import Camera from "../_classes/Camera.js";
import VertexArray from "../_classes/VertexArray.js";
import VertexBuffer from "../_classes/VertexBuffer.js";
import IndexBuffer from "../_classes/IndexBuffer.js";

const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

// shader
var hourglassVertexShader =
`#version 300 es

layout(location=0) in vec3 a_position;
layout(location=1) in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec4 v_color;

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    v_color = a_color;
}
`;

var hourglassFragmentShader =
`#version 300 es

precision highp float;

layout(location=0) out vec4 outColor;

in vec4 v_color;

void main() {
    outColor = v_color;
}
`;

function main()
{
    let canvas = document.querySelector("#c");
    let gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // hourglass
    let hourglassVertices = [
       // x    y     z    r    g    b    a
       // lower pyramid
         0.0, 1.0,  0.0, 1.0, 0.0, 0.0, 1.0,  // v1 = 0
         1.0, 0.0,  0.0, 0.0, 1.0, 0.0, 1.0,  // v2 = 1
         0.0, 0.0,  1.0, 0.0, 0.0, 1.0, 1.0,  // v3 = 2
        -1.0, 0.0,  0.0, 1.0, 1.0, 0.0, 1.0,  // v4 = 3
         0.0, 0.0, -1.0, 0.0, 1.0, 1.0, 1.0,  // v5 = 4
       // upper pyramid = lower pyramid 를 (1, 0) 기준으로 대칭이동
        -1.0, 2.0,  0.0, 0.0, 1.0, 0.0, 1.0,  // v2' = 5
         0.0, 2.0, -1.0, 0.0, 0.0, 1.0, 1.0,  // v3' = 6
         1.0, 2.0,  0.0, 1.0, 1.0, 0.0, 1.0,  // v4' = 7
         0.0, 2.0,  1.0, 0.0, 1.0, 1.0, 1.0,  // v5' = 8
    ];

    let hourglassIndices = [
        0, 2, 1, // v1 - v3 - v2
        0, 1, 4, // v1 - v2 - v5
        0, 4, 3, // v1 - v5 - v4
        0, 3, 2, // v1 - v4 - v3
        1, 2, 4, // v2 - v3 - v5
        2, 3, 4, // v3 - v4 - v5
        0, 6, 5, // v1 - v3' - v2'
        0, 5, 8, // v1 - v2' - v5'
        0, 8, 7, // v1 - v5' - v4'
        0, 7, 6, // v1 - v4' - v3'
        5, 6, 8, // v2' - v3' - v5'
        6, 7, 8, // v3' - v4' - v5'
    ];

    // hourglass
    let hourglassVA = new VertexArray(gl);
    let hourglassVB = new VertexBuffer(gl, hourglassVertices);
    hourglassVA.AddBuffer(gl, hourglassVB, [3, 4], [false, false]);
    let hourglassIB = new IndexBuffer(gl, hourglassIndices, hourglassIndices.length);

    let shader = new Shader(gl, hourglassVertexShader, hourglassFragmentShader);
    
    hourglassVA.Unbind(gl);
    hourglassVB.Unbind(gl);
    hourglassIB.Unbind(gl);
    shader.Unbind(gl);

    // left camera
    let eye = [1.5, 1.0, 4.0];
    let up = [0.0, 1.0, 0.0];
    let yaw = -90.0;
    let pitch = 0.0;
    let movespeed = 0.05;
    let turnspeed = 0.5;
    let leftCamera = new Camera(eye, up, yaw, pitch, movespeed, turnspeed);

    // right camera
    eye = [-1.5, 1.0, 4.0];
    let rightCamera = new Camera(eye, up, yaw, pitch, movespeed, turnspeed);

    // projection
    let fovRadian = 60.0 * Math.PI / 180;
    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    let proj = mat4.create();
    mat4.perspective(proj, fovRadian, aspect, 0.1, 100.0);

    let renderer = new Renderer();

    // rotation angle
    let leftRotationAngle = 0;
    let rightRotationAngle = 0;
    
    requestAnimationFrame(drawScene);
    
    // slider
    webglLessonsUI.setupSlider("#PyramidRotationY", {slide : rotateY, min : 0, max : 360, steps : 1});
    
    function rotateY(event, ui)
    {
        leftRotationAngle = Math.PI * ui.value * -1 / 180;
        rightRotationAngle = Math.PI * ui.value * 1 / 180;
        //drawScene();
    }
    
    // draw
    function drawScene()
    {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.CULL_FACE);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // background color
        renderer.Clear(gl);
        
        // angle
        //leftRotationAngle += Math.PI * -1 / 180; // auto left rotation
        //rightRotationAngle += Math.PI * 1 / 180; // auto right rotation

        // draw left hourglass
        shader.Bind(gl);
        
        let leftModel = mat4.create();
        mat4.fromYRotation(leftModel, leftRotationAngle);
        shader.SetUniformMat4f(gl, "u_model", leftModel);
        
        let view = leftCamera.CalculateViewMatrix();
        shader.SetUniformMat4f(gl, "u_view", view);

        shader.SetUniformMat4f(gl, "u_projection", proj);
        
        renderer.Draw(gl, hourglassVA, hourglassIB, shader);

        // draw right hourglass
        let rightModel = mat4.create();
        mat4.fromYRotation(rightModel, rightRotationAngle);
        shader.SetUniformMat4f(gl, "u_model", rightModel);

        view = rightCamera.CalculateViewMatrix();
        shader.SetUniformMat4f(gl, "u_view", view);

        renderer.Draw(gl, hourglassVA, hourglassIB, shader);

        hourglassVA.Unbind(gl);
        shader.Unbind(gl);

        requestAnimationFrame(drawScene);
    }
}

main();
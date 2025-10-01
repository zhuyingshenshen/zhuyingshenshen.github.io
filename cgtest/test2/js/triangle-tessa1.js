"use strict";

const { vec3, mat4 } = glMatrix;

var canvas;
var gl;
var program;
var points = [];

/** Parameters */
var numTimesToSubdivide = 0;
var theta = 0;
var twist = false;

var radius = 1.0;

window.onload = function initTriangles() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
    }

    document.getElementById("drawButtonTessa").addEventListener("click", function () {
        numTimesToSubdivide = parseInt(document.getElementById("levelInputTessa").value);
        theta = parseInt(document.getElementById("rotationInput").value);
        redrawTriangles();
    });

    redrawTriangles();
};

function redrawTriangles() {
    points = [];

    // 修正顶点角度，使三角形正立
    // 将原始角度调整为: -90°(底部), 30°(右上), 150°(左上)
    var vertices = [
            0, radius, 0,                  // 顶部顶点（朝上）
            -radius * Math.sqrt(3)/2, -radius/2, 0,  // 左下顶点
            radius * Math.sqrt(3)/2, -radius/2, 0    // 右下顶点
        ];

    var u = vec3.fromValues(vertices[0], vertices[1], vertices[2]);
    var v = vec3.fromValues(vertices[3], vertices[4], vertices[5]);
    var w = vec3.fromValues(vertices[6], vertices[7], vertices[8]);

    divideTriangle(u, v, w, numTimesToSubdivide);

    // configure webgl
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // load shaders and initialise attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // load data into gpu
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // associate out shader variables with data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // 获取模型视图矩阵的 uniform 变量位置
    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

    // 创建并设置模型视图矩阵（绕 Z 轴旋转）
    var modelViewMatrix = mat4.create();
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, theta * Math.PI / 180.0);

    // 将模型视图矩阵传递给着色器
    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);

    renderTriangles();
}

function tessellaTriangle(a, b, c) {
    points.push(a[0], a[1], a[2]);
    points.push(b[0], b[1], b[2]);
    points.push(b[0], b[1], b[2]);
    points.push(c[0], c[1], c[2]);
    points.push(c[0], c[1], c[2]);
    points.push(a[0], a[1], a[2]);
}

function divideTriangle(a, b, c, count) {
    // check for end of recursion
    if (count === 0) {
        tessellaTriangle(a, b, c);
    } else {
        var ab = vec3.create();
        vec3.lerp(ab, a, b, 0.5);
        var bc = vec3.create();
        vec3.lerp(bc, b, c, 0.5);
        var ca = vec3.create();
        vec3.lerp(ca, c, a, 0.5);

        // 四个新三角形
        divideTriangle(a, ab, ca, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(ca, bc, c, count - 1);
        divideTriangle(ab, bc, ca, count - 1);
    }
}

function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, points.length / 3);
}
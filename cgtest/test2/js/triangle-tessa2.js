"use strict";

const { vec3 } = glMatrix;

var canvas;
var gl;
var program;
var points = [];

/** 参数 */
var numTimesToSubdivide = 0;
var theta = 60; // 旋转角度系数（控制每个单位距离对应的旋转角度）
var radius = 1.0; // 三角形外接圆半径，确保完整显示

window.onload = function initTriangles() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2.0 不可用，请使用支持WebGL 2.0的浏览器");
    }

    // 绑定绘制按钮点击事件
    document.getElementById("drawButtonTessa").addEventListener("click", function () {
        numTimesToSubdivide = parseInt(document.getElementById("levelInputTessa").value);
        theta = parseInt(document.getElementById("rotationInput").value);
        redrawTriangles();
    });

    // 初始绘制
    redrawTriangles();
};

function redrawTriangles() {
    points = [];

    // 定义正立三角形顶点（顶部朝上）
   var vertices = [
           0, radius, 0,                  // 顶部顶点（朝上）
           -radius * Math.sqrt(3)/2, -radius/2, 0,  // 左下顶点
           radius * Math.sqrt(3)/2, -radius/2, 0    // 右下顶点
       ];

    var u = vec3.fromValues(vertices[0], vertices[1], vertices[2]);
    var v = vec3.fromValues(vertices[3], vertices[4], vertices[5]);
    var w = vec3.fromValues(vertices[6], vertices[7], vertices[8]);

    // 细分三角形
    divideTriangle(u, v, w, numTimesToSubdivide);

    // WebGL 配置
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // 加载着色器并初始化属性缓冲区
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 数据加载到 GPU
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // 关联着色器变量与数据缓冲区
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // 传递旋转角度系数到着色器（转为弧度）
    var uTheta = gl.getUniformLocation(program, "uTheta");
    gl.uniform1f(uTheta, theta * Math.PI / 180.0);

    // 渲染
    renderTriangles();
}

function tessellaTriangle(a, b, c) {
    // 绘制三角形的三条边（线段表示）
    points.push(a[0], a[1], a[2]);
    points.push(b[0], b[1], b[2]);
    points.push(b[0], b[1], b[2]);
    points.push(c[0], c[1], c[2]);
    points.push(c[0], c[1], c[2]);
    points.push(a[0], a[1], a[2]);
}

function divideTriangle(a, b, c, count) {
    // 递归终止条件
    if (count === 0) {
        tessellaTriangle(a, b, c);
    } else {
        // 计算各边中点
        var ab = vec3.create();
        vec3.lerp(ab, a, b, 0.5);
        var bc = vec3.create();
        vec3.lerp(bc, b, c, 0.5);
        var ca = vec3.create();
        vec3.lerp(ca, c, a, 0.5);

        // 递归细分四个新三角形
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
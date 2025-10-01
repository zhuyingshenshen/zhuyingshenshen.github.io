"use strict";

const { vec3 } = glMatrix;

var canvas;
var gl;
var program;
var points = [];
var numTimesToSubdivide = 3;

window.onload = function () {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
    }

    // 加载着色器并初始化属性缓冲区
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    document.getElementById("drawButton").addEventListener("click", function () {
        numTimesToSubdivide = parseInt(document.getElementById("levelInput").value);
        initTriangles();
    });

    initTriangles();
};

function initTriangles() {
    points = [];

    // 初始化谢尔宾斯基三角形的数据
    // 首先，用三个点初始化三角形的三个角
    var vertices = [
        -1, -1, 0,
        0, 1, 0,
        1, -1, 0
    ];

    var u = vec3.fromValues(vertices[0], vertices[1], vertices[2]);
    var v = vec3.fromValues(vertices[3], vertices[4], vertices[5]);
    var w = vec3.fromValues(vertices[6], vertices[7], vertices[8]);

    divideTriangle(u, v, w, numTimesToSubdivide);

    // 配置 WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // 加载数据到 GPU
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // 将着色器变量与数据缓冲区关联
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    renderTriangles();
}

function triangle(a, b, c) {
    points.push(a[0], a[1], a[2]);
    points.push(b[0], b[1], b[2]);
    points.push(c[0], c[1], c[2]);
}

function divideTriangle(a, b, c, count) {
    // 检查递归是否结束
    if (count === 0) {
        triangle(a, b, c);
    } else {
        var ab = vec3.create();
        vec3.lerp(ab, a, b, 0.5);
        var bc = vec3.create();
        vec3.lerp(bc, b, c, 0.5);
        var ca = vec3.create();
        vec3.lerp(ca, c, a, 0.5);

        // 三个新的三角形
        divideTriangle(a, ab, ca, count - 1);
        divideTriangle(b, bc, ab, count - 1);
        divideTriangle(c, ca, bc, count - 1);
    }
}

function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);
}
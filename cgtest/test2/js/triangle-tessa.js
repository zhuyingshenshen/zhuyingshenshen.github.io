"use strict";

const { vec3 } = glMatrix;

var canvas;
var gl;
var program;
var points = [];

/** Parameters */
var numTimesToSubdivide = 0;
var theta = 60;
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
        redrawTriangles();
    });

    redrawTriangles();
};

function redrawTriangles() {
    points = [];

    // 修正顶点角度，使三角形正立
    // 将原始角度调整为: -90°(底部), 30°(右上), 150°(左上)
    var vertices = [
        radius * Math.cos(-90 * Math.PI / 180.0), radius * Math.sin(-90 * Math.PI / 180.0), 0,  // 底部顶点
        radius * Math.cos(30 * Math.PI / 180.0), radius * Math.sin(30 * Math.PI / 180.0), 0,   // 右上顶点
        radius * Math.cos(150 * Math.PI / 180.0), radius * Math.sin(150 * Math.PI / 180.0), 0  // 左上顶点
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

    renderTriangles();
}

function tessellaTriangle(a, b, c) {
    var zerovec3 = vec3.create();
    vec3.zero(zerovec3);
    var radian = theta * Math.PI / 180.0;

    var a_new = vec3.create();
    var b_new = vec3.create();
    var c_new = vec3.create();

    if (twist === false) {
        vec3.rotateZ(a_new, a, zerovec3, radian);
        vec3.rotateZ(b_new, b, zerovec3, radian);
        vec3.rotateZ(c_new, c, zerovec3, radian);

        points.push(a_new[0], a_new[1], a_new[2]);
        points.push(b_new[0], b_new[1], b_new[2]);
        points.push(b_new[0], b_new[1], b_new[2]);
        points.push(c_new[0], c_new[1], c_new[2]);
        points.push(c_new[0], c_new[1], c_new[2]);
        points.push(a_new[0], a_new[1], a_new[2]);
    } else {
        var d_a = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
        var d_b = Math.sqrt(b[0] * b[0] + b[1] * b[1]);
        var d_c = Math.sqrt(c[0] * c[0] + c[1] * c[1]);

        vec3.set(a_new, a[0] * Math.cos(d_a * radian) - a[1] * Math.sin(d_a * radian),
            a[0] * Math.sin(d_a * radian) + a[1] * Math.cos(d_a * radian), 0);
        vec3.set(b_new, b[0] * Math.cos(d_b * radian) - b[1] * Math.sin(d_b * radian),
            b[0] * Math.sin(d_b * radian) + b[1] * Math.cos(d_b * radian), 0);
        vec3.set(c_new, c[0] * Math.cos(d_c * radian) - c[1] * Math.sin(d_c * radian),
            c[0] * Math.sin(d_c * radian) + c[1] * Math.cos(d_c * radian), 0);

        points.push(a_new[0], a_new[1], a_new[2]);
        points.push(b_new[0], b_new[1], b_new[2]);
        points.push(b_new[0], b_new[1], b_new[2]);
        points.push(c_new[0], c_new[1], c_new[2]);
        points.push(c_new[0], c_new[1], c_new[2]);
        points.push(a_new[0], a_new[1], a_new[2]);
    }
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
    
"use strict";

var canvas;
var gl;

var theta = 0.0;
var thetaLoc;
var translationLoc;
var scaleLoc;

function initRotSquare(){
    canvas = document.getElementById("rot-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    var program = initShaders(gl, "rot-v-shader", "rot-f-shader");
    gl.useProgram(program);

    var vertices = new Float32Array([
         0,  1,  0,
        -1,  0,  0,
         1,  0,  0,
         0, -1,  0
    ]);

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    thetaLoc = gl.getUniformLocation(program, "theta");
    translationLoc = gl.getUniformLocation(program, "translation");
    scaleLoc = gl.getUniformLocation(program, "scale");

    renderSquare();
}

function renderSquare(){
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 🔁 角度输入
    var angleDeg = parseFloat(document.getElementById("angle").value) || 0.0;
    theta = angleDeg * Math.PI / 180.0;
    gl.uniform1f(thetaLoc, theta);

    // 📦 平移输入
    var tx = parseFloat(document.getElementById("tx").value) || 0.0;
    var ty = parseFloat(document.getElementById("ty").value) || 0.0;
    gl.uniform2f(translationLoc, tx, ty);

    // 🔍 缩放输入
    var scaleVal = parseFloat(document.getElementById("scaleVal").value) || 1.0;
    var axis = document.getElementById("scaleAxis").value;

    let sx = 1.0, sy = 1.0;
    if (axis === "xy") {
        sx = sy = scaleVal;
    } else if (axis === "x") {
        sx = scaleVal;
    } else if (axis === "y") {
        sy = scaleVal;
    }

    gl.uniform2f(scaleLoc, sx, sy);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    window.requestAnimFrame(renderSquare);
}

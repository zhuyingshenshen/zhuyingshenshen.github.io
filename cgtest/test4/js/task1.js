"use strict";

const{ vec3, vec4, mat3, mat4, quat } = glMatrix;

var canvas;
var gl;
var fileInput;

var meshdata;
var mesh;

var points = [];
var colors = [];
var acolor = [];
var lineIndex = [];

var color;

var modelViewMatrix = mat4.create();
var projectionMatrix = mat4.create();

var vBuffer = null;
var vPosition = null;
var cBuffer = null;
var vColor = null;
var iBuffer = null;

var lineCnt = 0;

// 正交投影参数
var oleft = -3.0;
var oright = 3.0;
var oytop = 3.0;
var oybottom = -3.0;
var onear = -5;
var ofar = 10;
var oradius = 3.0;
var theta = 0.0;
var phi = 0.0;

/* 物体位置/旋转 */
var dx = 0;
var dy = 0;
var dz = 0;
var step = 0.1;
var dxt = 0;
var dyt = 0;
var dzt = 0;
var stept = 2;

// 缩放参数
var sx = 1;
var sy = 1;
var sz = 1;

/* 相机位置/旋转 */
var cx = 0.0;
var cy = 0.0;
var cz = 4.0;
var stepc = 0.1;
var cxt = 0;
var cyt = 0;
var czt = 0;
var stepct = 2;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var eye = vec3.fromValues(cx, cy, cz);

var at = vec3.fromValues(0.0, 0.0, 0.0);
var up = vec3.fromValues(0.0, 1.0, 0.0);

var rquat = quat.create();

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

var currentKey = [];

/* 固定正交投影 */
var projectionType = 1;
var drawType = 1;
var viewType = [0];
var viewcnt = 0;

var changePos = 1; // 1=物体，2=相机
var currentColor = vec4.create();
var program = null;

function handleKeyDown(event) {
    var key = event.keyCode;
    currentKey[key] = true;
    if( changePos === 1 ){
        // 物体控制逻辑
        switch (key) {
            case 65: dx -= step; break;
            case 68: dx += step; break;
            case 87: dy += step; break;
            case 83: dy -= step; break;
            case 90: dz += step; break;
            case 88: dz -= step; break;
            case 72: dyt -= stept; break;
            case 75: dyt += stept; break;
            case 85: dxt -= stept; break;
            case 74: dxt += stept; break;
            case 78: dzt += stept; break;
            case 77: dzt -= stept; break;
            case 82: // 重置物体
                dx = 0; dy = 0; dz = 0;
                dxt = 0; dyt = 0; dzt = 0;
                break;
        }
        // 更新物体控制滑块显示
        document.getElementById("xpos").value = dx;
        document.getElementById("ypos").value = dy;
        document.getElementById("zpos").value = dz;
        document.getElementById("xrot").value = Math.floor(dxt);
        document.getElementById("yrot").value = Math.floor(dyt);
        document.getElementById("zrot").value = Math.floor(dzt);
    }
    if( changePos === 2 ){
        // 相机控制逻辑
        switch (key) {
            case 65: cx -= stepc; break; // 相机X-
            case 68: cx += stepc; break; // 相机X+
            case 87: cy += stepc; break; // 相机Y+
            case 83: cy -= stepc; break; // 相机Y-
            case 90: cz += stepc; break; // 相机Z+
            case 88: cz -= stepc; break; // 相机Z-
            case 72: cyt -= stepct; break; // 相机Y轴旋转-
            case 75: cyt += stepct; break; // 相机Y轴旋转+
            case 85: cxt -= stepct; break; // 相机X轴旋转-
            case 74: cxt += stepct; break; // 相机X轴旋转+
            case 78: czt += stepct; break; // 相机Z轴旋转+
            case 77: czt -= stepct; break; // 相机Z轴旋转-
            case 82: // 重置相机
                cx = 0; cy = 0; cz = 4;
                cxt = 0; cyt = 0; czt = 0;
                theta = 0; phi = 0;
                break;
        }
        // 更新相机控制滑块显示
        document.getElementById("xpos").value = cx;
        document.getElementById("ypos").value = cy;
        document.getElementById("zpos").value = cz;
        document.getElementById("xrot").value = Math.floor(cxt);
        document.getElementById("yrot").value = Math.floor(cyt);
        document.getElementById("zrot").value = Math.floor(czt);
    }
    buildModelViewProj();
}

function handleKeyUp(event) {
    currentKey[event.keyCode] = false;
}

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseDown = false;
}

function handleMouseMove(event) {
    if (!mouseDown) return;

    var newX = event.clientX;
    var newY = event.clientY;
    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    theta -= deltaX; // 水平旋转
    phi -= deltaY;   // 垂直旋转
    phi = Math.max(-85, Math.min(85, phi));

    lastMouseX = newX;
    lastMouseY = newY;
    buildModelViewProj();
}

function checkInput(){
    var dtype = document.getElementById("wire").checked;
    drawType = dtype ? 1 : 2;

    var hexcolor = document.getElementById("objcolor").value.substring(1);
    var rgbHex = hexcolor.match(/.{1,2}/g);
    currentColor = vec4.fromValues( 
        parseInt(rgbHex[0], 16)/255.0,
        parseInt(rgbHex[1], 16)/255.0,
        parseInt(rgbHex[2], 16)/255.0,
        1.0
    );
}

function restoreSliderValue(changePos){
    if (changePos === 1) {
        document.getElementById("xpos").value = dx;
        document.getElementById("ypos").value = dy;
        document.getElementById("zpos").value = dz;
        document.getElementById("xrot").value = Math.floor(dxt);
        document.getElementById("yrot").value = Math.floor(dyt);
        document.getElementById("zrot").value = Math.floor(dzt);
    }
    if (changePos === 2) {
        document.getElementById("xpos").value = cx;
        document.getElementById("ypos").value = cy;
        document.getElementById("zpos").value = cz;
        document.getElementById("xrot").value = Math.floor(cxt);
        document.getElementById("yrot").value = Math.floor(cyt);
        document.getElementById("zrot").value = Math.floor(czt);
    }
}

window.onload = function initWindow(){
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.clearColor(0.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    initInterface();
    checkInput();
}

function initBuffers(){
    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();
}

function initInterface(){
    fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", function (event) {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onload = function (event) {
            meshdata = reader.result;
            initObj();
        }
        reader.readAsText(file);
    });

    var drawradios = document.getElementsByName("drawtype");
    for (var i = 0; i < drawradios.length; i++) {
        drawradios[i].onclick = function () {
            drawType = parseInt(this.value);
            updateModelData();
            render();
        }
    }

    document.getElementById("objcolor").addEventListener("input", function (event) {
        var hexcolor = this.value.substring(1);
        var rgbHex = hexcolor.match(/.{1,2}/g);
        currentColor = vec4.fromValues(
            parseInt(rgbHex[0], 16)/255.0,
            parseInt(rgbHex[1], 16)/255.0,
            parseInt(rgbHex[2], 16)/255.0,
            1.0
        );
        updateColor();
        render();
    });

    document.getElementById("xpos").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos === 1) dx = value;
        else if(changePos === 2) cx = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("ypos").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos === 1) dy = value;
        else if(changePos === 2) cy = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("zpos").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos === 1) dz = value;
        else if(changePos === 2) cz = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("xrot").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos === 1) dxt = value;
        else if(changePos === 2) cxt = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("yrot").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos === 1) dyt = value;
        else if(changePos === 2) cyt = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("zrot").addEventListener("input",function(event){
        var value = parseFloat(this.value);
        if(changePos === 1) dzt = value;
        else if(changePos === 2) czt = value;
        buildModelViewProj();
        render();
    });

    var postypeRadio = document.getElementsByName("posgrp");
    for (var i = 0; i < postypeRadio.length; i++) {
        postypeRadio[i].addEventListener("click", function (event) {
            changePos = parseInt(this.value);
            restoreSliderValue(changePos);
        });
    }

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
}

function buildMultiViewProj(type){
    if( type[0] === 0 ) render();
    else rendermultiview();
}

function initObj(){
    mesh = new OBJ.Mesh(meshdata);
    OBJ.initMeshBuffers(gl, mesh);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    var bcolor = [];
    for(var i=0; i<mesh.vertexBuffer.numItems; i++)
        bcolor.push(currentColor[0], currentColor[1], currentColor[2], currentColor[3]);

    if(cBuffer === null) cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bcolor), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    dx = -1.0 * (parseFloat(mesh.xmax) + parseFloat(mesh.xmin))/2.0;
    dy = -1.0 * (parseFloat(mesh.ymax) + parseFloat(mesh.ymin))/2.0;
    dz = -1.0 * (parseFloat(mesh.zmax) + parseFloat(mesh.zmin))/2.0;

    var scalex = Math.abs(parseFloat(mesh.xmax)-parseFloat(mesh.xmin));
    var scaley = Math.abs(parseFloat(mesh.ymax)-parseFloat(mesh.ymin));
    var scalez = Math.abs(parseFloat(mesh.zmax)-parseFloat(mesh.zmin));
    var maxScale = Math.max(scalex, scaley, scalez);
    if(maxScale > 0){
        sx = 2.0/maxScale;
        sy = 2.0/maxScale;
        sz = 2.0/maxScale;
    }

    updateModelData();
    buildModelViewProj();
    updateColor();
    render();
}

function updateModelData(){
    if(vBuffer === null) vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vBuffer);
    lineIndex = [];
    for(var i = 0; i < mesh.indices.length; i+=3 ){
        lineIndex.push(mesh.indices[i], mesh.indices[i+1]);
        lineIndex.push(mesh.indices[i+1], mesh.indices[i + 2]);
        lineIndex.push(mesh.indices[i+2], mesh.indices[i]);
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineIndex), gl.STATIC_DRAW);
}

function updateColor(){
    var bcolor = [];
    for (var i = 0; i < mesh.vertexBuffer.numItems; i++)
        bcolor.push(currentColor[0], currentColor[1], currentColor[2], currentColor[3]);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bcolor), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
}

// 核心修改：相机旋转矩阵取反
function buildModelViewProj(){
    // 1. 正交投影矩阵
    mat4.ortho(pMatrix, oleft, oright, oybottom, oytop, onear, ofar);

    // 2. 相机位置计算
    var rthe = theta * Math.PI / 180.0;
    var rphi = phi * Math.PI / 180.0;
    var rotX = oradius * Math.sin(rthe) * Math.cos(rphi);
    var rotY = oradius * Math.sin(rthe) * Math.sin(rphi);
    var rotZ = oradius * Math.cos(rthe);
    vec3.set(eye, cx + rotX, cy + rotY, cz + rotZ);

    // 3. 视图矩阵
    mat4.lookAt(mvMatrix, eye, at, up);

    // 4. 相机旋转（核心修改：旋转角度取反）
    if(changePos === 2){
        mat4.rotateX(mvMatrix, mvMatrix, -cxt * Math.PI / 180.0);  // 取反
        mat4.rotateY(mvMatrix, mvMatrix, -cyt * Math.PI / 180.0);  // 取反
        mat4.rotateZ(mvMatrix, mvMatrix, -czt * Math.PI / 180.0);  // 取反
    }

    // 5. 物体变换（保持不变）
    if(changePos === 1){
        mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(dx, dy, dz));
        mat4.rotateX(mvMatrix, mvMatrix, dxt * Math.PI / 180.0);
        mat4.rotateY(mvMatrix, mvMatrix, dyt * Math.PI / 180.0);
        mat4.rotateZ(mvMatrix, mvMatrix, dzt * Math.PI / 180.0);
    }

    // 6. 模型缩放
    mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(sx, sy, sz));

    // 7. 传递矩阵到着色器
    modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrix, false, new Float32Array(mvMatrix));
    projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrix, false, new Float32Array(pMatrix));
}

var interval = setInterval(timerFunc, 30);
function timerFunc() {
    render();
}

function render(){
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderType(drawType);
}

function renderType(type){
    if (type === 1) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vBuffer);
        gl.drawElements(gl.LINES, lineIndex.length, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
}
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

// 仅保留透视投影参数
var pnear = 0.01;
var pfar = 20;
var pradius = 3.0;
var fovy = 45.0 * Math.PI/180.0;
var aspect;
var theta = 0.0;
var phi = 0.0;

/* dx, dy, dz: 物体位置 */
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

/* cx, cy, cz: 相机位置 */
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

/* 固定为透视投影 */
var projectionType = 2; // 透视投影(2)
var drawType = 1; // 默认线框模式(1)
var viewType = [0];
var viewcnt = 0;

var changePos = 1; // 默认调整物体(1)

var currentColor = vec4.create();

var program = null;

function handleKeyDown(event) {
    var key = event.keyCode;
    currentKey[key] = true;
    if( changePos === 1 ){
        switch (key) {
            case 65: // A键：x轴负方向移动
                dx -= step;
                document.getElementById("xpos").value=dx;
                break;
            case 68: // D键：x轴正方向移动
                dx += step;
                document.getElementById("xpos").value=dx;
                break;
            case 87: // W键：y轴正方向移动
                dy += step;
                document.getElementById("ypos").value=dy;
                break;
            case 83: // S键：y轴负方向移动
                dy -= step;
                document.getElementById("ypos").value=dy;
                break;
            case 90: // Z键：z轴正方向移动
                dz += step;
                document.getElementById("zpos").value=dz;
                break;
            case 88: // X键：z轴负方向移动
                dz -= step;
                document.getElementById("zpos").value=dz;
                break;
            case 72: // H键：y轴旋转减小
                dyt -= stept;
                document.getElementById("yrot").value=dyt;
                break;
            case 75: // K键：y轴旋转增大
                dyt += stept;
                document.getElementById("yrot").value = dyt;
                break;
            case 85: // U键：x轴旋转减小
                dxt -= stept;
                document.getElementById("xrot").value = dxt;
                break;
            case 74: // J键：x轴旋转增大
                dxt += stept;
                document.getElementById("xrot").value = dxt;
                break;
            case 78: // N键：z轴旋转增大
                dzt += stept;
                document.getElementById("zrot").value = dzt;
                break;
            case 77: // M键：z轴旋转减小
                dzt -= stept;
                document.getElementById("zrot").value = dzt;
                break;
            case 82: // R键：重置物体参数
                dx = 0;
                dy = 0;
                dz = 0;
                dxt = 0;
                dyt = 0;
                dzt = 0;
                break;
        }
    }
    if( changePos === 2 ){
        switch (key) {
            case 65: // A键：相机x轴负方向移动
                cx -= stepc;
                document.getElementById("xpos").value = cx;
                break;
            case 68: // D键：相机x轴正方向移动
                cx += stepc;
                document.getElementById("xpos").value = cx;
                break;
            case 87: // W键：相机y轴正方向移动
                cy += stepc;
                document.getElementById("ypos").value = cy;
                break;
            case 83: // S键：相机y轴负方向移动
                cy -= stepc;
                document.getElementById("ypos").value = cy;
                break;
            case 90: // Z键：相机z轴正方向移动
                cz += stepc;
                document.getElementById("zpos").value = cz;
                break;
            case 88: // X键：相机z轴负方向移动
                cz -= stepc;
                document.getElementById("zpos").value = cz;
                break;
            case 72: // H键：相机y轴旋转减小
                cyt -= stepct;
                document.getElementById("yrot").value = cyt;
                break;
            case 75: // K键：相机y轴旋转增大
                cyt += stepct;
                document.getElementById("yrot").value = cyt;
                break;
            case 85: // U键：相机x轴旋转减小
                cxt -= stepct;
                document.getElementById("xrot").value = cxt;
                break;
            case 74: // J键：相机x轴旋转增大
                cxt += stepct;
                document.getElementById("xrot").value = cxt;
                break;
            case 78: // N键：相机z轴旋转增大
                czt += stepct;
                document.getElementById("zrot").value = czt;
                break;
            case 77: // M键：相机z轴旋转减小
                czt -= stepct;
                document.getElementById("zrot").value = czt;
                break;
            case 82: // R键：重置相机参数
                cx = 0;
                cy = 0;
                cz = 4;
                cxt = 0;
                cyt = 0;
                czt = 0;
                theta = 0; // 新增：重置相机旋转角度
                phi = 0;   // 新增：重置相机旋转角度
                break;
        }
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
    if (!mouseDown)
        return;

    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = (newX - lastMouseX);
    theta = theta - parseFloat(deltaX);
    
    var deltaY = (newY - lastMouseY);
    phi = phi - parseFloat(deltaY);

    // 新增：限制相机垂直旋转角度，避免视角翻转
    phi = Math.max(-85, Math.min(85, phi));

    lastMouseX = newX;
    lastMouseY = newY;
    buildModelViewProj();
}

function checkInput(){
    // 仅处理绘制方式和颜色
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

    gl.clearColor(0.0, 1.0, 1.0, 1.0); // 蓝色背景
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

    // 绘制方式切换
    var drawradios = document.getElementsByName("drawtype");
    for (var i = 0; i < drawradios.length; i++) {
        drawradios[i].onclick = function () {
            var value = this.value;
            if (this.checked) {
                drawType = parseInt(value);
            }
            updateModelData();
            render(); // 新增：切换后立即渲染
        }
    }

    // 颜色选择器
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
        render(); // 新增：颜色变化后立即渲染
    });

    // 位置/旋转滑块控制（新增：转为float类型，避免字符串计算错误）
    document.getElementById("xpos").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos===1) dx = value;
        else if(changePos===2) cx = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("ypos").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos===1) dy = value;
        else if(changePos===2) cy = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("zpos").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos===1) dz = value;
        else if(changePos===2) cz = value;
        buildModelViewProj();
        render();
    });

    document.getElementById("xrot").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos===1) dxt = value;
        else if(changePos===2) cxt = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("yrot").addEventListener("input", function(event){
        var value = parseFloat(this.value);
        if(changePos===1) dyt = value;
        else if(changePos===2) cyt = value;
        buildModelViewProj();
        render();
    });
    document.getElementById("zrot").addEventListener("input",function(event){
        var value = parseFloat(this.value);
        if (changePos === 1) dzt = value;
        else if (changePos === 2) czt = value;
        buildModelViewProj();
        render();
    });

    // 物体/相机切换
    var postypeRadio = document.getElementsByName("posgrp");
    for (var i = 0; i < postypeRadio.length; i++) {
        postypeRadio[i].addEventListener("click", function (event) {
            var value = this.value;
            if (this.checked) {
                changePos = parseInt(value);
                restoreSliderValue(changePos);
            }
        });
    }

    // 事件绑定
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
}

function initObj(){
    mesh = new OBJ.Mesh(meshdata);
    OBJ.initMeshBuffers(gl, mesh);

    // 绑定顶点缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // 初始化颜色缓冲
    var bcolor = [];
    for(var i=0; i<mesh.vertexBuffer.numItems; i++)
        bcolor.push(currentColor[0], currentColor[1], currentColor[2], currentColor[3]);

    if(cBuffer === null) 
        cBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bcolor), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // 模型居中处理
    dx = -1.0 * (parseFloat(mesh.xmax) + parseFloat(mesh.xmin))/2.0;
    dy = -1.0 * (parseFloat(mesh.ymax) + parseFloat(mesh.ymin))/2.0;
    dz = -1.0 * (parseFloat(mesh.zmax) + parseFloat(mesh.zmin))/2.0;

    // 模型缩放
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
    if(vBuffer === null)
        vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vBuffer);
    lineIndex = [];
    for(var i = 0; i < mesh.indices.length; i+=3){
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

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

// 核心修复：1.相机位置结合手动调整值 2.相机旋转角度取反 3.物体/相机变换分离
function buildModelViewProj(){
    // 1. 透视投影矩阵（不变）
    aspect = canvas.width / canvas.height;
    mat4.perspective(pMatrix, fovy, aspect, pnear, pfar);
    
    // 2. 相机位置计算（修复：手动位置 + 旋转偏移）
    var localRadius = pradius;
    var rthe = theta * Math.PI / 180.0;
    var rphi = phi * Math.PI / 180.0;
    // 旋转产生的位置偏移
    var rotX = localRadius * Math.sin(rthe) * Math.cos(rphi);
    var rotY = localRadius * Math.sin(rthe) * Math.sin(rphi);
    var rotZ = localRadius * Math.cos(rthe);
    // 最终相机位置 = 手动调整的cx/cy/cz + 旋转偏移
    vec3.set(eye, cx + rotX, cy + rotY, cz + rotZ);

    // 3. 视图矩阵（相机朝向物体，不变）
    mat4.lookAt(mvMatrix, eye, at, up);

    // 4. 相机旋转（核心修复：角度取反，与物体旋转方向相反）
    if(changePos === 2){
        mat4.rotateX(mvMatrix, mvMatrix, -cxt * Math.PI / 180.0); // 取反
        mat4.rotateY(mvMatrix, mvMatrix, -cyt * Math.PI / 180.0); // 取反
        mat4.rotateZ(mvMatrix, mvMatrix, -czt * Math.PI / 180.0); // 取反
    }

    // 5. 物体变换（修复：仅在选择物体时应用）
    if(changePos === 1){
        mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(dx, dy, dz));
        mat4.rotateX(mvMatrix, mvMatrix, dxt * Math.PI / 180.0);
        mat4.rotateY(mvMatrix, mvMatrix, dyt * Math.PI / 180.0);
        mat4.rotateZ(mvMatrix, mvMatrix, dzt * Math.PI / 180.0);
    }

    // 6. 模型缩放（不变）
    mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(sx, sy, sz));

    // 7. 传递矩阵到着色器（不变）
    modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrix, false, new Float32Array(mvMatrix));
    projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrix, false, new Float32Array(pMatrix));
}

// 渲染循环
var interval = setInterval(timerFunc, 30);
function timerFunc() {
    render();
}

function render(){
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderType(drawType);
}

function renderType(type){
    if (type == 1) {
        // 线框模式
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vBuffer);
        gl.drawElements(gl.LINES, lineIndex.length, gl.UNSIGNED_SHORT, 0);
    } else {
        // 实体模式
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
}
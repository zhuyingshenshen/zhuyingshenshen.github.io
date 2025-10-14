"use strict";

const { vec4, vec2 } = glMatrix;

// 全局变量：WebGL上下文、画布、图形状态
var gl, canvas;
var currentShape = null; // 当前选择的图形类型（cube/triangle/square/circle）
var shapes = [];         // 存储所有已绘制的图形
var colorPicker, circleSides; // 控件引用

// 着色器程序与变量位置（预初始化）
var programs = {
    cube: { program: null, vPos: -1, vColor: -1, thetaLoc: -1, transLoc: -1 },
    triangle: { program: null, vPos: -1, vColor: -1, transLoc: -1, scaleLoc: -1 },
    square: { program: null, vPos: -1, vColor: -1, transLoc: -1, thetaLoc: -1 },
    circle: { program: null, vPos: -1, vColor: -1, transLoc: -1, scaleLoc: -1 }
};

// 缓冲区数据（预生成，避免重复计算）
var buffers = {
    cube: { vBuffer: null, cBuffer: null, count: 36 }, // 立方体6个面，每个面2个三角形（36个顶点）
    triangle: { vBuffer: null, cBuffer: null, count: 3 }, // 正三角形3个顶点
    square: { vBuffer: null, cBuffer: null, count: 6 }, // 正方形2个三角形（6个顶点）
    circle: { vBuffer: null, cBuffer: null, count: 0 } // 圆形顶点数动态生成
};

// 页面加载完成初始化
window.onload = function init() {
    // 1. 获取画布与WebGL上下文
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2.0 不可用，请更换浏览器（如Chrome/Firefox）");
        return;
    }

    // 2. 初始化控件引用
    colorPicker = document.getElementById("colorPicker");
    circleSides = document.getElementById("circleSides");
    circleSides.addEventListener("input", updateCircleBuffer); // 圆形边数变化时更新缓冲区

    // 3. 初始化着色器程序与缓冲区
    initShadersAndBuffers();

    // 4. 绑定按钮事件
    bindEvents();

    // 5. 启动动画循环（处理旋转等动态效果）
    requestAnimationFrame(render);
};

// 步骤1：初始化所有着色器程序与顶点缓冲区
function initShadersAndBuffers() {
    // 初始化立方体
    programs.cube.program = initShaderProgram("cube-vs", "cube-fs");
    if (programs.cube.program) {
        programs.cube.vPos = gl.getAttribLocation(programs.cube.program, "vPosition");
        programs.cube.vColor = gl.getAttribLocation(programs.cube.program, "vColor");
        programs.cube.thetaLoc = gl.getUniformLocation(programs.cube.program, "cubeTheta");
        programs.cube.transLoc = gl.getUniformLocation(programs.cube.program, "cubeTranslate");
        buffers.cube = createCubeBuffer(); // 生成立方体顶点/颜色缓冲区
    }

    // 初始化正三角形
    programs.triangle.program = initShaderProgram("triangle-vs", "triangle-fs");
    if (programs.triangle.program) {
        programs.triangle.vPos = gl.getAttribLocation(programs.triangle.program, "vPosition");
        programs.triangle.vColor = gl.getAttribLocation(programs.triangle.program, "vColor");
        programs.triangle.transLoc = gl.getUniformLocation(programs.triangle.program, "triTranslate");
        programs.triangle.scaleLoc = gl.getUniformLocation(programs.triangle.program, "triScale");
        buffers.triangle = createTriangleBuffer(); // 生成三角形顶点/颜色缓冲区
    }

    // 初始化正方形
    programs.square.program = initShaderProgram("square-vs", "square-fs");
    if (programs.square.program) {
        programs.square.vPos = gl.getAttribLocation(programs.square.program, "vPosition");
        programs.square.vColor = gl.getAttribLocation(programs.square.program, "vColor");
        programs.square.transLoc = gl.getUniformLocation(programs.square.program, "squareTranslate");
        programs.square.thetaLoc = gl.getUniformLocation(programs.square.program, "squareTheta");
        buffers.square = createSquareBuffer(); // 生成正方形顶点/颜色缓冲区
    }

    // 初始化圆形（动态生成缓冲区）
    programs.circle.program = initShaderProgram("circle-vs", "circle-fs");
    if (programs.circle.program) {
        programs.circle.vPos = gl.getAttribLocation(programs.circle.program, "vPosition");
        programs.circle.vColor = gl.getAttribLocation(programs.circle.program, "vColor");
        programs.circle.transLoc = gl.getUniformLocation(programs.circle.program, "circleTranslate");
        programs.circle.scaleLoc = gl.getUniformLocation(programs.circle.program, "circleScale");
        updateCircleBuffer(); // 初始生成圆形缓冲区
    }

    // WebGL全局配置
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0); // 白色背景
    gl.enable(gl.DEPTH_TEST); // 启用深度测试（3D图形必备）
}

// 步骤2：绑定所有交互事件
function bindEvents() {
    // 选择图形类型
    document.getElementById("cubeBtn").onclick = () => currentShape = "cube";
    document.getElementById("triangleBtn").onclick = () => currentShape = "triangle";
    document.getElementById("squareBtn").onclick = () => currentShape = "square";
    document.getElementById("circleBtn").onclick = () => currentShape = "circle";

    // 清空画布
    document.getElementById("clearBtn").onclick = () => {
        shapes = [];
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    };

    // 点击画布绘制图形
    canvas.addEventListener("click", (e) => {
        if (!currentShape) {
            alert("请先点击上方按钮选择要绘制的图形！");
            return;
        }

        // 将画布坐标转换为WebGL标准化设备坐标（-1~1）
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvas.width * 2 - 1; // X轴：左→右（-1→1）
        const y = -(e.clientY - rect.top) / canvas.height * 2 + 1; // Y轴：上→下（1→-1），翻转后符合WebGL坐标

        // 获取选择的颜色（HEX转RGBA，alpha=1.0）
        const color = hexToRgba(colorPicker.value);

        // 根据当前选择的图形，添加到图形列表
        switch (currentShape) {
            case "cube":
                shapes.push({
                    type: "cube",
                    trans: [x, y],    // 平移位置（点击位置）
                    theta: [0, 0, 0], // 初始旋转角度
                    color: color      // 颜色
                });
                break;
            case "triangle":
                shapes.push({
                    type: "triangle",
                    trans: [x, y],    // 平移位置
                    scale: 0.2,       // 初始缩放（适中大小）
                    color: color
                });
                break;
            case "square":
                shapes.push({
                    type: "square",
                    trans: [x, y],    // 平移位置
                    theta: 0,         // 初始旋转角度（弧度）
                    color: color
                });
                break;
            case "circle":
                shapes.push({
                    type: "circle",
                    trans: [x, y],    // 初始平移位置
                    scale: 0.15,      // 初始缩放（适中大小）
                    color: color,
                    velocity: [
                        (Math.random() - 0.5) * 0.005, // X轴随机速度
                        (Math.random() - 0.5) * 0.005  // Y轴随机速度
                    ]
                });
                break;
        }
    });
}

// 步骤3：动画渲染循环（每帧更新并绘制所有图形）
function render() {
    // 1. 清空画布（颜色+深度缓冲区）
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 2. 遍历所有已绘制的图形，逐个渲染
    shapes.forEach(shape => {
        switch (shape.type) {
            case "cube":
                renderCube(shape);
                break;
            case "triangle":
                renderTriangle(shape);
                break;
            case "square":
                renderSquare(shape);
                break;
            case "circle":
                renderCircle(shape);
                break;
        }
    });

    // 3. 继续下一帧动画
    requestAnimationFrame(render);
}

// 渲染立方体（带旋转动画）
function renderCube(shape) {
    const prog = programs.cube;
    const buf = buffers.cube;

    // 激活着色器程序
    gl.useProgram(prog.program);

    // 1. 更新旋转角度（每帧增加，实现动画）
    shape.theta[0] += 1; // X轴旋转
    shape.theta[1] += 1; // Y轴旋转
    shape.theta[2] += 1; // Z轴旋转
    gl.uniform3fv(prog.thetaLoc, shape.theta);

    // 2. 设置平移位置（点击位置）
    gl.uniform2fv(prog.transLoc, shape.trans);

    // 3. 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.vBuffer);
    gl.vertexAttribPointer(prog.vPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vPos);

    // 4. 绑定颜色缓冲区（使用图形的自定义颜色）
    gl.bindBuffer(gl.ARRAY_BUFFER, createColorBuffer(buf.count, shape.color));
    gl.vertexAttribPointer(prog.vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vColor);

    // 5. 绘制立方体（TRIANGLES模式，36个顶点）
    gl.drawArrays(gl.TRIANGLES, 0, buf.count);
}

// 渲染正三角形（带缩放动画）
function renderTriangle(shape) {
    const prog = programs.triangle;
    const buf = buffers.triangle;

    gl.useProgram(prog.program);

    // 1. 缩放动画（0.1~0.3之间往复）
    const scale = 0.1 + Math.abs(Math.sin(Date.now() * 0.001)) * 0.2;
    shape.scale = scale;
    gl.uniform1f(prog.scaleLoc, shape.scale);

    // 2. 设置平移位置
    gl.uniform2fv(prog.transLoc, shape.trans);

    // 3. 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.vBuffer);
    gl.vertexAttribPointer(prog.vPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vPos);

    // 4. 绑定颜色缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, createColorBuffer(buf.count, shape.color));
    gl.vertexAttribPointer(prog.vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vColor);

    // 5. 绘制三角形
    gl.drawArrays(gl.TRIANGLES, 0, buf.count);
}

// 渲染正方形（带旋转动画）
function renderSquare(shape) {
    const prog = programs.square;
    const buf = buffers.square;

    gl.useProgram(prog.program);

    // 1. 旋转动画（每帧增加角度）
    shape.theta += 0.02;
    gl.uniform1f(prog.thetaLoc, shape.theta);

    // 2. 设置平移位置
    gl.uniform2fv(prog.transLoc, shape.trans);

    // 3. 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.vBuffer);
    gl.vertexAttribPointer(prog.vPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vPos);

    // 4. 绑定颜色缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, createColorBuffer(buf.count, shape.color));
    gl.vertexAttribPointer(prog.vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vColor);

    // 5. 绘制正方形
    gl.drawArrays(gl.TRIANGLES, 0, buf.count);
}

// 渲染圆形（带随机平移动画）
function renderCircle(shape) {
    const prog = programs.circle;
    const buf = buffers.circle;

    gl.useProgram(prog.program);

    // 1. 随机平移逻辑
    shape.trans[0] += shape.velocity[0];
    shape.trans[1] += shape.velocity[1];

    // 边界检测，超出画布后反弹
    if (shape.trans[0] > 1 - shape.scale) {
        shape.trans[0] = 1 - shape.scale;
        shape.velocity[0] = -shape.velocity[0];
    } else if (shape.trans[0] < -1 + shape.scale) {
        shape.trans[0] = -1 + shape.scale;
        shape.velocity[0] = -shape.velocity[0];
    }
    
    if (shape.trans[1] > 1 - shape.scale) {
        shape.trans[1] = 1 - shape.scale;
        shape.velocity[1] = -shape.velocity[1];
    } else if (shape.trans[1] < -1 + shape.scale) {
        shape.trans[1] = -1 + shape.scale;
        shape.velocity[1] = -shape.velocity[1];
    }

    // 2. 设置平移位置
    gl.uniform2fv(prog.transLoc, shape.trans);

    // 3. 设置缩放（固定大小）
    gl.uniform1f(prog.scaleLoc, shape.scale);

    // 4. 绑定顶点缓冲区（动态生成的圆形顶点）
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.vBuffer);
    gl.vertexAttribPointer(prog.vPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vPos);

    // 5. 绑定颜色缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, createColorBuffer(buf.count, shape.color));
    gl.vertexAttribPointer(prog.vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog.vColor);

    // 6. 绘制圆形（TRIANGLE_FAN模式，适合扇形填充）
    gl.drawArrays(gl.TRIANGLE_FAN, 0, buf.count);
}

// ------------------------------
// 工具函数：生成各种图形的缓冲区
// ------------------------------
// 初始化着色器程序（复用函数）
function initShaderProgram(vsId, fsId) {
    const vs = document.getElementById(vsId);
    const fs = document.getElementById(fsId);
    return initShaders(gl, vsId, fsId); // 依赖common/initShaders.js
}

// 生成立方体顶点/颜色缓冲区（6个面，每个面2个三角形）
function createCubeBuffer() {
    // 立方体顶点（中心在原点，边长0.2，避免过大）
    const vertices = [
        // 前面
        -0.1, -0.1, 0.1,  0.1, -0.1, 0.1,  0.1, 0.1, 0.1,
        -0.1, -0.1, 0.1,  0.1, 0.1, 0.1,  -0.1, 0.1, 0.1,
        // 后面
        -0.1, -0.1, -0.1, -0.1, 0.1, -0.1, 0.1, 0.1, -0.1,
        -0.1, -0.1, -0.1,  0.1, 0.1, -0.1, 0.1, -0.1, -0.1,
        // 左面
        -0.1, -0.1, -0.1, -0.1, -0.1, 0.1, -0.1, 0.1, 0.1,
        -0.1, -0.1, -0.1, -0.1, 0.1, 0.1,  -0.1, 0.1, -0.1,
        // 右面
        0.1, -0.1, -0.1,  0.1, 0.1, 0.1,  0.1, -0.1, 0.1,
        0.1, -0.1, -0.1,  0.1, 0.1, -0.1,  0.1, 0.1, 0.1,
        // 上面
        -0.1, 0.1, -0.1,  0.1, 0.1, -0.1,  0.1, 0.1, 0.1,
        -0.1, 0.1, -0.1,  0.1, 0.1, 0.1,  -0.1, 0.1, 0.1,
        // 下面
        -0.1, -0.1, -0.1, -0.1, -0.1, 0.1,  0.1, -0.1, -0.1,
        -0.1, -0.1, 0.1,  0.1, -0.1, 0.1,  0.1, -0.1, -0.1
    ];

    // 创建顶点缓冲区
    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return {
        vBuffer: vBuffer,
        cBuffer: null, // 颜色缓冲区动态生成（用自定义颜色）
        count: vertices.length / 3 // 36个顶点（vertices.length=108）
    };
}

// 生成正三角形顶点缓冲区（中心在原点，边长0.4）
function createTriangleBuffer() {
    const vertices = [
        0.0, 0.2, 0.0,   // 顶部
        -0.2, -0.2, 0.0, // 左下
        0.2, -0.2, 0.0   // 右下
    ];

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return {
        vBuffer: vBuffer,
        cBuffer: null,
        count: 3
    };
}

// 生成正方形顶点缓冲区（中心在原点，边长0.4）
function createSquareBuffer() {
    const vertices = [
        -0.2, -0.2, 0.0,  0.2, -0.2, 0.0,  0.2, 0.2, 0.0, // 右下三角形
        -0.2, -0.2, 0.0,  0.2, 0.2, 0.0,  -0.2, 0.2, 0.0  // 左上三角形
    ];

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return {
        vBuffer: vBuffer,
        cBuffer: null,
        count: 6
    };
}

// 动态生成圆形顶点缓冲区（用TRIANGLE_FAN模式，中心+边缘顶点）
function updateCircleBuffer() {
    const sides = parseInt(circleSides.value);
    const vertices = [0.0, 0.0, 0.0]; // 中心顶点

    // 生成边缘顶点（极坐标转直角坐标）
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        vertices.push(x, y, 0.0);
    }

    // 创建缓冲区
    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    buffers.circle = {
        vBuffer: vBuffer,
        cBuffer: null,
        count: vertices.length / 3 // 中心+边缘顶点数（sides+2）
    };
}

// 生成颜色缓冲区（根据图形顶点数和自定义颜色）
function createColorBuffer(vertexCount, color) {
    const colors = [];
    for (let i = 0; i < vertexCount; i++) {
        colors.push(color.r, color.g, color.b, color.a);
    }

    const cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    return cBuffer;
}

// 工具函数：HEX颜色转RGBA对象（如#ff0000 → {r:1, g:0, b:0, a:1}）
function hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b, a: 1.0 };
}

// https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language
const vertexShaderTxt = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;
    attribute vec3 vertNormal;

    varying vec3 fragColor;
    varying vec3 fragNormal;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main()
    {
        fragColor = vertColor;
        fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }

`

const fragmentShaderTxt = `
    precision mediump float;

    varying vec3 fragColor;
    varying vec3 fragNormal;

    void main()
    {
        vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        vec3 sunIntensity = vec3(0.1, 0.1, 0.1);
        vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.0));

        vec3 lightIntensity = ambientLight + sunIntensity + max(dot(fragNormal, lightDirection), 0.0);

        gl_FragColor = vec4(fragColor * lightIntensity, 1.0);
        // gl_FragColor = vec4(fragColor, 1.0); // R,G,B, opacity
    }
`
const mat4 = glMatrix.mat4;

class World {
    mat4 = glMatrix.mat4;
    #backgroundColor = [0.5, 0.0, 0.3];
    #program;
    #fragmentShader = `
    precision mediump float;

    varying vec3 fragColor;
    varying vec3 fragNormal;

    void main()
    {
        vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        vec3 sunIntensity = vec3(0.1, 0.1, 0.1);
        vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.0));

        vec3 lightIntensity = ambientLight + sunIntensity + max(dot(fragNormal, lightDirection), 0.0);

        gl_FragColor = vec4(fragColor * lightIntensity, 1.0);
        // gl_FragColor = vec4(fragColor, 1.0); // R,G,B, opacity
    }
    `;

    #vertexShader = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;
    attribute vec3 vertNormal;

    varying vec3 fragColor;
    varying vec3 fragNormal;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main()
    {
        fragColor = vertColor;
        fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }

    `;
    #boxVertices =
        [ // X, Y, Z           R, G, B
            // Top
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Left
            -1.0, 1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,

            // Right
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,

            // Front
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,

            // Bottom
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
        ];
    #colors = [
        // R, G, B
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,

        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,

        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,

        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,

        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,

        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
    ];
    #boxIndices =
        [
            // Top
            0, 1, 2,
            0, 2, 3,

            // Left
            5, 4, 6,
            6, 4, 7,

            // Right
            8, 9, 10,
            8, 10, 11,

            // Front
            13, 12, 14,
            15, 14, 12,

            // Back
            16, 17, 18,
            16, 18, 19,

            // Bottom
            21, 20, 22,
            22, 20, 23
        ];
    #gl;
    #matWorldUniformLocation;
    #matViewUniformLocation;
    #matProjUniformLocation;
    #worldMatrix = mat4.create();
    #viewMatrix = mat4.create();
    #projMatrix = mat4.create();
    #rotationMatrix = new Float32Array(16);
    #translationMatrix = new Float32Array(16);
    #angle;


    constructor(id, backgroundColor) {
        let canvas = document.getElementById(id);
        this.#gl = canvas.getContext('webgl');
        this.#program = this.#gl.createProgram();
        this.#angle = 0;

        this.#backgroundColor = backgroundColor;
        if (!this.#gl) {
            alert('webgl not supported');
        }

        this.prepareBackground(this.#backgroundColor);
        this.prepareShaders();
        this.positionAndColor();
        this.#gl.useProgram(this.#program);
        this.initializeWorld(canvas);
        requestAnimationFrame(this.loop);
    }

    // Ten loop nie działa bo nie umiem wymyślić co zrobić żeby działało

    loop = function () {
        return function () {
            this.#angle = performance.now() / 1000 / 8 * 2 * Math.PI;
            this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

            mat4.fromRotation(this.#rotationMatrix, this.#angle, [1, 2, 0]);
            mat4.fromTranslation(this.#translationMatrix, [0, 0, 0]);
            mat4.mul(this.#worldMatrix, this.#translationMatrix, this.#rotationMatrix);
            this.#gl.uniformMatrix4fv(this.#matWorldUniformLocation, this.#gl.FALSE, this.#worldMatrix);
            this.#gl.drawElements(this.#gl.TRIANGLES, this.#boxIndices.length, this.#gl.UNSIGNED_SHORT, 0);
            this.#rotationMatrix = new Float32Array(16);
            this.#translationMatrix = new Float32Array(16);
            requestAnimationFrame(this.loop);
        };
    };

    prepareBackground(bckgrnd) {
        this.#gl.clearColor(...bckgrnd, 1.0);  // R,G,B, opacity
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);
        this.#gl.enable(this.#gl.DEPTH_TEST);
        this.#gl.enable(this.#gl.CULL_FACE);
    }

    set background(backgroundColor) {
        this.#backgroundColor = backgroundColor;
        this.#gl.clearColor(...backgroundColor, 1.0);  // R,G,B, opacity
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);
    }

    set fragmentShader(shaderString) {
        this.#fragmentShader = shaderString;
    }

    set vertexShader(shaderString) {
        this.#vertexShader = shaderString;
    }

    loadShader(type) {
        let shader = null;
        if (type == 'VERTEX') {
            shader = this.#gl.createShader(this.#gl.VERTEX_SHADER);
            this.#gl.shaderSource(shader, this.#vertexShader);
        } else if (type == 'FRAGMENT') {
            shader = this.#gl.createShader(this.#gl.FRAGMENT_SHADER);
            this.#gl.shaderSource(shader, this.#fragmentShader);
        }
        this.#gl.compileShader(shader);
        this.#gl.attachShader(this.#program, shader);
        return shader;
    }

    prepareShaders() {
        let shader1 = this.loadShader('VERTEX');
        let shader2 = this.loadShader('FRAGMENT');
        this.#gl.linkProgram(this.#program);
        this.cleanUp(shader1);
        this.cleanUp(shader2);
        this.#gl.validateProgram(this.#program);
    }

    cleanUp(shader) {
        this.#gl.detachShader(this.#program, shader);
    }

    buffer(object) {
        let bufferObject = this.#gl.createBuffer();
        if (object = this.#boxIndices) {
            this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, bufferObject);
            this.#gl.bufferData(this.#gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object), this.#gl.STATIC_DRAW);
        } else {
            this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, bufferObject);
            this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(object), this.#gl.STATIC_DRAW);
        }
    }

    positionAndColor() {
        let posAttrLocation = this.getLocation('vertPosition');
        let colorAttrLocation = this.getLocation('vertColor');
        this.buffer(this.#boxVertices);
        this.buffer(this.#boxIndices);
        this.buffer(this.#colors);
        this.#gl.enableVertexAttribArray(posAttrLocation);
        this.#gl.enableVertexAttribArray(colorAttrLocation);
    }

    getLocation(type) {
        let attrLocation = this.#gl.getAttribLocation(this.#program, type);
        this.#gl.vertexAttribPointer(
            attrLocation,
            3,
            this.#gl.FLOAT,
            this.#gl.FALSE,
            0,
            0,
        );
        return attrLocation;
    }

    initializeWorld(canvas) {
        this.#matWorldUniformLocation = this.#gl.getUniformLocation(this.#program, "mWorld");
        this.#matViewUniformLocation = this.#gl.getUniformLocation(this.#program, "mView");
        this.#matProjUniformLocation = this.#gl.getUniformLocation(this.#program, "mProj");
        mat4.lookAt(this.#viewMatrix, [0, 0, -10], [0, 0, 0], [0, 1, 0]);
        mat4.perspective(this.#projMatrix, glMatrix.glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 1000.0);
        this.#gl.uniformMatrix4fv(this.#matWorldUniformLocation, this.#gl.FALSE, this.#worldMatrix);
        this.#gl.uniformMatrix4fv(this.#matViewUniformLocation, this.#gl.FALSE, this.#viewMatrix);
        this.#gl.uniformMatrix4fv(this.#matProjUniformLocation, this.#gl.FALSE, this.#projMatrix);
    }

}

const canvas_name = 'main-canvas';
const id = 'main-canvas';
let world = new World(canvas_name, [0.5, 0.0, 0.3]);

let Triangle = function () {
    let canvas = document.getElementById(id);
    let gl = canvas.getContext('webgl');

    if (!gl) {
        alert('webgl not supported');
    }

    gl.clearColor(0.5, 0.5, 0.9, 1.0);  // R,G,B, opacity
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderTxt);
    gl.shaderSource(fragmentShader, fragmentShaderTxt);


    gl.compileShader(vertexShader);
    // shaderCompileErr(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
        return;
    }
    gl.compileShader(fragmentShader);
    // shaderCompileErr(fragmentShader);


    let program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.detachShader(program, vertexShader); //https://www.khronos.org/opengl/wiki/Shader_Compilation#Before_linking
    gl.detachShader(program, fragmentShader);

    gl.validateProgram(program);
    // -1.0 do 1.0
    var boxVertices =
        [ // X, Y, Z           R, G, B
            // Top
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Left
            -1.0, 1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,

            // Right
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,

            // Front
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,

            // Bottom
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -1.0, -1.0,
        ];

    const boxNormals = [
        //top
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        //left
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,

        //right
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //front
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        //back
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,

        // bottom
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
    ];



    let colors = [
        // R, G, B
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,

        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,
        0.75, 0.25, 0.5,

        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,
        0.25, 0.25, 0.75,

        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,
        1.0, 0.0, 0.15,

        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,
        0.0, 1.0, 0.15,

        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
        0.5, 0.5, 1.0,
    ]



    var boxIndices =
        [
            // Top
            0, 1, 2,
            0, 2, 3,

            // Left
            5, 4, 6,
            6, 4, 7,

            // Right
            8, 9, 10,
            8, 10, 11,

            // Front
            13, 12, 14,
            15, 14, 12,

            // Back
            16, 17, 18,
            16, 18, 19,

            // Bottom
            21, 20, 22,
            22, 20, 23
        ];

    const boxVerticesertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVerticesertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxVertices), gl.STATIC_DRAW); // since everything in JS is 64 bit floating point we need to convert to 32 bits



    const cubeIndexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), gl.STATIC_DRAW); // since everything in JS is 64 bit floating point we need to convert to 32 bits

    const posAttrLocation = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        posAttrLocation,
        3,
        gl.FLOAT,
        gl.FALSE,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0,
    );




    const colorAttrLocation = gl.getAttribLocation(program, 'vertColor');
    const color_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
        colorAttrLocation,
        3,
        gl.FLOAT,
        gl.FALSE,
        0,
        0,
    );

    gl.enableVertexAttribArray(posAttrLocation);
    gl.enableVertexAttribArray(colorAttrLocation);

    const normalsBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxNormals), gl.STATIC_DRAW);
    const normalAttrLoc = gl.getAttribLocation(program, 'vertNormal');
    gl.vertexAttribPointer(
        normalAttrLoc,
        3,
        gl.FLOAT,
        gl.TRUE,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0,
    );
    gl.enableVertexAttribArray(normalAttrLoc);



    gl.useProgram(program);

    const matWorldUniformLocation = gl.getUniformLocation(program, "mWorld");
    const matViewUniformLocation = gl.getUniformLocation(program, 'mView');
    const matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

    let worldMatrix = mat4.create();
    let worldMatrix2 = mat4.create();
    let viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, [0, 0, -10], [0, 0, 0], [0, 1, 0]); // vectors are: position of the camera, which way they are looking, which way is up
    let projMatrix = mat4.create();
    mat4.perspective(projMatrix, glMatrix.glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);


    // let identityMatrix = mat4.create(); 
    let rotationMatrix = new Float32Array(16);
    let translationMatrix = new Float32Array(16);
    let angle = 0;
    const loop = function () {
        angle = performance.now() / 1000 / 8 * 2 * Math.PI;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.fromRotation(rotationMatrix, angle, [1, 2, 0]);
        mat4.fromTranslation(translationMatrix, [-2, 0, 0]);
        mat4.mul(worldMatrix, translationMatrix, rotationMatrix);
        gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
        gl.drawElements(gl.TRIANGLES, boxIndices.length, gl.UNSIGNED_SHORT, 0);
        rotationMatrix = new Float32Array(16);
        translationMatrix = new Float32Array(16);

        mat4.fromRotation(rotationMatrix, angle / 2, [1, 2, 0]);
        mat4.fromTranslation(translationMatrix, [2, 0, 0]);
        mat4.mul(worldMatrix2, translationMatrix, rotationMatrix);
        gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix2);
        gl.drawElements(gl.TRIANGLES, boxIndices.length, gl.UNSIGNED_SHORT, 0);

        // gl.drawElements(gl.TRIANGLES, boxIndices.length, gl.UNSIGNED_SHORT, 0);

        // gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix2);

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);



}
/**
 * @author supereggbert / http://www.paulbrunt.co.uk/
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author szimek / https://github.com/szimek/
 */

THREE.OpenGLRenderer = function ( parameters ) {

	console.log( 'THREE.OpenGLRenderer', THREE.REVISION );

	parameters = parameters || {};

	var _canvas = parameters.canvas !== undefined ? parameters.canvas : document.createElement( 'canvas' ),

	_precision = parameters.precision !== undefined ? parameters.precision : 'highp',

	_alpha = parameters.alpha !== undefined ? parameters.alpha : true,
	_premultipliedAlpha = parameters.premultipliedAlpha !== undefined ? parameters.premultipliedAlpha : true,
	_antialias = parameters.antialias !== undefined ? parameters.antialias : false,
	_stencil = parameters.stencil !== undefined ? parameters.stencil : true,
	_preserveDrawingBuffer = parameters.preserveDrawingBuffer !== undefined ? parameters.preserveDrawingBuffer : false,

	_clearColor = new THREE.Color( 0x000000 ),
	_clearAlpha = 0;

	if ( parameters.clearColor !== undefined ) {

		console.warn( 'DEPRECATED: clearColor in OpenGLRenderer constructor parameters is being removed. Use .setClearColor() instead.' );
		_clearColor.setHex( parameters.clearColor );

	}

	if ( parameters.clearAlpha !== undefined ) {

		console.warn( 'DEPRECATED: clearAlpha in OpenGLRenderer constructor parameters is being removed. Use .setClearColor() instead.' );
		_clearAlpha = parameters.clearAlpha;

	}

	// public properties

	domElement = _canvas;
	context = null;
	devicePixelRatio = parameters.devicePixelRatio !== undefined
				? parameters.devicePixelRatio
				: window.devicePixelRatio !== undefined
					? window.devicePixelRatio
					: 1;

	// clearing

	autoClear = true;
	autoClearColor = true;
	autoClearDepth = true;
	autoClearStencil = true;

	// scene graph

	sortObjects = true;
	autoUpdateObjects = true;

	// physically based shading

	gammaInput = false;
	gammaOutput = false;
	physicallyBasedShading = false;

	// shadow map

	shadowMapEnabled = false;
	shadowMapAutoUpdate = true;
	shadowMapType = THREE.PCFShadowMap;
	shadowMapCullFace = THREE.CullFaceFront;
	shadowMapDebug = false;
	shadowMapCascade = false;

	// morphs

	maxMorphTargets = 8;
	maxMorphNormals = 4;

	// flags

	autoScaleCubemaps = true;

	// custom render plugins

	renderPluginsPre = [];
	renderPluginsPost = [];

	// info

	info = {

		memory: {

			programs: 0,
			geometries: 0,
			textures: 0

		},

		render: {

			calls: 0,
			vertices: 0,
			faces: 0,
			points: 0

		}

	};

	// internal properties

	var = 

	_programs = [],
	_programs_counter = 0,

	// internal state cache

	_currentProgram = null,
	_currentFramebuffer = null,
	_currentMaterialId = -1,
	_currentGeometryGroupHash = null,
	_currentCamera = null,
	_geometryGroupCounter = 0,

	_usedTextureUnits = 0,

	// GL state cache

	_oldDoubleSided = -1,
	_oldFlipSided = -1,

	_oldBlending = -1,

	_oldBlendEquation = -1,
	_oldBlendSrc = -1,
	_oldBlendDst = -1,

	_oldDepthTest = -1,
	_oldDepthWrite = -1,

	_oldPolygonOffset = null,
	_oldPolygonOffsetFactor = null,
	_oldPolygonOffsetUnits = null,

	_oldLineWidth = null,

	_viewportX = 0,
	_viewportY = 0,
	_viewportWidth = 0,
	_viewportHeight = 0,
	_currentWidth = 0,
	_currentHeight = 0,

	_enabledAttributes = {},

	// frustum

	_frustum = new THREE.Frustum(),

	 // camera matrices cache

	_projScreenMatrix = new THREE.Matrix4(),
	_projScreenMatrixPS = new THREE.Matrix4(),

	_vector3 = new THREE.Vector3(),

	// light arrays cache

	_direction = new THREE.Vector3(),

	_lightsNeedUpdate = true,

	_lights = {

		ambient: [ 0, 0, 0 ],
		directional: { length: 0, colors: new Array(), positions: new Array() },
		point: { length: 0, colors: new Array(), positions: new Array(), distances: new Array() },
		spot: { length: 0, colors: new Array(), positions: new Array(), distances: new Array(), directions: new Array(), anglesCos: new Array(), exponents: new Array() },
		hemi: { length: 0, skyColors: new Array(), groundColors: new Array(), positions: new Array() }

	};

	// initialize

	var GL;

	var _glExtensionTextureFloat;
	var _glExtensionTextureFloatLinear;
	var _glExtensionStandardDerivatives;
	var _glExtensionTextureFilterAnisotropic;
	var _glExtensionCompressedTextureS3TC;

	initGL();

	setDefaultGLState();

	context = GL;

	// GPU capabilities

	var _maxTextures = GL.getParameter( GL.MAX_TEXTURE_IMAGE_UNITS );
	var _maxVertexTextures = GL.getParameter( GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS );
	var _maxTextureSize = GL.getParameter( GL.MAX_TEXTURE_SIZE );
	var _maxCubemapSize = GL.getParameter( GL.MAX_CUBE_MAP_TEXTURE_SIZE );

	var _maxAnisotropy = _glExtensionTextureFilterAnisotropic ? GL.getParameter( _glExtensionTextureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT ) : 0;

	var _supportsVertexTextures = ( _maxVertexTextures > 0 );
	var _supportsBoneTextures = _supportsVertexTextures && _glExtensionTextureFloat;

	var _compressedTextureFormats = _glExtensionCompressedTextureS3TC ? GL.getParameter( GL.COMPRESSED_TEXTURE_FORMATS ) : [];

	//

	var _vertexShaderPrecisionHighpFloat = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.HIGH_FLOAT );
	var _vertexShaderPrecisionMediumpFloat = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.MEDIUM_FLOAT );
	var _vertexShaderPrecisionLowpFloat = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.LOW_FLOAT );

	var _fragmentShaderPrecisionHighpFloat = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.HIGH_FLOAT );
	var _fragmentShaderPrecisionMediumpFloat = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.MEDIUM_FLOAT );
	var _fragmentShaderPrecisionLowpFloat = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.LOW_FLOAT );

	var _vertexShaderPrecisionHighpInt = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.HIGH_INT );
	var _vertexShaderPrecisionMediumpInt = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.MEDIUM_INT );
	var _vertexShaderPrecisionLowpInt = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.LOW_INT );

	var _fragmentShaderPrecisionHighpInt = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.HIGH_INT );
	var _fragmentShaderPrecisionMediumpInt = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.MEDIUM_INT );
	var _fragmentShaderPrecisionLowpInt = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.LOW_INT );

	// clamp precision to maximum available

	var highpAvailable = _vertexShaderPrecisionHighpFloat.precision > 0 && _fragmentShaderPrecisionHighpFloat.precision > 0;
	var mediumpAvailable = _vertexShaderPrecisionMediumpFloat.precision > 0 && _fragmentShaderPrecisionMediumpFloat.precision > 0;

	if ( _precision === "highp" && ! highpAvailable ) {

		if ( mediumpAvailable ) {

			_precision = "mediump";
			console.warn( "OpenGLRenderer: highp not supported, using mediump" );

		} else {

			_precision = "lowp";
			console.warn( "OpenGLRenderer: highp and mediump not supported, using lowp" );

		}

	}

	if ( _precision === "mediump" && ! mediumpAvailable ) {

		_precision = "lowp";
		console.warn( "OpenGLRenderer: mediump not supported, using lowp" );

	}

	// API

	getContext = function () {

		return GL;

	};

	supportsVertexTextures = function () {

		return _supportsVertexTextures;

	};

	supportsFloatTextures = function () {

		return _glExtensionTextureFloat;

	};

	supportsStandardDerivatives = function () {

		return _glExtensionStandardDerivatives;

	};

	supportsCompressedTextureS3TC = function () {

		return _glExtensionCompressedTextureS3TC;

	};

	getMaxAnisotropy  = function () {

		return _maxAnisotropy;

	};

	getPrecision = function () {

		return _precision;

	};

	setSize = function ( width, height, updateStyle ) {

		_canvas.width = width * devicePixelRatio;
		_canvas.height = height * devicePixelRatio;

		if ( devicePixelRatio !== 1 && updateStyle !== false ) {

			_canvas.style.width = width + 'px';
			_canvas.style.height = height + 'px';

		}

		setViewport( 0, 0, _canvas.width, _canvas.height );

	};

	setViewport = function ( x, y, width, height ) {

		_viewportX = x !== undefined ? x : 0;
		_viewportY = y !== undefined ? y : 0;

		_viewportWidth = width !== undefined ? width : _canvas.width;
		_viewportHeight = height !== undefined ? height : _canvas.height;

		GL.viewport( _viewportX, _viewportY, _viewportWidth, _viewportHeight );

	};

	setScissor = function ( x, y, width, height ) {

		GL.scissor( x, y, width, height );

	};

	enableScissorTest = function ( enable ) {

		enable ? GL.enable( GL.SCISSOR_TEST ) : GL.disable( GL.SCISSOR_TEST );

	};

	// Clearing

	setClearColor = function ( color, alpha ) {

		_clearColor.set( color );
		_clearAlpha = alpha !== undefined ? alpha : 1;

		GL.clearColor( _clearColor.r, _clearColor.g, _clearColor.b, _clearAlpha );

	};

	setClearColorHex = function ( hex, alpha ) {

		console.warn( 'DEPRECATED: .setClearColorHex() is being removed. Use .setClearColor() instead.' );
		setClearColor( hex, alpha );

	};

	getClearColor = function () {

		return _clearColor;

	};

	getClearAlpha = function () {

		return _clearAlpha;

	};

	clear = function ( color, depth, stencil ) {

		var bits = 0;

		if ( color === undefined || color ) bits |= GL.COLOR_BUFFER_BIT;
		if ( depth === undefined || depth ) bits |= GL.DEPTH_BUFFER_BIT;
		if ( stencil === undefined || stencil ) bits |= GL.STENCIL_BUFFER_BIT;

		GL.clear( bits );

	};

	clearTarget = function ( renderTarget, color, depth, stencil ) {

		setRenderTarget( renderTarget );
		clear( color, depth, stencil );

	};

	// Plugins

	addPostPlugin = function ( plugin ) {

		plugin.init( );
		renderPluginsPost.push( plugin );

	};

	addPrePlugin = function ( plugin ) {

		plugin.init( );
		renderPluginsPre.push( plugin );

	};

	// Rendering

	updateShadowMap = function ( scene, camera ) {

		_currentProgram = null;
		_oldBlending = -1;
		_oldDepthTest = -1;
		_oldDepthWrite = -1;
		_currentGeometryGroupHash = -1;
		_currentMaterialId = -1;
		_lightsNeedUpdate = true;
		_oldDoubleSided = -1;
		_oldFlipSided = -1;

		shadowMapPlugin.update( scene, camera );

	};

	// Internal functions

	// Buffer allocation

	function createParticleBuffers ( geometry ) {

		geometry.__gpuVertexBuffer = GL.createBuffer();
		geometry.__gpuColorBuffer = GL.createBuffer();

		info.memory.geometries ++;

	};

	function createLineBuffers ( geometry ) {

		geometry.__gpuVertexBuffer = GL.createBuffer();
		geometry.__gpuColorBuffer = GL.createBuffer();
		geometry.__gpuLineDistanceBuffer = GL.createBuffer();

		info.memory.geometries ++;

	};

	function createRibbonBuffers ( geometry ) {

		geometry.__gpuVertexBuffer = GL.createBuffer();
		geometry.__gpuColorBuffer = GL.createBuffer();
		geometry.__gpuNormalBuffer = GL.createBuffer();

		info.memory.geometries ++;

	};

	function createMeshBuffers ( geometryGroup ) {

		geometryGroup.__gpuVertexBuffer = GL.createBuffer();
		geometryGroup.__gpuNormalBuffer = GL.createBuffer();
		geometryGroup.__gpuTangentBuffer = GL.createBuffer();
		geometryGroup.__gpuColorBuffer = GL.createBuffer();
		geometryGroup.__gpuUVBuffer = GL.createBuffer();
		geometryGroup.__gpuUV2Buffer = GL.createBuffer();

		geometryGroup.__gpuSkinIndicesBuffer = GL.createBuffer();
		geometryGroup.__gpuSkinWeightsBuffer = GL.createBuffer();

		geometryGroup.__gpuFaceBuffer = GL.createBuffer();
		geometryGroup.__gpuLineBuffer = GL.createBuffer();

		var m, ml;

		if ( geometryGroup.numMorphTargets ) {

			geometryGroup.__gpuMorphTargetsBuffers = [];

			for ( m = 0, ml = geometryGroup.numMorphTargets; m < ml; m ++ ) {

				geometryGroup.__gpuMorphTargetsBuffers.push( GL.createBuffer() );

			}

		}

		if ( geometryGroup.numMorphNormals ) {

			geometryGroup.__gpuMorphNormalsBuffers = [];

			for ( m = 0, ml = geometryGroup.numMorphNormals; m < ml; m ++ ) {

				geometryGroup.__gpuMorphNormalsBuffers.push( GL.createBuffer() );

			}

		}

		info.memory.geometries ++;

	};

	// Events

	var onGeometryDispose = function ( event ) {

		var geometry = event.target;

		geometry.removeEventListener( 'dispose', onGeometryDispose );

		deallocateGeometry( geometry );

		info.memory.geometries --;

	};

	var onTextureDispose = function ( event ) {

		var texture = event.target;

		texture.removeEventListener( 'dispose', onTextureDispose );

		deallocateTexture( texture );

		info.memory.textures --;


	};

	var onRenderTargetDispose = function ( event ) {

		var renderTarget = event.target;

		renderTarget.removeEventListener( 'dispose', onRenderTargetDispose );

		deallocateRenderTarget( renderTarget );

		info.memory.textures --;

	};

	var onMaterialDispose = function ( event ) {

		var material = event.target;

		material.removeEventListener( 'dispose', onMaterialDispose );

		deallocateMaterial( material );

	};

	// Buffer deallocation

	var deleteBuffers = function ( geometry ) {

		if ( geometry.__gpuVertexBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuVertexBuffer );
		if ( geometry.__gpuNormalBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuNormalBuffer );
		if ( geometry.__gpuTangentBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuTangentBuffer );
		if ( geometry.__gpuColorBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuColorBuffer );
		if ( geometry.__gpuUVBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuUVBuffer );
		if ( geometry.__gpuUV2Buffer !== undefined ) GL.deleteBuffer( geometry.__gpuUV2Buffer );

		if ( geometry.__gpuSkinIndicesBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuSkinIndicesBuffer );
		if ( geometry.__gpuSkinWeightsBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuSkinWeightsBuffer );

		if ( geometry.__gpuFaceBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuFaceBuffer );
		if ( geometry.__gpuLineBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuLineBuffer );

		if ( geometry.__gpuLineDistanceBuffer !== undefined ) GL.deleteBuffer( geometry.__gpuLineDistanceBuffer );
		// custom attributes

		if ( geometry.__gpuCustomAttributesList !== undefined ) {

			for ( var id in geometry.__gpuCustomAttributesList ) {

				GL.deleteBuffer( geometry.__gpuCustomAttributesList[ id ].buffer );

			}

		}

	};

	var deallocateGeometry = function ( geometry ) {

		geometry.__gpuInit = undefined;

		if ( geometry instanceof THREE.BufferGeometry ) {

			var attributes = geometry.attributes;

			for ( var key in attributes ) {

				if ( attributes[ key ].buffer !== undefined ) {

					GL.deleteBuffer( attributes[ key ].buffer );
		
				}

			}

		} else {

			if ( geometry.geometryGroups !== undefined ) {

				for ( var g in geometry.geometryGroups ) {

					var geometryGroup = geometry.geometryGroups[ g ];

					if ( geometryGroup.numMorphTargets !== undefined ) {

						for ( var m = 0, ml = geometryGroup.numMorphTargets; m < ml; m ++ ) {

							GL.deleteBuffer( geometryGroup.__gpuMorphTargetsBuffers[ m ] );

						}

					}

					if ( geometryGroup.numMorphNormals !== undefined ) {

						for ( var m = 0, ml = geometryGroup.numMorphNormals; m < ml; m ++ ) {

							GL.deleteBuffer( geometryGroup.__gpuMorphNormalsBuffers[ m ] );

						}

					}

					deleteBuffers( geometryGroup );

				}

			}

			deleteBuffers( geometry );

		}

	};

	var deallocateTexture = function ( texture ) {

		if ( texture.image && texture.image.__gpuTextureCube ) {

			// cube texture

			GL.deleteTexture( texture.image.__gpuTextureCube );

		} else {

			// 2D texture

			if ( ! texture.__gpuInit ) return;

			texture.__gpuInit = false;
			GL.deleteTexture( texture.__gpuTexture );

		}

	};

	var deallocateRenderTarget = function ( renderTarget ) {

		if ( !renderTarget || ! renderTarget.__gpuTexture ) return;

		GL.deleteTexture( renderTarget.__gpuTexture );

		if ( renderTarget instanceof THREE.OpenGLRenderTargetCube ) {

			for ( var i = 0; i < 6; i ++ ) {

				GL.deleteFramebuffer( renderTarget.__gpuFramebuffer[ i ] );
				GL.deleteRenderbuffer( renderTarget.__gpuRenderbuffer[ i ] );

			}

		} else {

			GL.deleteFramebuffer( renderTarget.__gpuFramebuffer );
			GL.deleteRenderbuffer( renderTarget.__gpuRenderbuffer );

		}

	};

	var deallocateMaterial = function ( material ) {

		var program = material.program;

		if ( program === undefined ) return;

		material.program = undefined;

		// only deallocate GL program if was the last use of shared program
		// assumed there is only single copy of any program in the _programs list
		// (that's how it's constructed)

		var i, il, programInfo;
		var deleteProgram = false;

		for ( i = 0, il = _programs.length; i < il; i ++ ) {

			programInfo = _programs[ i ];

			if ( programInfo.program === program ) {

				programInfo.usedTimes --;

				if ( programInfo.usedTimes === 0 ) {

					deleteProgram = true;

				}

				break;

			}

		}

		if ( deleteProgram === true ) {

			// avoid using array.splice, is costlier than creating new array from scratch

			var newPrograms = [];

			for ( i = 0, il = _programs.length; i < il; i ++ ) {

				programInfo = _programs[ i ];

				if ( programInfo.program !== program ) {

					newPrograms.push( programInfo );

				}

			}

			_programs = newPrograms;

			GL.deleteProgram( program );

			info.memory.programs --;

		}

	};

	// Buffer initialization

	function initCustomAttributes ( geometry, object ) {

		var nvertices = geometry.vertices.length;

		var material = object.material;

		if ( material.attributes ) {

			if ( geometry.__gpuCustomAttributesList === undefined ) {

				geometry.__gpuCustomAttributesList = [];

			}

			for ( var a in material.attributes ) {

				var attribute = material.attributes[ a ];

				if ( !attribute.__gpuInitialized || attribute.createUniqueBuffers ) {

					attribute.__gpuInitialized = true;

					var size = 1;		// "f" and "i"

					if ( attribute.type === "v2" ) size = 2;
					else if ( attribute.type === "v3" ) size = 3;
					else if ( attribute.type === "v4" ) size = 4;
					else if ( attribute.type === "c"  ) size = 3;

					attribute.size = size;

					attribute.array = new Float32Array( nvertices * size );

					attribute.buffer = GL.createBuffer();
					attribute.buffer.belongsToAttribute = a;

					attribute.needsUpdate = true;

				}

				geometry.__gpuCustomAttributesList.push( attribute );

			}

		}

	};

	function initParticleBuffers ( geometry, object ) {

		var nvertices = geometry.vertices.length;

		geometry.__vertexArray = new Float32Array( nvertices * 3 );
		geometry.__colorArray = new Float32Array( nvertices * 3 );

		geometry.__sortArray = [];

		geometry.__gpuParticleCount = nvertices;

		initCustomAttributes ( geometry, object );

	};

	function initLineBuffers ( geometry, object ) {

		var nvertices = geometry.vertices.length;

		geometry.__vertexArray = new Float32Array( nvertices * 3 );
		geometry.__colorArray = new Float32Array( nvertices * 3 );
		geometry.__lineDistanceArray = new Float32Array( nvertices * 1 );

		geometry.__gpuLineCount = nvertices;

		initCustomAttributes ( geometry, object );

	};

	function initRibbonBuffers ( geometry, object ) {

		var nvertices = geometry.vertices.length;

		geometry.__vertexArray = new Float32Array( nvertices * 3 );
		geometry.__colorArray = new Float32Array( nvertices * 3 );
		geometry.__normalArray = new Float32Array( nvertices * 3 );

		geometry.__gpuVertexCount = nvertices;

		initCustomAttributes ( geometry, object );

	};

	function initMeshBuffers ( geometryGroup, object ) {

		var geometry = object.geometry,
			faces3 = geometryGroup.faces3,
			faces4 = geometryGroup.faces4,

			nvertices = faces3.length * 3 + faces4.length * 4,
			ntris     = faces3.length * 1 + faces4.length * 2,
			nlines    = faces3.length * 3 + faces4.length * 4,

			material = getBufferMaterial( object, geometryGroup ),

			uvType = bufferGuessUVType( material ),
			normalType = bufferGuessNormalType( material ),
			vertexColorType = bufferGuessVertexColorType( material );

		// console.log( "uvType", uvType, "normalType", normalType, "vertexColorType", vertexColorType, object, geometryGroup, material );

		geometryGroup.__vertexArray = new Float32Array( nvertices * 3 );

		if ( normalType ) {

			geometryGroup.__normalArray = new Float32Array( nvertices * 3 );

		}

		if ( geometry.hasTangents ) {

			geometryGroup.__tangentArray = new Float32Array( nvertices * 4 );

		}

		if ( vertexColorType ) {

			geometryGroup.__colorArray = new Float32Array( nvertices * 3 );

		}

		if ( uvType ) {

			if ( geometry.faceUvs.length > 0 || geometry.faceVertexUvs.length > 0 ) {

				geometryGroup.__uvArray = new Float32Array( nvertices * 2 );

			}

			if ( geometry.faceUvs.length > 1 || geometry.faceVertexUvs.length > 1 ) {

				geometryGroup.__uv2Array = new Float32Array( nvertices * 2 );

			}

		}

		if ( object.geometry.skinWeights.length && object.geometry.skinIndices.length ) {

			geometryGroup.__skinIndexArray = new Float32Array( nvertices * 4 );
			geometryGroup.__skinWeightArray = new Float32Array( nvertices * 4 );

		}

		geometryGroup.__faceArray = new Uint16Array( ntris * 3 );
		geometryGroup.__lineArray = new Uint16Array( nlines * 2 );

		var m, ml;

		if ( geometryGroup.numMorphTargets ) {

			geometryGroup.__morphTargetsArrays = [];

			for ( m = 0, ml = geometryGroup.numMorphTargets; m < ml; m ++ ) {

				geometryGroup.__morphTargetsArrays.push( new Float32Array( nvertices * 3 ) );

			}

		}

		if ( geometryGroup.numMorphNormals ) {

			geometryGroup.__morphNormalsArrays = [];

			for ( m = 0, ml = geometryGroup.numMorphNormals; m < ml; m ++ ) {

				geometryGroup.__morphNormalsArrays.push( new Float32Array( nvertices * 3 ) );

			}

		}

		geometryGroup.__gpuFaceCount = ntris * 3;
		geometryGroup.__gpuLineCount = nlines * 2;


		// custom attributes

		if ( material.attributes ) {

			if ( geometryGroup.__gpuCustomAttributesList === undefined ) {

				geometryGroup.__gpuCustomAttributesList = [];

			}

			for ( var a in material.attributes ) {

				// Do a shallow copy of the attribute object so different geometryGroup chunks use different
				// attribute buffers which are correctly indexed in the setMeshBuffers function

				var originalAttribute = material.attributes[ a ];

				var attribute = {};

				for ( var property in originalAttribute ) {

					attribute[ property ] = originalAttribute[ property ];

				}

				if ( !attribute.__gpuInitialized || attribute.createUniqueBuffers ) {

					attribute.__gpuInitialized = true;

					var size = 1;		// "f" and "i"

					if( attribute.type === "v2" ) size = 2;
					else if( attribute.type === "v3" ) size = 3;
					else if( attribute.type === "v4" ) size = 4;
					else if( attribute.type === "c"  ) size = 3;

					attribute.size = size;

					attribute.array = new Float32Array( nvertices * size );

					attribute.buffer = GL.createBuffer();
					attribute.buffer.belongsToAttribute = a;

					originalAttribute.needsUpdate = true;
					attribute.__original = originalAttribute;

				}

				geometryGroup.__gpuCustomAttributesList.push( attribute );

			}

		}

		geometryGroup.__inittedArrays = true;

	};

	function getBufferMaterial( object, geometryGroup ) {

		return object.material instanceof THREE.MeshFaceMaterial
			? object.material.materials[ geometryGroup.materialIndex ]
			: object.material;

	};

	function materialNeedsSmoothNormals ( material ) {

		return material && material.shading !== undefined && material.shading === THREE.SmoothShading;

	};

	function bufferGuessNormalType ( material ) {

		// only MeshBasicMaterial and MeshDepthMaterial don't need normals

		if ( ( material instanceof THREE.MeshBasicMaterial && !material.envMap ) || material instanceof THREE.MeshDepthMaterial ) {

			return false;

		}

		if ( materialNeedsSmoothNormals( material ) ) {

			return THREE.SmoothShading;

		} else {

			return THREE.FlatShading;

		}

	};

	function bufferGuessVertexColorType( material ) {

		if ( material.vertexColors ) {

			return material.vertexColors;

		}

		return false;

	};

	function bufferGuessUVType( material ) {

		// material must use some texture to require uvs

		if ( material.map ||
		     material.lightMap ||
		     material.bumpMap ||
		     material.normalMap ||
		     material.specularMap ||
		     material instanceof THREE.ShaderMaterial ) {

			return true;

		}

		return false;

	};

	//

	function initDirectBuffers( geometry ) {

		var a, attribute, type;

		for ( a in geometry.attributes ) {

			if ( a === "index" ) {

				type = GL.ELEMENT_ARRAY_BUFFER;

			} else {

				type = GL.ARRAY_BUFFER;

			}

			attribute = geometry.attributes[ a ];

			if ( attribute.numItems === undefined ) {

				attribute.numItems = attribute.array.length;

			}

			attribute.buffer = GL.createBuffer();

			GL.bindBuffer( type, attribute.buffer );
			GL.bufferData( type, attribute.array, GL.STATIC_DRAW );

		}

	};

	// Buffer setting

	function setParticleBuffers ( geometry, hint, object ) {

		var v, c, vertex, offset, index, color,

		vertices = geometry.vertices,
		vl = vertices.length,

		colors = geometry.colors,
		cl = colors.length,

		vertexArray = geometry.__vertexArray,
		colorArray = geometry.__colorArray,

		sortArray = geometry.__sortArray,

		dirtyVertices = geometry.verticesNeedUpdate,
		dirtyElements = geometry.elementsNeedUpdate,
		dirtyColors = geometry.colorsNeedUpdate,

		customAttributes = geometry.__gpuCustomAttributesList,
		i, il,
		a, ca, cal, value,
		customAttribute;

		if ( object.sortParticles ) {

			_projScreenMatrixPS.copy( _projScreenMatrix );
			_projScreenMatrixPS.multiply( object.matrixWorld );

			for ( v = 0; v < vl; v ++ ) {

				vertex = vertices[ v ];

				_vector3.copy( vertex );
				_vector3.applyProjection( _projScreenMatrixPS );

				sortArray[ v ] = [ _vector3.z, v ];

			}

			sortArray.sort( numericalSort );

			for ( v = 0; v < vl; v ++ ) {

				vertex = vertices[ sortArray[v][1] ];

				offset = v * 3;

				vertexArray[ offset ]     = vertex.x;
				vertexArray[ offset + 1 ] = vertex.y;
				vertexArray[ offset + 2 ] = vertex.z;

			}

			for ( c = 0; c < cl; c ++ ) {

				offset = c * 3;

				color = colors[ sortArray[c][1] ];

				colorArray[ offset ]     = color.r;
				colorArray[ offset + 1 ] = color.g;
				colorArray[ offset + 2 ] = color.b;

			}

			if ( customAttributes ) {

				for ( i = 0, il = customAttributes.length; i < il; i ++ ) {

					customAttribute = customAttributes[ i ];

					if ( ! ( customAttribute.boundTo === undefined || customAttribute.boundTo === "vertices" ) ) continue;

					offset = 0;

					cal = customAttribute.value.length;

					if ( customAttribute.size === 1 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							index = sortArray[ ca ][ 1 ];

							customAttribute.array[ ca ] = customAttribute.value[ index ];

						}

					} else if ( customAttribute.size === 2 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							index = sortArray[ ca ][ 1 ];

							value = customAttribute.value[ index ];

							customAttribute.array[ offset ] 	= value.x;
							customAttribute.array[ offset + 1 ] = value.y;

							offset += 2;

						}

					} else if ( customAttribute.size === 3 ) {

						if ( customAttribute.type === "c" ) {

							for ( ca = 0; ca < cal; ca ++ ) {

								index = sortArray[ ca ][ 1 ];

								value = customAttribute.value[ index ];

								customAttribute.array[ offset ]     = value.r;
								customAttribute.array[ offset + 1 ] = value.g;
								customAttribute.array[ offset + 2 ] = value.b;

								offset += 3;

							}

						} else {

							for ( ca = 0; ca < cal; ca ++ ) {

								index = sortArray[ ca ][ 1 ];

								value = customAttribute.value[ index ];

								customAttribute.array[ offset ] 	= value.x;
								customAttribute.array[ offset + 1 ] = value.y;
								customAttribute.array[ offset + 2 ] = value.z;

								offset += 3;

							}

						}

					} else if ( customAttribute.size === 4 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							index = sortArray[ ca ][ 1 ];

							value = customAttribute.value[ index ];

							customAttribute.array[ offset ]      = value.x;
							customAttribute.array[ offset + 1  ] = value.y;
							customAttribute.array[ offset + 2  ] = value.z;
							customAttribute.array[ offset + 3  ] = value.w;

							offset += 4;

						}

					}

				}

			}

		} else {

			if ( dirtyVertices ) {

				for ( v = 0; v < vl; v ++ ) {

					vertex = vertices[ v ];

					offset = v * 3;

					vertexArray[ offset ]     = vertex.x;
					vertexArray[ offset + 1 ] = vertex.y;
					vertexArray[ offset + 2 ] = vertex.z;

				}

			}

			if ( dirtyColors ) {

				for ( c = 0; c < cl; c ++ ) {

					color = colors[ c ];

					offset = c * 3;

					colorArray[ offset ]     = color.r;
					colorArray[ offset + 1 ] = color.g;
					colorArray[ offset + 2 ] = color.b;

				}

			}

			if ( customAttributes ) {

				for ( i = 0, il = customAttributes.length; i < il; i ++ ) {

					customAttribute = customAttributes[ i ];

					if ( customAttribute.needsUpdate &&
						 ( customAttribute.boundTo === undefined ||
						   customAttribute.boundTo === "vertices") ) {

						cal = customAttribute.value.length;

						offset = 0;

						if ( customAttribute.size === 1 ) {

							for ( ca = 0; ca < cal; ca ++ ) {

								customAttribute.array[ ca ] = customAttribute.value[ ca ];

							}

						} else if ( customAttribute.size === 2 ) {

							for ( ca = 0; ca < cal; ca ++ ) {

								value = customAttribute.value[ ca ];

								customAttribute.array[ offset ] 	= value.x;
								customAttribute.array[ offset + 1 ] = value.y;

								offset += 2;

							}

						} else if ( customAttribute.size === 3 ) {

							if ( customAttribute.type === "c" ) {

								for ( ca = 0; ca < cal; ca ++ ) {

									value = customAttribute.value[ ca ];

									customAttribute.array[ offset ] 	= value.r;
									customAttribute.array[ offset + 1 ] = value.g;
									customAttribute.array[ offset + 2 ] = value.b;

									offset += 3;

								}

							} else {

								for ( ca = 0; ca < cal; ca ++ ) {

									value = customAttribute.value[ ca ];

									customAttribute.array[ offset ] 	= value.x;
									customAttribute.array[ offset + 1 ] = value.y;
									customAttribute.array[ offset + 2 ] = value.z;

									offset += 3;

								}

							}

						} else if ( customAttribute.size === 4 ) {

							for ( ca = 0; ca < cal; ca ++ ) {

								value = customAttribute.value[ ca ];

								customAttribute.array[ offset ]      = value.x;
								customAttribute.array[ offset + 1  ] = value.y;
								customAttribute.array[ offset + 2  ] = value.z;
								customAttribute.array[ offset + 3  ] = value.w;

								offset += 4;

							}

						}

					}

				}

			}

		}

		if ( dirtyVertices || object.sortParticles ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuVertexBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, vertexArray, hint );

		}

		if ( dirtyColors || object.sortParticles ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuColorBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, colorArray, hint );

		}

		if ( customAttributes ) {

			for ( i = 0, il = customAttributes.length; i < il; i ++ ) {

				customAttribute = customAttributes[ i ];

				if ( customAttribute.needsUpdate || object.sortParticles ) {

					GL.bindBuffer( GL.ARRAY_BUFFER, customAttribute.buffer );
					GL.bufferData( GL.ARRAY_BUFFER, customAttribute.array, hint );

				}

			}

		}


	};

	function setLineBuffers ( geometry, hint ) {

		var v, c, d, vertex, offset, color,

		vertices = geometry.vertices,
		colors = geometry.colors,
		lineDistances = geometry.lineDistances,

		vl = vertices.length,
		cl = colors.length,
		dl = lineDistances.length,

		vertexArray = geometry.__vertexArray,
		colorArray = geometry.__colorArray,
		lineDistanceArray = geometry.__lineDistanceArray,

		dirtyVertices = geometry.verticesNeedUpdate,
		dirtyColors = geometry.colorsNeedUpdate,
		dirtyLineDistances = geometry.lineDistancesNeedUpdate,

		customAttributes = geometry.__gpuCustomAttributesList,

		i, il,
		a, ca, cal, value,
		customAttribute;

		if ( dirtyVertices ) {

			for ( v = 0; v < vl; v ++ ) {

				vertex = vertices[ v ];

				offset = v * 3;

				vertexArray[ offset ]     = vertex.x;
				vertexArray[ offset + 1 ] = vertex.y;
				vertexArray[ offset + 2 ] = vertex.z;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuVertexBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, vertexArray, hint );

		}

		if ( dirtyColors ) {

			for ( c = 0; c < cl; c ++ ) {

				color = colors[ c ];

				offset = c * 3;

				colorArray[ offset ]     = color.r;
				colorArray[ offset + 1 ] = color.g;
				colorArray[ offset + 2 ] = color.b;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuColorBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, colorArray, hint );

		}

		if ( dirtyLineDistances ) {

			for ( d = 0; d < dl; d ++ ) {

				lineDistanceArray[ d ] = lineDistances[ d ];

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuLineDistanceBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, lineDistanceArray, hint );

		}

		if ( customAttributes ) {

			for ( i = 0, il = customAttributes.length; i < il; i ++ ) {

				customAttribute = customAttributes[ i ];

				if ( customAttribute.needsUpdate &&
					 ( customAttribute.boundTo === undefined ||
					   customAttribute.boundTo === "vertices" ) ) {

					offset = 0;

					cal = customAttribute.value.length;

					if ( customAttribute.size === 1 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							customAttribute.array[ ca ] = customAttribute.value[ ca ];

						}

					} else if ( customAttribute.size === 2 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							value = customAttribute.value[ ca ];

							customAttribute.array[ offset ] 	= value.x;
							customAttribute.array[ offset + 1 ] = value.y;

							offset += 2;

						}

					} else if ( customAttribute.size === 3 ) {

						if ( customAttribute.type === "c" ) {

							for ( ca = 0; ca < cal; ca ++ ) {

								value = customAttribute.value[ ca ];

								customAttribute.array[ offset ] 	= value.r;
								customAttribute.array[ offset + 1 ] = value.g;
								customAttribute.array[ offset + 2 ] = value.b;

								offset += 3;

							}

						} else {

							for ( ca = 0; ca < cal; ca ++ ) {

								value = customAttribute.value[ ca ];

								customAttribute.array[ offset ] 	= value.x;
								customAttribute.array[ offset + 1 ] = value.y;
								customAttribute.array[ offset + 2 ] = value.z;

								offset += 3;

							}

						}

					} else if ( customAttribute.size === 4 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							value = customAttribute.value[ ca ];

							customAttribute.array[ offset ] 	 = value.x;
							customAttribute.array[ offset + 1  ] = value.y;
							customAttribute.array[ offset + 2  ] = value.z;
							customAttribute.array[ offset + 3  ] = value.w;

							offset += 4;

						}

					}

					GL.bindBuffer( GL.ARRAY_BUFFER, customAttribute.buffer );
					GL.bufferData( GL.ARRAY_BUFFER, customAttribute.array, hint );

				}

			}

		}

	};

	function setRibbonBuffers ( geometry, hint ) {

		var v, c, n, vertex, offset, color, normal,

		i, il, ca, cal, customAttribute, value,

		vertices = geometry.vertices,
		colors = geometry.colors,
		normals = geometry.normals,

		vl = vertices.length,
		cl = colors.length,
		nl = normals.length,

		vertexArray = geometry.__vertexArray,
		colorArray = geometry.__colorArray,
		normalArray = geometry.__normalArray,

		dirtyVertices = geometry.verticesNeedUpdate,
		dirtyColors = geometry.colorsNeedUpdate,
		dirtyNormals = geometry.normalsNeedUpdate,

		customAttributes = geometry.__gpuCustomAttributesList;

		if ( dirtyVertices ) {

			for ( v = 0; v < vl; v ++ ) {

				vertex = vertices[ v ];

				offset = v * 3;

				vertexArray[ offset ]     = vertex.x;
				vertexArray[ offset + 1 ] = vertex.y;
				vertexArray[ offset + 2 ] = vertex.z;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuVertexBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, vertexArray, hint );

		}

		if ( dirtyColors ) {

			for ( c = 0; c < cl; c ++ ) {

				color = colors[ c ];

				offset = c * 3;

				colorArray[ offset ]     = color.r;
				colorArray[ offset + 1 ] = color.g;
				colorArray[ offset + 2 ] = color.b;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuColorBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, colorArray, hint );

		}

		if ( dirtyNormals ) {

			for ( n = 0; n < nl; n ++ ) {

				normal = normals[ n ];

				offset = n * 3;

				normalArray[ offset ]     = normal.x;
				normalArray[ offset + 1 ] = normal.y;
				normalArray[ offset + 2 ] = normal.z;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometry.__gpuNormalBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, normalArray, hint );

		}

		if ( customAttributes ) {

			for ( i = 0, il = customAttributes.length; i < il; i ++ ) {

				customAttribute = customAttributes[ i ];

				if ( customAttribute.needsUpdate &&
					 ( customAttribute.boundTo === undefined ||
					   customAttribute.boundTo === "vertices" ) ) {

					offset = 0;

					cal = customAttribute.value.length;

					if ( customAttribute.size === 1 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							customAttribute.array[ ca ] = customAttribute.value[ ca ];

						}

					} else if ( customAttribute.size === 2 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							value = customAttribute.value[ ca ];

							customAttribute.array[ offset ] 	= value.x;
							customAttribute.array[ offset + 1 ] = value.y;

							offset += 2;

						}

					} else if ( customAttribute.size === 3 ) {

						if ( customAttribute.type === "c" ) {

							for ( ca = 0; ca < cal; ca ++ ) {

								value = customAttribute.value[ ca ];

								customAttribute.array[ offset ] 	= value.r;
								customAttribute.array[ offset + 1 ] = value.g;
								customAttribute.array[ offset + 2 ] = value.b;

								offset += 3;

							}

						} else {

							for ( ca = 0; ca < cal; ca ++ ) {

								value = customAttribute.value[ ca ];

								customAttribute.array[ offset ] 	= value.x;
								customAttribute.array[ offset + 1 ] = value.y;
								customAttribute.array[ offset + 2 ] = value.z;

								offset += 3;

							}

						}

					} else if ( customAttribute.size === 4 ) {

						for ( ca = 0; ca < cal; ca ++ ) {

							value = customAttribute.value[ ca ];

							customAttribute.array[ offset ] 	 = value.x;
							customAttribute.array[ offset + 1  ] = value.y;
							customAttribute.array[ offset + 2  ] = value.z;
							customAttribute.array[ offset + 3  ] = value.w;

							offset += 4;

						}

					}

					GL.bindBuffer( GL.ARRAY_BUFFER, customAttribute.buffer );
					GL.bufferData( GL.ARRAY_BUFFER, customAttribute.array, hint );

				}

			}

		}

	};

	function setMeshBuffers( geometryGroup, object, hint, dispose, material ) {

		if ( ! geometryGroup.__inittedArrays ) {

			return;

		}

		var normalType = bufferGuessNormalType( material ),
		vertexColorType = bufferGuessVertexColorType( material ),
		uvType = bufferGuessUVType( material ),

		needsSmoothNormals = ( normalType === THREE.SmoothShading );

		var f, fl, fi, face,
		vertexNormals, faceNormal, normal,
		vertexColors, faceColor,
		vertexTangents,
		uv, uv2, v1, v2, v3, v4, t1, t2, t3, t4, n1, n2, n3, n4,
		c1, c2, c3, c4,
		sw1, sw2, sw3, sw4,
		si1, si2, si3, si4,
		sa1, sa2, sa3, sa4,
		sb1, sb2, sb3, sb4,
		m, ml, i, il,
		vn, uvi, uv2i,
		vk, vkl, vka,
		nka, chf, faceVertexNormals,
		a,

		vertexIndex = 0,

		offset = 0,
		offset_uv = 0,
		offset_uv2 = 0,
		offset_face = 0,
		offset_normal = 0,
		offset_tangent = 0,
		offset_line = 0,
		offset_color = 0,
		offset_skin = 0,
		offset_morphTarget = 0,
		offset_custom = 0,
		offset_customSrc = 0,

		value,

		vertexArray = geometryGroup.__vertexArray,
		uvArray = geometryGroup.__uvArray,
		uv2Array = geometryGroup.__uv2Array,
		normalArray = geometryGroup.__normalArray,
		tangentArray = geometryGroup.__tangentArray,
		colorArray = geometryGroup.__colorArray,

		skinIndexArray = geometryGroup.__skinIndexArray,
		skinWeightArray = geometryGroup.__skinWeightArray,

		morphTargetsArrays = geometryGroup.__morphTargetsArrays,
		morphNormalsArrays = geometryGroup.__morphNormalsArrays,

		customAttributes = geometryGroup.__gpuCustomAttributesList,
		customAttribute,

		faceArray = geometryGroup.__faceArray,
		lineArray = geometryGroup.__lineArray,

		geometry = object.geometry, // is shared for all chunks

		dirtyVertices = geometry.verticesNeedUpdate,
		dirtyElements = geometry.elementsNeedUpdate,
		dirtyUvs = geometry.uvsNeedUpdate,
		dirtyNormals = geometry.normalsNeedUpdate,
		dirtyTangents = geometry.tangentsNeedUpdate,
		dirtyColors = geometry.colorsNeedUpdate,
		dirtyMorphTargets = geometry.morphTargetsNeedUpdate,

		vertices = geometry.vertices,
		chunk_faces3 = geometryGroup.faces3,
		chunk_faces4 = geometryGroup.faces4,
		obj_faces = geometry.faces,

		obj_uvs  = geometry.faceVertexUvs[ 0 ],
		obj_uvs2 = geometry.faceVertexUvs[ 1 ],

		obj_colors = geometry.colors,

		obj_skinIndices = geometry.skinIndices,
		obj_skinWeights = geometry.skinWeights,

		morphTargets = geometry.morphTargets,
		morphNormals = geometry.morphNormals;

		if ( dirtyVertices ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces3[ f ] ];

				v1 = vertices[ face.a ];
				v2 = vertices[ face.b ];
				v3 = vertices[ face.c ];

				vertexArray[ offset ]     = v1.x;
				vertexArray[ offset + 1 ] = v1.y;
				vertexArray[ offset + 2 ] = v1.z;

				vertexArray[ offset + 3 ] = v2.x;
				vertexArray[ offset + 4 ] = v2.y;
				vertexArray[ offset + 5 ] = v2.z;

				vertexArray[ offset + 6 ] = v3.x;
				vertexArray[ offset + 7 ] = v3.y;
				vertexArray[ offset + 8 ] = v3.z;

				offset += 9;

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces4[ f ] ];

				v1 = vertices[ face.a ];
				v2 = vertices[ face.b ];
				v3 = vertices[ face.c ];
				v4 = vertices[ face.d ];

				vertexArray[ offset ]     = v1.x;
				vertexArray[ offset + 1 ] = v1.y;
				vertexArray[ offset + 2 ] = v1.z;

				vertexArray[ offset + 3 ] = v2.x;
				vertexArray[ offset + 4 ] = v2.y;
				vertexArray[ offset + 5 ] = v2.z;

				vertexArray[ offset + 6 ] = v3.x;
				vertexArray[ offset + 7 ] = v3.y;
				vertexArray[ offset + 8 ] = v3.z;

				vertexArray[ offset + 9 ]  = v4.x;
				vertexArray[ offset + 10 ] = v4.y;
				vertexArray[ offset + 11 ] = v4.z;

				offset += 12;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuVertexBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, vertexArray, hint );

		}

		if ( dirtyMorphTargets ) {

			for ( vk = 0, vkl = morphTargets.length; vk < vkl; vk ++ ) {

				offset_morphTarget = 0;

				for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

					chf = chunk_faces3[ f ];
					face = obj_faces[ chf ];

					// morph positions

					v1 = morphTargets[ vk ].vertices[ face.a ];
					v2 = morphTargets[ vk ].vertices[ face.b ];
					v3 = morphTargets[ vk ].vertices[ face.c ];

					vka = morphTargetsArrays[ vk ];

					vka[ offset_morphTarget ] 	  = v1.x;
					vka[ offset_morphTarget + 1 ] = v1.y;
					vka[ offset_morphTarget + 2 ] = v1.z;

					vka[ offset_morphTarget + 3 ] = v2.x;
					vka[ offset_morphTarget + 4 ] = v2.y;
					vka[ offset_morphTarget + 5 ] = v2.z;

					vka[ offset_morphTarget + 6 ] = v3.x;
					vka[ offset_morphTarget + 7 ] = v3.y;
					vka[ offset_morphTarget + 8 ] = v3.z;

					// morph normals

					if ( material.morphNormals ) {

						if ( needsSmoothNormals ) {

							faceVertexNormals = morphNormals[ vk ].vertexNormals[ chf ];

							n1 = faceVertexNormals.a;
							n2 = faceVertexNormals.b;
							n3 = faceVertexNormals.c;

						} else {

							n1 = morphNormals[ vk ].faceNormals[ chf ];
							n2 = n1;
							n3 = n1;

						}

						nka = morphNormalsArrays[ vk ];

						nka[ offset_morphTarget ] 	  = n1.x;
						nka[ offset_morphTarget + 1 ] = n1.y;
						nka[ offset_morphTarget + 2 ] = n1.z;

						nka[ offset_morphTarget + 3 ] = n2.x;
						nka[ offset_morphTarget + 4 ] = n2.y;
						nka[ offset_morphTarget + 5 ] = n2.z;

						nka[ offset_morphTarget + 6 ] = n3.x;
						nka[ offset_morphTarget + 7 ] = n3.y;
						nka[ offset_morphTarget + 8 ] = n3.z;

					}

					//

					offset_morphTarget += 9;

				}

				for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

					chf = chunk_faces4[ f ];
					face = obj_faces[ chf ];

					// morph positions

					v1 = morphTargets[ vk ].vertices[ face.a ];
					v2 = morphTargets[ vk ].vertices[ face.b ];
					v3 = morphTargets[ vk ].vertices[ face.c ];
					v4 = morphTargets[ vk ].vertices[ face.d ];

					vka = morphTargetsArrays[ vk ];

					vka[ offset_morphTarget ] 	  = v1.x;
					vka[ offset_morphTarget + 1 ] = v1.y;
					vka[ offset_morphTarget + 2 ] = v1.z;

					vka[ offset_morphTarget + 3 ] = v2.x;
					vka[ offset_morphTarget + 4 ] = v2.y;
					vka[ offset_morphTarget + 5 ] = v2.z;

					vka[ offset_morphTarget + 6 ] = v3.x;
					vka[ offset_morphTarget + 7 ] = v3.y;
					vka[ offset_morphTarget + 8 ] = v3.z;

					vka[ offset_morphTarget + 9 ]  = v4.x;
					vka[ offset_morphTarget + 10 ] = v4.y;
					vka[ offset_morphTarget + 11 ] = v4.z;

					// morph normals

					if ( material.morphNormals ) {

						if ( needsSmoothNormals ) {

							faceVertexNormals = morphNormals[ vk ].vertexNormals[ chf ];

							n1 = faceVertexNormals.a;
							n2 = faceVertexNormals.b;
							n3 = faceVertexNormals.c;
							n4 = faceVertexNormals.d;

						} else {

							n1 = morphNormals[ vk ].faceNormals[ chf ];
							n2 = n1;
							n3 = n1;
							n4 = n1;

						}

						nka = morphNormalsArrays[ vk ];

						nka[ offset_morphTarget ] 	  = n1.x;
						nka[ offset_morphTarget + 1 ] = n1.y;
						nka[ offset_morphTarget + 2 ] = n1.z;

						nka[ offset_morphTarget + 3 ] = n2.x;
						nka[ offset_morphTarget + 4 ] = n2.y;
						nka[ offset_morphTarget + 5 ] = n2.z;

						nka[ offset_morphTarget + 6 ] = n3.x;
						nka[ offset_morphTarget + 7 ] = n3.y;
						nka[ offset_morphTarget + 8 ] = n3.z;

						nka[ offset_morphTarget + 9 ]  = n4.x;
						nka[ offset_morphTarget + 10 ] = n4.y;
						nka[ offset_morphTarget + 11 ] = n4.z;

					}

					//

					offset_morphTarget += 12;

				}

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphTargetsBuffers[ vk ] );
				GL.bufferData( GL.ARRAY_BUFFER, morphTargetsArrays[ vk ], hint );

				if ( material.morphNormals ) {

					GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphNormalsBuffers[ vk ] );
					GL.bufferData( GL.ARRAY_BUFFER, morphNormalsArrays[ vk ], hint );

				}

			}

		}

		if ( obj_skinWeights.length ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces3[ f ]	];

				// weights

				sw1 = obj_skinWeights[ face.a ];
				sw2 = obj_skinWeights[ face.b ];
				sw3 = obj_skinWeights[ face.c ];

				skinWeightArray[ offset_skin ]     = sw1.x;
				skinWeightArray[ offset_skin + 1 ] = sw1.y;
				skinWeightArray[ offset_skin + 2 ] = sw1.z;
				skinWeightArray[ offset_skin + 3 ] = sw1.w;

				skinWeightArray[ offset_skin + 4 ] = sw2.x;
				skinWeightArray[ offset_skin + 5 ] = sw2.y;
				skinWeightArray[ offset_skin + 6 ] = sw2.z;
				skinWeightArray[ offset_skin + 7 ] = sw2.w;

				skinWeightArray[ offset_skin + 8 ]  = sw3.x;
				skinWeightArray[ offset_skin + 9 ]  = sw3.y;
				skinWeightArray[ offset_skin + 10 ] = sw3.z;
				skinWeightArray[ offset_skin + 11 ] = sw3.w;

				// indices

				si1 = obj_skinIndices[ face.a ];
				si2 = obj_skinIndices[ face.b ];
				si3 = obj_skinIndices[ face.c ];

				skinIndexArray[ offset_skin ]     = si1.x;
				skinIndexArray[ offset_skin + 1 ] = si1.y;
				skinIndexArray[ offset_skin + 2 ] = si1.z;
				skinIndexArray[ offset_skin + 3 ] = si1.w;

				skinIndexArray[ offset_skin + 4 ] = si2.x;
				skinIndexArray[ offset_skin + 5 ] = si2.y;
				skinIndexArray[ offset_skin + 6 ] = si2.z;
				skinIndexArray[ offset_skin + 7 ] = si2.w;

				skinIndexArray[ offset_skin + 8 ]  = si3.x;
				skinIndexArray[ offset_skin + 9 ]  = si3.y;
				skinIndexArray[ offset_skin + 10 ] = si3.z;
				skinIndexArray[ offset_skin + 11 ] = si3.w;

				offset_skin += 12;

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces4[ f ] ];

				// weights

				sw1 = obj_skinWeights[ face.a ];
				sw2 = obj_skinWeights[ face.b ];
				sw3 = obj_skinWeights[ face.c ];
				sw4 = obj_skinWeights[ face.d ];

				skinWeightArray[ offset_skin ]     = sw1.x;
				skinWeightArray[ offset_skin + 1 ] = sw1.y;
				skinWeightArray[ offset_skin + 2 ] = sw1.z;
				skinWeightArray[ offset_skin + 3 ] = sw1.w;

				skinWeightArray[ offset_skin + 4 ] = sw2.x;
				skinWeightArray[ offset_skin + 5 ] = sw2.y;
				skinWeightArray[ offset_skin + 6 ] = sw2.z;
				skinWeightArray[ offset_skin + 7 ] = sw2.w;

				skinWeightArray[ offset_skin + 8 ]  = sw3.x;
				skinWeightArray[ offset_skin + 9 ]  = sw3.y;
				skinWeightArray[ offset_skin + 10 ] = sw3.z;
				skinWeightArray[ offset_skin + 11 ] = sw3.w;

				skinWeightArray[ offset_skin + 12 ] = sw4.x;
				skinWeightArray[ offset_skin + 13 ] = sw4.y;
				skinWeightArray[ offset_skin + 14 ] = sw4.z;
				skinWeightArray[ offset_skin + 15 ] = sw4.w;

				// indices

				si1 = obj_skinIndices[ face.a ];
				si2 = obj_skinIndices[ face.b ];
				si3 = obj_skinIndices[ face.c ];
				si4 = obj_skinIndices[ face.d ];

				skinIndexArray[ offset_skin ]     = si1.x;
				skinIndexArray[ offset_skin + 1 ] = si1.y;
				skinIndexArray[ offset_skin + 2 ] = si1.z;
				skinIndexArray[ offset_skin + 3 ] = si1.w;

				skinIndexArray[ offset_skin + 4 ] = si2.x;
				skinIndexArray[ offset_skin + 5 ] = si2.y;
				skinIndexArray[ offset_skin + 6 ] = si2.z;
				skinIndexArray[ offset_skin + 7 ] = si2.w;

				skinIndexArray[ offset_skin + 8 ]  = si3.x;
				skinIndexArray[ offset_skin + 9 ]  = si3.y;
				skinIndexArray[ offset_skin + 10 ] = si3.z;
				skinIndexArray[ offset_skin + 11 ] = si3.w;

				skinIndexArray[ offset_skin + 12 ] = si4.x;
				skinIndexArray[ offset_skin + 13 ] = si4.y;
				skinIndexArray[ offset_skin + 14 ] = si4.z;
				skinIndexArray[ offset_skin + 15 ] = si4.w;

				offset_skin += 16;

			}

			if ( offset_skin > 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuSkinIndicesBuffer );
				GL.bufferData( GL.ARRAY_BUFFER, skinIndexArray, hint );

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuSkinWeightsBuffer );
				GL.bufferData( GL.ARRAY_BUFFER, skinWeightArray, hint );

			}

		}

		if ( dirtyColors && vertexColorType ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces3[ f ]	];

				vertexColors = face.vertexColors;
				faceColor = face.color;

				if ( vertexColors.length === 3 && vertexColorType === THREE.VertexColors ) {

					c1 = vertexColors[ 0 ];
					c2 = vertexColors[ 1 ];
					c3 = vertexColors[ 2 ];

				} else {

					c1 = faceColor;
					c2 = faceColor;
					c3 = faceColor;

				}

				colorArray[ offset_color ]     = c1.r;
				colorArray[ offset_color + 1 ] = c1.g;
				colorArray[ offset_color + 2 ] = c1.b;

				colorArray[ offset_color + 3 ] = c2.r;
				colorArray[ offset_color + 4 ] = c2.g;
				colorArray[ offset_color + 5 ] = c2.b;

				colorArray[ offset_color + 6 ] = c3.r;
				colorArray[ offset_color + 7 ] = c3.g;
				colorArray[ offset_color + 8 ] = c3.b;

				offset_color += 9;

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces4[ f ] ];

				vertexColors = face.vertexColors;
				faceColor = face.color;

				if ( vertexColors.length === 4 && vertexColorType === THREE.VertexColors ) {

					c1 = vertexColors[ 0 ];
					c2 = vertexColors[ 1 ];
					c3 = vertexColors[ 2 ];
					c4 = vertexColors[ 3 ];

				} else {

					c1 = faceColor;
					c2 = faceColor;
					c3 = faceColor;
					c4 = faceColor;

				}

				colorArray[ offset_color ]     = c1.r;
				colorArray[ offset_color + 1 ] = c1.g;
				colorArray[ offset_color + 2 ] = c1.b;

				colorArray[ offset_color + 3 ] = c2.r;
				colorArray[ offset_color + 4 ] = c2.g;
				colorArray[ offset_color + 5 ] = c2.b;

				colorArray[ offset_color + 6 ] = c3.r;
				colorArray[ offset_color + 7 ] = c3.g;
				colorArray[ offset_color + 8 ] = c3.b;

				colorArray[ offset_color + 9 ]  = c4.r;
				colorArray[ offset_color + 10 ] = c4.g;
				colorArray[ offset_color + 11 ] = c4.b;

				offset_color += 12;

			}

			if ( offset_color > 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuColorBuffer );
				GL.bufferData( GL.ARRAY_BUFFER, colorArray, hint );

			}

		}

		if ( dirtyTangents && geometry.hasTangents ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces3[ f ]	];

				vertexTangents = face.vertexTangents;

				t1 = vertexTangents[ 0 ];
				t2 = vertexTangents[ 1 ];
				t3 = vertexTangents[ 2 ];

				tangentArray[ offset_tangent ]     = t1.x;
				tangentArray[ offset_tangent + 1 ] = t1.y;
				tangentArray[ offset_tangent + 2 ] = t1.z;
				tangentArray[ offset_tangent + 3 ] = t1.w;

				tangentArray[ offset_tangent + 4 ] = t2.x;
				tangentArray[ offset_tangent + 5 ] = t2.y;
				tangentArray[ offset_tangent + 6 ] = t2.z;
				tangentArray[ offset_tangent + 7 ] = t2.w;

				tangentArray[ offset_tangent + 8 ]  = t3.x;
				tangentArray[ offset_tangent + 9 ]  = t3.y;
				tangentArray[ offset_tangent + 10 ] = t3.z;
				tangentArray[ offset_tangent + 11 ] = t3.w;

				offset_tangent += 12;

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces4[ f ] ];

				vertexTangents = face.vertexTangents;

				t1 = vertexTangents[ 0 ];
				t2 = vertexTangents[ 1 ];
				t3 = vertexTangents[ 2 ];
				t4 = vertexTangents[ 3 ];

				tangentArray[ offset_tangent ]     = t1.x;
				tangentArray[ offset_tangent + 1 ] = t1.y;
				tangentArray[ offset_tangent + 2 ] = t1.z;
				tangentArray[ offset_tangent + 3 ] = t1.w;

				tangentArray[ offset_tangent + 4 ] = t2.x;
				tangentArray[ offset_tangent + 5 ] = t2.y;
				tangentArray[ offset_tangent + 6 ] = t2.z;
				tangentArray[ offset_tangent + 7 ] = t2.w;

				tangentArray[ offset_tangent + 8 ]  = t3.x;
				tangentArray[ offset_tangent + 9 ]  = t3.y;
				tangentArray[ offset_tangent + 10 ] = t3.z;
				tangentArray[ offset_tangent + 11 ] = t3.w;

				tangentArray[ offset_tangent + 12 ] = t4.x;
				tangentArray[ offset_tangent + 13 ] = t4.y;
				tangentArray[ offset_tangent + 14 ] = t4.z;
				tangentArray[ offset_tangent + 15 ] = t4.w;

				offset_tangent += 16;

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuTangentBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, tangentArray, hint );

		}

		if ( dirtyNormals && normalType ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces3[ f ]	];

				vertexNormals = face.vertexNormals;
				faceNormal = face.normal;

				if ( vertexNormals.length === 3 && needsSmoothNormals ) {

					for ( i = 0; i < 3; i ++ ) {

						vn = vertexNormals[ i ];

						normalArray[ offset_normal ]     = vn.x;
						normalArray[ offset_normal + 1 ] = vn.y;
						normalArray[ offset_normal + 2 ] = vn.z;

						offset_normal += 3;

					}

				} else {

					for ( i = 0; i < 3; i ++ ) {

						normalArray[ offset_normal ]     = faceNormal.x;
						normalArray[ offset_normal + 1 ] = faceNormal.y;
						normalArray[ offset_normal + 2 ] = faceNormal.z;

						offset_normal += 3;

					}

				}

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				face = obj_faces[ chunk_faces4[ f ] ];

				vertexNormals = face.vertexNormals;
				faceNormal = face.normal;

				if ( vertexNormals.length === 4 && needsSmoothNormals ) {

					for ( i = 0; i < 4; i ++ ) {

						vn = vertexNormals[ i ];

						normalArray[ offset_normal ]     = vn.x;
						normalArray[ offset_normal + 1 ] = vn.y;
						normalArray[ offset_normal + 2 ] = vn.z;

						offset_normal += 3;

					}

				} else {

					for ( i = 0; i < 4; i ++ ) {

						normalArray[ offset_normal ]     = faceNormal.x;
						normalArray[ offset_normal + 1 ] = faceNormal.y;
						normalArray[ offset_normal + 2 ] = faceNormal.z;

						offset_normal += 3;

					}

				}

			}

			GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuNormalBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, normalArray, hint );

		}

		if ( dirtyUvs && obj_uvs && uvType ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				fi = chunk_faces3[ f ];

				uv = obj_uvs[ fi ];

				if ( uv === undefined ) continue;

				for ( i = 0; i < 3; i ++ ) {

					uvi = uv[ i ];

					uvArray[ offset_uv ]     = uvi.x;
					uvArray[ offset_uv + 1 ] = uvi.y;

					offset_uv += 2;

				}

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				fi = chunk_faces4[ f ];

				uv = obj_uvs[ fi ];

				if ( uv === undefined ) continue;

				for ( i = 0; i < 4; i ++ ) {

					uvi = uv[ i ];

					uvArray[ offset_uv ]     = uvi.x;
					uvArray[ offset_uv + 1 ] = uvi.y;

					offset_uv += 2;

				}

			}

			if ( offset_uv > 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuUVBuffer );
				GL.bufferData( GL.ARRAY_BUFFER, uvArray, hint );

			}

		}

		if ( dirtyUvs && obj_uvs2 && uvType ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				fi = chunk_faces3[ f ];

				uv2 = obj_uvs2[ fi ];

				if ( uv2 === undefined ) continue;

				for ( i = 0; i < 3; i ++ ) {

					uv2i = uv2[ i ];

					uv2Array[ offset_uv2 ]     = uv2i.x;
					uv2Array[ offset_uv2 + 1 ] = uv2i.y;

					offset_uv2 += 2;

				}

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				fi = chunk_faces4[ f ];

				uv2 = obj_uvs2[ fi ];

				if ( uv2 === undefined ) continue;

				for ( i = 0; i < 4; i ++ ) {

					uv2i = uv2[ i ];

					uv2Array[ offset_uv2 ]     = uv2i.x;
					uv2Array[ offset_uv2 + 1 ] = uv2i.y;

					offset_uv2 += 2;

				}

			}

			if ( offset_uv2 > 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuUV2Buffer );
				GL.bufferData( GL.ARRAY_BUFFER, uv2Array, hint );

			}

		}

		if ( dirtyElements ) {

			for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

				faceArray[ offset_face ] 	 = vertexIndex;
				faceArray[ offset_face + 1 ] = vertexIndex + 1;
				faceArray[ offset_face + 2 ] = vertexIndex + 2;

				offset_face += 3;

				lineArray[ offset_line ]     = vertexIndex;
				lineArray[ offset_line + 1 ] = vertexIndex + 1;

				lineArray[ offset_line + 2 ] = vertexIndex;
				lineArray[ offset_line + 3 ] = vertexIndex + 2;

				lineArray[ offset_line + 4 ] = vertexIndex + 1;
				lineArray[ offset_line + 5 ] = vertexIndex + 2;

				offset_line += 6;

				vertexIndex += 3;

			}

			for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

				faceArray[ offset_face ]     = vertexIndex;
				faceArray[ offset_face + 1 ] = vertexIndex + 1;
				faceArray[ offset_face + 2 ] = vertexIndex + 3;

				faceArray[ offset_face + 3 ] = vertexIndex + 1;
				faceArray[ offset_face + 4 ] = vertexIndex + 2;
				faceArray[ offset_face + 5 ] = vertexIndex + 3;

				offset_face += 6;

				lineArray[ offset_line ]     = vertexIndex;
				lineArray[ offset_line + 1 ] = vertexIndex + 1;

				lineArray[ offset_line + 2 ] = vertexIndex;
				lineArray[ offset_line + 3 ] = vertexIndex + 3;

				lineArray[ offset_line + 4 ] = vertexIndex + 1;
				lineArray[ offset_line + 5 ] = vertexIndex + 2;

				lineArray[ offset_line + 6 ] = vertexIndex + 2;
				lineArray[ offset_line + 7 ] = vertexIndex + 3;

				offset_line += 8;

				vertexIndex += 4;

			}

			GL.bindBuffer( GL.ELEMENT_ARRAY_BUFFER, geometryGroup.__gpuFaceBuffer );
			GL.bufferData( GL.ELEMENT_ARRAY_BUFFER, faceArray, hint );

			GL.bindBuffer( GL.ELEMENT_ARRAY_BUFFER, geometryGroup.__gpuLineBuffer );
			GL.bufferData( GL.ELEMENT_ARRAY_BUFFER, lineArray, hint );

		}

		if ( customAttributes ) {

			for ( i = 0, il = customAttributes.length; i < il; i ++ ) {

				customAttribute = customAttributes[ i ];

				if ( ! customAttribute.__original.needsUpdate ) continue;

				offset_custom = 0;
				offset_customSrc = 0;

				if ( customAttribute.size === 1 ) {

					if ( customAttribute.boundTo === undefined || customAttribute.boundTo === "vertices" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces3[ f ]	];

							customAttribute.array[ offset_custom ] 	   = customAttribute.value[ face.a ];
							customAttribute.array[ offset_custom + 1 ] = customAttribute.value[ face.b ];
							customAttribute.array[ offset_custom + 2 ] = customAttribute.value[ face.c ];

							offset_custom += 3;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces4[ f ] ];

							customAttribute.array[ offset_custom ] 	   = customAttribute.value[ face.a ];
							customAttribute.array[ offset_custom + 1 ] = customAttribute.value[ face.b ];
							customAttribute.array[ offset_custom + 2 ] = customAttribute.value[ face.c ];
							customAttribute.array[ offset_custom + 3 ] = customAttribute.value[ face.d ];

							offset_custom += 4;

						}

					} else if ( customAttribute.boundTo === "faces" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces3[ f ] ];

							customAttribute.array[ offset_custom ] 	   = value;
							customAttribute.array[ offset_custom + 1 ] = value;
							customAttribute.array[ offset_custom + 2 ] = value;

							offset_custom += 3;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces4[ f ] ];

							customAttribute.array[ offset_custom ] 	   = value;
							customAttribute.array[ offset_custom + 1 ] = value;
							customAttribute.array[ offset_custom + 2 ] = value;
							customAttribute.array[ offset_custom + 3 ] = value;

							offset_custom += 4;

						}

					}

				} else if ( customAttribute.size === 2 ) {

					if ( customAttribute.boundTo === undefined || customAttribute.boundTo === "vertices" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces3[ f ]	];

							v1 = customAttribute.value[ face.a ];
							v2 = customAttribute.value[ face.b ];
							v3 = customAttribute.value[ face.c ];

							customAttribute.array[ offset_custom ] 	   = v1.x;
							customAttribute.array[ offset_custom + 1 ] = v1.y;

							customAttribute.array[ offset_custom + 2 ] = v2.x;
							customAttribute.array[ offset_custom + 3 ] = v2.y;

							customAttribute.array[ offset_custom + 4 ] = v3.x;
							customAttribute.array[ offset_custom + 5 ] = v3.y;

							offset_custom += 6;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces4[ f ] ];

							v1 = customAttribute.value[ face.a ];
							v2 = customAttribute.value[ face.b ];
							v3 = customAttribute.value[ face.c ];
							v4 = customAttribute.value[ face.d ];

							customAttribute.array[ offset_custom ] 	   = v1.x;
							customAttribute.array[ offset_custom + 1 ] = v1.y;

							customAttribute.array[ offset_custom + 2 ] = v2.x;
							customAttribute.array[ offset_custom + 3 ] = v2.y;

							customAttribute.array[ offset_custom + 4 ] = v3.x;
							customAttribute.array[ offset_custom + 5 ] = v3.y;

							customAttribute.array[ offset_custom + 6 ] = v4.x;
							customAttribute.array[ offset_custom + 7 ] = v4.y;

							offset_custom += 8;

						}

					} else if ( customAttribute.boundTo === "faces" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces3[ f ] ];

							v1 = value;
							v2 = value;
							v3 = value;

							customAttribute.array[ offset_custom ] 	   = v1.x;
							customAttribute.array[ offset_custom + 1 ] = v1.y;

							customAttribute.array[ offset_custom + 2 ] = v2.x;
							customAttribute.array[ offset_custom + 3 ] = v2.y;

							customAttribute.array[ offset_custom + 4 ] = v3.x;
							customAttribute.array[ offset_custom + 5 ] = v3.y;

							offset_custom += 6;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces4[ f ] ];

							v1 = value;
							v2 = value;
							v3 = value;
							v4 = value;

							customAttribute.array[ offset_custom ] 	   = v1.x;
							customAttribute.array[ offset_custom + 1 ] = v1.y;

							customAttribute.array[ offset_custom + 2 ] = v2.x;
							customAttribute.array[ offset_custom + 3 ] = v2.y;

							customAttribute.array[ offset_custom + 4 ] = v3.x;
							customAttribute.array[ offset_custom + 5 ] = v3.y;

							customAttribute.array[ offset_custom + 6 ] = v4.x;
							customAttribute.array[ offset_custom + 7 ] = v4.y;

							offset_custom += 8;

						}

					}

				} else if ( customAttribute.size === 3 ) {

					var pp;

					if ( customAttribute.type === "c" ) {

						pp = [ "r", "g", "b" ];

					} else {

						pp = [ "x", "y", "z" ];

					}

					if ( customAttribute.boundTo === undefined || customAttribute.boundTo === "vertices" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces3[ f ]	];

							v1 = customAttribute.value[ face.a ];
							v2 = customAttribute.value[ face.b ];
							v3 = customAttribute.value[ face.c ];

							customAttribute.array[ offset_custom ] 	   = v1[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 1 ] = v1[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 2 ] = v1[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 3 ] = v2[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 4 ] = v2[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 5 ] = v2[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 6 ] = v3[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 7 ] = v3[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 8 ] = v3[ pp[ 2 ] ];

							offset_custom += 9;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces4[ f ] ];

							v1 = customAttribute.value[ face.a ];
							v2 = customAttribute.value[ face.b ];
							v3 = customAttribute.value[ face.c ];
							v4 = customAttribute.value[ face.d ];

							customAttribute.array[ offset_custom  ] 	= v1[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 1  ] = v1[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 2  ] = v1[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 3  ] = v2[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 4  ] = v2[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 5  ] = v2[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 6  ] = v3[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 7  ] = v3[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 8  ] = v3[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 9  ] = v4[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 10 ] = v4[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 11 ] = v4[ pp[ 2 ] ];

							offset_custom += 12;

						}

					} else if ( customAttribute.boundTo === "faces" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces3[ f ] ];

							v1 = value;
							v2 = value;
							v3 = value;

							customAttribute.array[ offset_custom ] 	   = v1[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 1 ] = v1[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 2 ] = v1[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 3 ] = v2[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 4 ] = v2[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 5 ] = v2[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 6 ] = v3[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 7 ] = v3[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 8 ] = v3[ pp[ 2 ] ];

							offset_custom += 9;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces4[ f ] ];

							v1 = value;
							v2 = value;
							v3 = value;
							v4 = value;

							customAttribute.array[ offset_custom  ] 	= v1[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 1  ] = v1[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 2  ] = v1[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 3  ] = v2[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 4  ] = v2[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 5  ] = v2[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 6  ] = v3[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 7  ] = v3[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 8  ] = v3[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 9  ] = v4[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 10 ] = v4[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 11 ] = v4[ pp[ 2 ] ];

							offset_custom += 12;

						}

					} else if ( customAttribute.boundTo === "faceVertices" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces3[ f ] ];

							v1 = value[ 0 ];
							v2 = value[ 1 ];
							v3 = value[ 2 ];

							customAttribute.array[ offset_custom ] 	   = v1[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 1 ] = v1[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 2 ] = v1[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 3 ] = v2[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 4 ] = v2[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 5 ] = v2[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 6 ] = v3[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 7 ] = v3[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 8 ] = v3[ pp[ 2 ] ];

							offset_custom += 9;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces4[ f ] ];

							v1 = value[ 0 ];
							v2 = value[ 1 ];
							v3 = value[ 2 ];
							v4 = value[ 3 ];

							customAttribute.array[ offset_custom  ] 	= v1[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 1  ] = v1[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 2  ] = v1[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 3  ] = v2[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 4  ] = v2[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 5  ] = v2[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 6  ] = v3[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 7  ] = v3[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 8  ] = v3[ pp[ 2 ] ];

							customAttribute.array[ offset_custom + 9  ] = v4[ pp[ 0 ] ];
							customAttribute.array[ offset_custom + 10 ] = v4[ pp[ 1 ] ];
							customAttribute.array[ offset_custom + 11 ] = v4[ pp[ 2 ] ];

							offset_custom += 12;

						}

					}

				} else if ( customAttribute.size === 4 ) {

					if ( customAttribute.boundTo === undefined || customAttribute.boundTo === "vertices" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces3[ f ]	];

							v1 = customAttribute.value[ face.a ];
							v2 = customAttribute.value[ face.b ];
							v3 = customAttribute.value[ face.c ];

							customAttribute.array[ offset_custom  ] 	= v1.x;
							customAttribute.array[ offset_custom + 1  ] = v1.y;
							customAttribute.array[ offset_custom + 2  ] = v1.z;
							customAttribute.array[ offset_custom + 3  ] = v1.w;

							customAttribute.array[ offset_custom + 4  ] = v2.x;
							customAttribute.array[ offset_custom + 5  ] = v2.y;
							customAttribute.array[ offset_custom + 6  ] = v2.z;
							customAttribute.array[ offset_custom + 7  ] = v2.w;

							customAttribute.array[ offset_custom + 8  ] = v3.x;
							customAttribute.array[ offset_custom + 9  ] = v3.y;
							customAttribute.array[ offset_custom + 10 ] = v3.z;
							customAttribute.array[ offset_custom + 11 ] = v3.w;

							offset_custom += 12;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							face = obj_faces[ chunk_faces4[ f ] ];

							v1 = customAttribute.value[ face.a ];
							v2 = customAttribute.value[ face.b ];
							v3 = customAttribute.value[ face.c ];
							v4 = customAttribute.value[ face.d ];

							customAttribute.array[ offset_custom  ] 	= v1.x;
							customAttribute.array[ offset_custom + 1  ] = v1.y;
							customAttribute.array[ offset_custom + 2  ] = v1.z;
							customAttribute.array[ offset_custom + 3  ] = v1.w;

							customAttribute.array[ offset_custom + 4  ] = v2.x;
							customAttribute.array[ offset_custom + 5  ] = v2.y;
							customAttribute.array[ offset_custom + 6  ] = v2.z;
							customAttribute.array[ offset_custom + 7  ] = v2.w;

							customAttribute.array[ offset_custom + 8  ] = v3.x;
							customAttribute.array[ offset_custom + 9  ] = v3.y;
							customAttribute.array[ offset_custom + 10 ] = v3.z;
							customAttribute.array[ offset_custom + 11 ] = v3.w;

							customAttribute.array[ offset_custom + 12 ] = v4.x;
							customAttribute.array[ offset_custom + 13 ] = v4.y;
							customAttribute.array[ offset_custom + 14 ] = v4.z;
							customAttribute.array[ offset_custom + 15 ] = v4.w;

							offset_custom += 16;

						}

					} else if ( customAttribute.boundTo === "faces" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces3[ f ] ];

							v1 = value;
							v2 = value;
							v3 = value;

							customAttribute.array[ offset_custom  ] 	= v1.x;
							customAttribute.array[ offset_custom + 1  ] = v1.y;
							customAttribute.array[ offset_custom + 2  ] = v1.z;
							customAttribute.array[ offset_custom + 3  ] = v1.w;

							customAttribute.array[ offset_custom + 4  ] = v2.x;
							customAttribute.array[ offset_custom + 5  ] = v2.y;
							customAttribute.array[ offset_custom + 6  ] = v2.z;
							customAttribute.array[ offset_custom + 7  ] = v2.w;

							customAttribute.array[ offset_custom + 8  ] = v3.x;
							customAttribute.array[ offset_custom + 9  ] = v3.y;
							customAttribute.array[ offset_custom + 10 ] = v3.z;
							customAttribute.array[ offset_custom + 11 ] = v3.w;

							offset_custom += 12;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces4[ f ] ];

							v1 = value;
							v2 = value;
							v3 = value;
							v4 = value;

							customAttribute.array[ offset_custom  ] 	= v1.x;
							customAttribute.array[ offset_custom + 1  ] = v1.y;
							customAttribute.array[ offset_custom + 2  ] = v1.z;
							customAttribute.array[ offset_custom + 3  ] = v1.w;

							customAttribute.array[ offset_custom + 4  ] = v2.x;
							customAttribute.array[ offset_custom + 5  ] = v2.y;
							customAttribute.array[ offset_custom + 6  ] = v2.z;
							customAttribute.array[ offset_custom + 7  ] = v2.w;

							customAttribute.array[ offset_custom + 8  ] = v3.x;
							customAttribute.array[ offset_custom + 9  ] = v3.y;
							customAttribute.array[ offset_custom + 10 ] = v3.z;
							customAttribute.array[ offset_custom + 11 ] = v3.w;

							customAttribute.array[ offset_custom + 12 ] = v4.x;
							customAttribute.array[ offset_custom + 13 ] = v4.y;
							customAttribute.array[ offset_custom + 14 ] = v4.z;
							customAttribute.array[ offset_custom + 15 ] = v4.w;

							offset_custom += 16;

						}

					} else if ( customAttribute.boundTo === "faceVertices" ) {

						for ( f = 0, fl = chunk_faces3.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces3[ f ] ];

							v1 = value[ 0 ];
							v2 = value[ 1 ];
							v3 = value[ 2 ];

							customAttribute.array[ offset_custom  ] 	= v1.x;
							customAttribute.array[ offset_custom + 1  ] = v1.y;
							customAttribute.array[ offset_custom + 2  ] = v1.z;
							customAttribute.array[ offset_custom + 3  ] = v1.w;

							customAttribute.array[ offset_custom + 4  ] = v2.x;
							customAttribute.array[ offset_custom + 5  ] = v2.y;
							customAttribute.array[ offset_custom + 6  ] = v2.z;
							customAttribute.array[ offset_custom + 7  ] = v2.w;

							customAttribute.array[ offset_custom + 8  ] = v3.x;
							customAttribute.array[ offset_custom + 9  ] = v3.y;
							customAttribute.array[ offset_custom + 10 ] = v3.z;
							customAttribute.array[ offset_custom + 11 ] = v3.w;

							offset_custom += 12;

						}

						for ( f = 0, fl = chunk_faces4.length; f < fl; f ++ ) {

							value = customAttribute.value[ chunk_faces4[ f ] ];

							v1 = value[ 0 ];
							v2 = value[ 1 ];
							v3 = value[ 2 ];
							v4 = value[ 3 ];

							customAttribute.array[ offset_custom  ] 	= v1.x;
							customAttribute.array[ offset_custom + 1  ] = v1.y;
							customAttribute.array[ offset_custom + 2  ] = v1.z;
							customAttribute.array[ offset_custom + 3  ] = v1.w;

							customAttribute.array[ offset_custom + 4  ] = v2.x;
							customAttribute.array[ offset_custom + 5  ] = v2.y;
							customAttribute.array[ offset_custom + 6  ] = v2.z;
							customAttribute.array[ offset_custom + 7  ] = v2.w;

							customAttribute.array[ offset_custom + 8  ] = v3.x;
							customAttribute.array[ offset_custom + 9  ] = v3.y;
							customAttribute.array[ offset_custom + 10 ] = v3.z;
							customAttribute.array[ offset_custom + 11 ] = v3.w;

							customAttribute.array[ offset_custom + 12 ] = v4.x;
							customAttribute.array[ offset_custom + 13 ] = v4.y;
							customAttribute.array[ offset_custom + 14 ] = v4.z;
							customAttribute.array[ offset_custom + 15 ] = v4.w;

							offset_custom += 16;

						}

					}

				}

				GL.bindBuffer( GL.ARRAY_BUFFER, customAttribute.buffer );
				GL.bufferData( GL.ARRAY_BUFFER, customAttribute.array, hint );

			}

		}

		if ( dispose ) {

			delete geometryGroup.__inittedArrays;
			delete geometryGroup.__colorArray;
			delete geometryGroup.__normalArray;
			delete geometryGroup.__tangentArray;
			delete geometryGroup.__uvArray;
			delete geometryGroup.__uv2Array;
			delete geometryGroup.__faceArray;
			delete geometryGroup.__vertexArray;
			delete geometryGroup.__lineArray;
			delete geometryGroup.__skinIndexArray;
			delete geometryGroup.__skinWeightArray;

		}

	};

	function setDirectBuffers ( geometry, hint, dispose ) {

		var attributes = geometry.attributes;

		var attributeName, attributeItem;

		for ( attributeName in attributes ) {

			attributeItem = attributes[ attributeName ];

			if ( attributeItem.needsUpdate ) {

				if ( attributeName === 'index' ) {

					GL.bindBuffer( GL.ELEMENT_ARRAY_BUFFER, attributeItem.buffer );
					GL.bufferData( GL.ELEMENT_ARRAY_BUFFER, attributeItem.array, hint );

				} else {

					GL.bindBuffer( GL.ARRAY_BUFFER, attributeItem.buffer );
					GL.bufferData( GL.ARRAY_BUFFER, attributeItem.array, hint );

				}

				attributeItem.needsUpdate = false;

			}

			if ( dispose && ! attributeItem.dynamic ) {

				attributeItem.array = null;

			}

		}

	};

	// Buffer rendering

	renderBufferImmediate = function ( object, program, material ) {

		if ( object.hasPositions && ! object.__gpuVertexBuffer ) object.__gpuVertexBuffer = GL.createBuffer();
		if ( object.hasNormals && ! object.__gpuNormalBuffer ) object.__gpuNormalBuffer = GL.createBuffer();
		if ( object.hasUvs && ! object.__gpuUvBuffer ) object.__gpuUvBuffer = GL.createBuffer();
		if ( object.hasColors && ! object.__gpuColorBuffer ) object.__gpuColorBuffer = GL.createBuffer();

		if ( object.hasPositions ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, object.__gpuVertexBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, object.positionArray, GL.DYNAMIC_DRAW );
			GL.enableVertexAttribArray( program.attributes.position );
			GL.vertexAttribPointer( program.attributes.position, 3, GL.FLOAT, false, 0, 0 );

		}

		if ( object.hasNormals ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, object.__gpuNormalBuffer );

			if ( material.shading === THREE.FlatShading ) {

				var nx, ny, nz,
					nax, nbx, ncx, nay, nby, ncy, naz, nbz, ncz,
					normalArray,
					i, il = object.count * 3;

				for( i = 0; i < il; i += 9 ) {

					normalArray = object.normalArray;

					nax  = normalArray[ i ];
					nay  = normalArray[ i + 1 ];
					naz  = normalArray[ i + 2 ];

					nbx  = normalArray[ i + 3 ];
					nby  = normalArray[ i + 4 ];
					nbz  = normalArray[ i + 5 ];

					ncx  = normalArray[ i + 6 ];
					ncy  = normalArray[ i + 7 ];
					ncz  = normalArray[ i + 8 ];

					nx = ( nax + nbx + ncx ) / 3;
					ny = ( nay + nby + ncy ) / 3;
					nz = ( naz + nbz + ncz ) / 3;

					normalArray[ i ] 	 = nx;
					normalArray[ i + 1 ] = ny;
					normalArray[ i + 2 ] = nz;

					normalArray[ i + 3 ] = nx;
					normalArray[ i + 4 ] = ny;
					normalArray[ i + 5 ] = nz;

					normalArray[ i + 6 ] = nx;
					normalArray[ i + 7 ] = ny;
					normalArray[ i + 8 ] = nz;

				}

			}

			GL.bufferData( GL.ARRAY_BUFFER, object.normalArray, GL.DYNAMIC_DRAW );
			GL.enableVertexAttribArray( program.attributes.normal );
			GL.vertexAttribPointer( program.attributes.normal, 3, GL.FLOAT, false, 0, 0 );

		}

		if ( object.hasUvs && material.map ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, object.__gpuUvBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, object.uvArray, GL.DYNAMIC_DRAW );
			GL.enableVertexAttribArray( program.attributes.uv );
			GL.vertexAttribPointer( program.attributes.uv, 2, GL.FLOAT, false, 0, 0 );

		}

		if ( object.hasColors && material.vertexColors !== THREE.NoColors ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, object.__gpuColorBuffer );
			GL.bufferData( GL.ARRAY_BUFFER, object.colorArray, GL.DYNAMIC_DRAW );
			GL.enableVertexAttribArray( program.attributes.color );
			GL.vertexAttribPointer( program.attributes.color, 3, GL.FLOAT, false, 0, 0 );

		}

		GL.drawArrays( GL.TRIANGLES, 0, object.count );

		object.count = 0;

	};

	renderBufferDirect = function ( camera, lights, fog, material, geometry, object ) {

		if ( material.visible === false ) return;

		var linewidth, a, attribute;
		var attributeItem, attributeName, attributePointer, attributeSize;

		var program = setProgram( camera, lights, fog, material, object );

		var programAttributes = program.attributes;
		var geometryAttributes = geometry.attributes;

		var updateBuffers = false,
			wireframeBit = material.wireframe ? 1 : 0,
			geometryHash = ( geometry.id * 0xffffff ) + ( program.id * 2 ) + wireframeBit;

		if ( geometryHash !== _currentGeometryGroupHash ) {

			_currentGeometryGroupHash = geometryHash;
			updateBuffers = true;

		}

		if ( updateBuffers ) {

			disableAttributes();

		}

		// render mesh

		if ( object instanceof THREE.Mesh ) {

			var index = geometryAttributes[ "index" ];

			// indexed triangles

			if ( index ) {

				var offsets = geometry.offsets;

				// if there is more than 1 chunk
				// must set attribute pointers to use new offsets for each chunk
				// even if geometry and materials didn't change

				if ( offsets.length > 1 ) updateBuffers = true;

				for ( var i = 0, il = offsets.length; i < il; i ++ ) {

					var startIndex = offsets[ i ].index;

					if ( updateBuffers ) {

						for ( attributeName in geometryAttributes ) {

							if ( attributeName === 'index' ) continue;

							attributePointer = programAttributes[ attributeName ];
							attributeItem = geometryAttributes[ attributeName ];
							attributeSize = attributeItem.itemSize;

							if ( attributePointer >= 0 ) {

								GL.bindBuffer( GL.ARRAY_BUFFER, attributeItem.buffer );
								enableAttribute( attributePointer );
								GL.vertexAttribPointer( attributePointer, attributeSize, GL.FLOAT, false, 0, startIndex * attributeSize * 4 ); // 4 bytes per Float32

							}

						}

						// indices

						GL.bindBuffer( GL.ELEMENT_ARRAY_BUFFER, index.buffer );

					}

					// render indexed triangles

					GL.drawElements( GL.TRIANGLES, offsets[ i ].count, GL.UNSIGNED_SHORT, offsets[ i ].start * 2 ); // 2 bytes per Uint16

					info.render.calls ++;
					info.render.vertices += offsets[ i ].count; // not really true, here vertices can be shared
					info.render.faces += offsets[ i ].count / 3;

				}

			// non-indexed triangles

			} else {

				if ( updateBuffers ) {

					for ( attributeName in geometryAttributes ) {

						if ( attributeName === 'index') continue;

						attributePointer = programAttributes[ attributeName ];
						attributeItem = geometryAttributes[ attributeName ];
						attributeSize = attributeItem.itemSize;

						if ( attributePointer >= 0 ) {

							GL.bindBuffer( GL.ARRAY_BUFFER, attributeItem.buffer );
							enableAttribute( attributePointer );
							GL.vertexAttribPointer( attributePointer, attributeSize, GL.FLOAT, false, 0, 0 );

						}

					}

				}

				var position = geometry.attributes[ "position" ];

				// render non-indexed triangles

				GL.drawArrays( GL.TRIANGLES, 0, position.numItems / 3 );

				info.render.calls ++;
				info.render.vertices += position.numItems / 3;
				info.render.faces += position.numItems / 3 / 3;

			}

		// render particles

		} else if ( object instanceof THREE.ParticleSystem ) {

			if ( updateBuffers ) {

				for ( attributeName in geometryAttributes ) {

					attributePointer = programAttributes[ attributeName ];
					attributeItem = geometryAttributes[ attributeName ];
					attributeSize = attributeItem.itemSize;

					if ( attributePointer >= 0 ) {

						GL.bindBuffer( GL.ARRAY_BUFFER, attributeItem.buffer );
						enableAttribute( attributePointer );
						GL.vertexAttribPointer( attributePointer, attributeSize, GL.FLOAT, false, 0, 0 );

					}

				}

				var position = geometryAttributes[ "position" ];

				// render particles

				GL.drawArrays( GL.POINTS, 0, position.numItems / 3 );

				info.render.calls ++;
				info.render.points += position.numItems / 3;

			}

		} else if ( object instanceof THREE.Line ) {

			if ( updateBuffers ) {

				for ( attributeName in geometryAttributes ) {

					attributePointer = programAttributes[ attributeName ];
					attributeItem = geometryAttributes[ attributeName ];
					attributeSize = attributeItem.itemSize;

					if ( attributePointer >= 0 ) {

						GL.bindBuffer( GL.ARRAY_BUFFER, attributeItem.buffer );
						enableAttribute( attributePointer );
						GL.vertexAttribPointer( attributePointer, attributeSize, GL.FLOAT, false, 0, 0 );

					}

				}

				// render lines

				var primitives = ( object.type === THREE.LineStrip ) ? GL.LINE_STRIP : GL.LINES;

				setLineWidth( material.linewidth );

				var position = geometryAttributes[ "position" ];

				GL.drawArrays( primitives, 0, position.numItems / 3 );

				info.render.calls ++;
				info.render.points += position.numItems;

			}

    	}

	};

	renderBuffer = function ( camera, lights, fog, material, geometryGroup, object ) {

		if ( material.visible === false ) return;

		var linewidth, a, attribute, i, il;

		var program = setProgram( camera, lights, fog, material, object );

		var attributes = program.attributes;

		var updateBuffers = false,
			wireframeBit = material.wireframe ? 1 : 0,
			geometryGroupHash = ( geometryGroup.id * 0xffffff ) + ( program.id * 2 ) + wireframeBit;

		if ( geometryGroupHash !== _currentGeometryGroupHash ) {

			_currentGeometryGroupHash = geometryGroupHash;
			updateBuffers = true;

		}

		if ( updateBuffers ) {

			disableAttributes();

		}

		// vertices

		if ( !material.morphTargets && attributes.position >= 0 ) {

			if ( updateBuffers ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuVertexBuffer );
				enableAttribute( attributes.position );
				GL.vertexAttribPointer( attributes.position, 3, GL.FLOAT, false, 0, 0 );

			}

		} else {

			if ( object.morphTargetBase ) {

				setupMorphTargets( material, geometryGroup, object );

			}

		}


		if ( updateBuffers ) {

			// custom attributes

			// Use the per-geometryGroup custom attribute arrays which are setup in initMeshBuffers

			if ( geometryGroup.__gpuCustomAttributesList ) {

				for ( i = 0, il = geometryGroup.__gpuCustomAttributesList.length; i < il; i ++ ) {

					attribute = geometryGroup.__gpuCustomAttributesList[ i ];

					if ( attributes[ attribute.buffer.belongsToAttribute ] >= 0 ) {

						GL.bindBuffer( GL.ARRAY_BUFFER, attribute.buffer );
						enableAttribute( attributes[ attribute.buffer.belongsToAttribute ] );
						GL.vertexAttribPointer( attributes[ attribute.buffer.belongsToAttribute ], attribute.size, GL.FLOAT, false, 0, 0 );

					}

				}

			}


			// colors

			if ( attributes.color >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuColorBuffer );
				enableAttribute( attributes.color );
				GL.vertexAttribPointer( attributes.color, 3, GL.FLOAT, false, 0, 0 );

			}

			// normals

			if ( attributes.normal >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuNormalBuffer );
				enableAttribute( attributes.normal );
				GL.vertexAttribPointer( attributes.normal, 3, GL.FLOAT, false, 0, 0 );

			}

			// tangents

			if ( attributes.tangent >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuTangentBuffer );
				enableAttribute( attributes.tangent );
				GL.vertexAttribPointer( attributes.tangent, 4, GL.FLOAT, false, 0, 0 );

			}

			// uvs

			if ( attributes.uv >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuUVBuffer );
				enableAttribute( attributes.uv );
				GL.vertexAttribPointer( attributes.uv, 2, GL.FLOAT, false, 0, 0 );

			}

			if ( attributes.uv2 >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuUV2Buffer );
				enableAttribute( attributes.uv2 );
				GL.vertexAttribPointer( attributes.uv2, 2, GL.FLOAT, false, 0, 0 );

			}

			if ( material.skinning &&
				 attributes.skinIndex >= 0 && attributes.skinWeight >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuSkinIndicesBuffer );
				enableAttribute( attributes.skinIndex );
				GL.vertexAttribPointer( attributes.skinIndex, 4, GL.FLOAT, false, 0, 0 );

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuSkinWeightsBuffer );
				enableAttribute( attributes.skinWeight );
				GL.vertexAttribPointer( attributes.skinWeight, 4, GL.FLOAT, false, 0, 0 );

			}

			// line distances

			if ( attributes.lineDistance >= 0 ) {

				GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuLineDistanceBuffer );
				enableAttribute( attributes.lineDistance );
				GL.vertexAttribPointer( attributes.lineDistance, 1, GL.FLOAT, false, 0, 0 );

			}

		}

		// render mesh

		if ( object instanceof THREE.Mesh ) {

			// wireframe

			if ( material.wireframe ) {

				setLineWidth( material.wireframeLinewidth );

				if ( updateBuffers ) GL.bindBuffer( GL.ELEMENT_ARRAY_BUFFER, geometryGroup.__gpuLineBuffer );
				GL.drawElements( GL.LINES, geometryGroup.__gpuLineCount, GL.UNSIGNED_SHORT, 0 );

			// triangles

			} else {

				if ( updateBuffers ) GL.bindBuffer( GL.ELEMENT_ARRAY_BUFFER, geometryGroup.__gpuFaceBuffer );
				GL.drawElements( GL.TRIANGLES, geometryGroup.__gpuFaceCount, GL.UNSIGNED_SHORT, 0 );

			}

			info.render.calls ++;
			info.render.vertices += geometryGroup.__gpuFaceCount;
			info.render.faces += geometryGroup.__gpuFaceCount / 3;

		// render lines

		} else if ( object instanceof THREE.Line ) {

			var primitives = ( object.type === THREE.LineStrip ) ? GL.LINE_STRIP : GL.LINES;

			setLineWidth( material.linewidth );

			GL.drawArrays( primitives, 0, geometryGroup.__gpuLineCount );

			info.render.calls ++;

		// render particles

		} else if ( object instanceof THREE.ParticleSystem ) {

			GL.drawArrays( GL.POINTS, 0, geometryGroup.__gpuParticleCount );

			info.render.calls ++;
			info.render.points += geometryGroup.__gpuParticleCount;

		// render ribbon

		} else if ( object instanceof THREE.Ribbon ) {

			GL.drawArrays( GL.TRIANGLE_STRIP, 0, geometryGroup.__gpuVertexCount );

			info.render.calls ++;

		}

	};

	function enableAttribute( attribute ) {

		if ( ! _enabledAttributes[ attribute ] ) {

			GL.enableVertexAttribArray( attribute );
			_enabledAttributes[ attribute ] = true;

		}

	};

	function disableAttributes() {

		for ( var attribute in _enabledAttributes ) {

			if ( _enabledAttributes[ attribute ] ) {

				GL.disableVertexAttribArray( attribute );
				_enabledAttributes[ attribute ] = false;

			}

		}

	};

	function setupMorphTargets ( material, geometryGroup, object ) {

		// set base

		var attributes = material.program.attributes;

		if ( object.morphTargetBase !== -1 && attributes.position >= 0 ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphTargetsBuffers[ object.morphTargetBase ] );
			enableAttribute( attributes.position );
			GL.vertexAttribPointer( attributes.position, 3, GL.FLOAT, false, 0, 0 );

		} else if ( attributes.position >= 0 ) {

			GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuVertexBuffer );
			enableAttribute( attributes.position );
			GL.vertexAttribPointer( attributes.position, 3, GL.FLOAT, false, 0, 0 );

		}

		if ( object.morphTargetForcedOrder.length ) {

			// set forced order

			var m = 0;
			var order = object.morphTargetForcedOrder;
			var influences = object.morphTargetInfluences;

			while ( m < material.numSupportedMorphTargets && m < order.length ) {

				if ( attributes[ "morphTarget" + m ] >= 0 ) {

					GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphTargetsBuffers[ order[ m ] ] );
					enableAttribute( attributes[ "morphTarget" + m ] );
					GL.vertexAttribPointer( attributes[ "morphTarget" + m ], 3, GL.FLOAT, false, 0, 0 );

				}

				if ( attributes[ "morphNormal" + m ] >= 0 && material.morphNormals ) {

					GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphNormalsBuffers[ order[ m ] ] );
					enableAttribute( attributes[ "morphNormal" + m ] );
					GL.vertexAttribPointer( attributes[ "morphNormal" + m ], 3, GL.FLOAT, false, 0, 0 );

				}

				object.__gpuMorphTargetInfluences[ m ] = influences[ order[ m ] ];

				m ++;
			}

		} else {

			// find the most influencing

			var influence, activeInfluenceIndices = [];
			var influences = object.morphTargetInfluences;
			var i, il = influences.length;

			for ( i = 0; i < il; i ++ ) {

				influence = influences[ i ];

				if ( influence > 0 ) {

					activeInfluenceIndices.push( [ influence, i ] );

				}

			}

			if ( activeInfluenceIndices.length > material.numSupportedMorphTargets ) {

				activeInfluenceIndices.sort( numericalSort );
				activeInfluenceIndices.length = material.numSupportedMorphTargets;

			} else if ( activeInfluenceIndices.length > material.numSupportedMorphNormals ) {

				activeInfluenceIndices.sort( numericalSort );

			} else if ( activeInfluenceIndices.length === 0 ) {

				activeInfluenceIndices.push( [ 0, 0 ] );

			};

			var influenceIndex, m = 0;

			while ( m < material.numSupportedMorphTargets ) {

				if ( activeInfluenceIndices[ m ] ) {

					influenceIndex = activeInfluenceIndices[ m ][ 1 ];

					if ( attributes[ "morphTarget" + m ] >= 0 ) {

						GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphTargetsBuffers[ influenceIndex ] );
						enableAttribute( attributes[ "morphTarget" + m ] );
						GL.vertexAttribPointer( attributes[ "morphTarget" + m ], 3, GL.FLOAT, false, 0, 0 );

					}

					if ( attributes[ "morphNormal" + m ] >= 0 && material.morphNormals ) {

						GL.bindBuffer( GL.ARRAY_BUFFER, geometryGroup.__gpuMorphNormalsBuffers[ influenceIndex ] );
						enableAttribute( attributes[ "morphNormal" + m ] );
						GL.vertexAttribPointer( attributes[ "morphNormal" + m ], 3, GL.FLOAT, false, 0, 0 );


					}

					object.__gpuMorphTargetInfluences[ m ] = influences[ influenceIndex ];

				} else {

					/*
					GL.vertexAttribPointer( attributes[ "morphTarget" + m ], 3, GL.FLOAT, false, 0, 0 );

					if ( material.morphNormals ) {

						GL.vertexAttribPointer( attributes[ "morphNormal" + m ], 3, GL.FLOAT, false, 0, 0 );

					}
					*/

					object.__gpuMorphTargetInfluences[ m ] = 0;

				}

				m ++;

			}

		}

		// load updated influences uniform

		if ( material.program.uniforms.morphTargetInfluences !== null ) {

			GL.uniform1fv( material.program.uniforms.morphTargetInfluences, object.__gpuMorphTargetInfluences );

		}

	};

	// Sorting

	function painterSortStable ( a, b ) {

		if ( a.z !== b.z ) {

			return b.z - a.z;

		} else {

			return a.id - b.id;

		}

	};

	function numericalSort ( a, b ) {

		return b[ 0 ] - a[ 0 ];

	};


	// Rendering

	render = function ( scene, camera, renderTarget, forceClear ) {

		if ( camera instanceof THREE.Camera === false ) {

			console.error( 'THREE.OpenGLRenderer.render: camera is not an instance of THREE.Camera.' );
			return;

		}

		var i, il,

		openglObject, object,
		renderList,

		lights = scene.__lights,
		fog = scene.fog;

		// reset caching for frame

		_currentMaterialId = -1;
		_lightsNeedUpdate = true;

		// update scene graph

		if ( scene.autoUpdate === true ) scene.updateMatrixWorld();

		// update camera matrices and frustum

		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse( camera.matrixWorld );

		_projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
		_frustum.setFromMatrix( _projScreenMatrix );

		// update OpenGL objects

		if ( autoUpdateObjects ) initOpenGLObjects( scene );

		// custom render plugins (pre pass)

		renderPlugins( renderPluginsPre, scene, camera );

		//

		info.render.calls = 0;
		info.render.vertices = 0;
		info.render.faces = 0;
		info.render.points = 0;

		setRenderTarget( renderTarget );

		if ( autoClear || forceClear ) {

			clear( autoClearColor, autoClearDepth, autoClearStencil );

		}

		// set matrices for regular objects (frustum culled)

		renderList = scene.__gpuObjects;

		for ( i = 0, il = renderList.length; i < il; i ++ ) {

			openglObject = renderList[ i ];
			object = openglObject.object;

			openglObject.id = i;
			openglObject.render = false;

			if ( object.visible ) {

				if ( ! ( object instanceof THREE.Mesh || object instanceof THREE.ParticleSystem ) || ! ( object.frustumCulled ) || _frustum.intersectsObject( object ) ) {

					setupMatrices( object, camera );

					unrollBufferMaterial( openglObject );

					openglObject.render = true;

					if ( sortObjects === true ) {

						if ( object.renderDepth !== null ) {

							openglObject.z = object.renderDepth;

						} else {

							_vector3.getPositionFromMatrix( object.matrixWorld );
							_vector3.applyProjection( _projScreenMatrix );

							openglObject.z = _vector3.z;

						}

					}

				}

			}

		}

		if ( sortObjects ) {

			renderList.sort( painterSortStable );

		}

		// set matrices for immediate objects

		renderList = scene.__gpuObjectsImmediate;

		for ( i = 0, il = renderList.length; i < il; i ++ ) {

			openglObject = renderList[ i ];
			object = openglObject.object;

			if ( object.visible ) {

				setupMatrices( object, camera );

				unrollImmediateBufferMaterial( openglObject );

			}

		}

		if ( scene.overrideMaterial ) {

			var material = scene.overrideMaterial;

			setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst );
			setDepthTest( material.depthTest );
			setDepthWrite( material.depthWrite );
			setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );

			renderObjects( scene.__gpuObjects, false, "", camera, lights, fog, true, material );
			renderObjectsImmediate( scene.__gpuObjectsImmediate, "", camera, lights, fog, false, material );

		} else {

			var material = null;

			// opaque pass (front-to-back order)

			setBlending( THREE.NoBlending );

			renderObjects( scene.__gpuObjects, true, "opaque", camera, lights, fog, false, material );
			renderObjectsImmediate( scene.__gpuObjectsImmediate, "opaque", camera, lights, fog, false, material );

			// transparent pass (back-to-front order)

			renderObjects( scene.__gpuObjects, false, "transparent", camera, lights, fog, true, material );
			renderObjectsImmediate( scene.__gpuObjectsImmediate, "transparent", camera, lights, fog, true, material );

		}

		// custom render plugins (post pass)

		renderPlugins( renderPluginsPost, scene, camera );


		// Generate mipmap if we're using any kind of mipmap filtering

		if ( renderTarget && renderTarget.generateMipmaps && renderTarget.minFilter !== THREE.NearestFilter && renderTarget.minFilter !== THREE.LinearFilter ) {

			updateRenderTargetMipmap( renderTarget );

		}

		// Ensure depth buffer writing is enabled so it can be cleared on next render

		setDepthTest( true );
		setDepthWrite( true );

		// GL.finish();

	};

	function renderPlugins( plugins, scene, camera ) {

		if ( ! plugins.length ) return;

		for ( var i = 0, il = plugins.length; i < il; i ++ ) {

			// reset state for plugin (to start from clean slate)

			_currentProgram = null;
			_currentCamera = null;

			_oldBlending = -1;
			_oldDepthTest = -1;
			_oldDepthWrite = -1;
			_oldDoubleSided = -1;
			_oldFlipSided = -1;
			_currentGeometryGroupHash = -1;
			_currentMaterialId = -1;

			_lightsNeedUpdate = true;

			plugins[ i ].render( scene, camera, _currentWidth, _currentHeight );

			// reset state after plugin (anything could have changed)

			_currentProgram = null;
			_currentCamera = null;

			_oldBlending = -1;
			_oldDepthTest = -1;
			_oldDepthWrite = -1;
			_oldDoubleSided = -1;
			_oldFlipSided = -1;
			_currentGeometryGroupHash = -1;
			_currentMaterialId = -1;

			_lightsNeedUpdate = true;

		}

	};

	function renderObjects ( renderList, reverse, materialType, camera, lights, fog, useBlending, overrideMaterial ) {

		var openglObject, object, buffer, material, start, end, delta;

		if ( reverse ) {

			start = renderList.length - 1;
			end = -1;
			delta = -1;

		} else {

			start = 0;
			end = renderList.length;
			delta = 1;
		}

		for ( var i = start; i !== end; i += delta ) {

			openglObject = renderList[ i ];

			if ( openglObject.render ) {

				object = openglObject.object;
				buffer = openglObject.buffer;

				if ( overrideMaterial ) {

					material = overrideMaterial;

				} else {

					material = openglObject[ materialType ];

					if ( ! material ) continue;

					if ( useBlending ) setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst );

					setDepthTest( material.depthTest );
					setDepthWrite( material.depthWrite );
					setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );

				}

				setMaterialFaces( material );

				if ( buffer instanceof THREE.BufferGeometry ) {

					renderBufferDirect( camera, lights, fog, material, buffer, object );

				} else {

					renderBuffer( camera, lights, fog, material, buffer, object );

				}

			}

		}

	};

	function renderObjectsImmediate ( renderList, materialType, camera, lights, fog, useBlending, overrideMaterial ) {

		var openglObject, object, material, program;

		for ( var i = 0, il = renderList.length; i < il; i ++ ) {

			openglObject = renderList[ i ];
			object = openglObject.object;

			if ( object.visible ) {

				if ( overrideMaterial ) {

					material = overrideMaterial;

				} else {

					material = openglObject[ materialType ];

					if ( ! material ) continue;

					if ( useBlending ) setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst );

					setDepthTest( material.depthTest );
					setDepthWrite( material.depthWrite );
					setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );

				}

				renderImmediateObject( camera, lights, fog, material, object );

			}

		}

	};

	renderImmediateObject = function ( camera, lights, fog, material, object ) {

		var program = setProgram( camera, lights, fog, material, object );

		_currentGeometryGroupHash = -1;

		setMaterialFaces( material );

		if ( object.immediateRenderCallback ) {

			object.immediateRenderCallback( program, GL, _frustum );

		} else {

			object.render( function( object ) { renderBufferImmediate( object, program, material ); } );

		}

	};

	function unrollImmediateBufferMaterial ( globject ) {

		var object = globject.object,
			material = object.material;

		if ( material.transparent ) {

			globject.transparent = material;
			globject.opaque = null;

		} else {

			globject.opaque = material;
			globject.transparent = null;

		}

	};

	function unrollBufferMaterial ( globject ) {

		var object = globject.object,
			buffer = globject.buffer,
			material, materialIndex, meshMaterial;

		meshMaterial = object.material;

		if ( meshMaterial instanceof THREE.MeshFaceMaterial ) {

			materialIndex = buffer.materialIndex;

			material = meshMaterial.materials[ materialIndex ];

			if ( material.transparent ) {

				globject.transparent = material;
				globject.opaque = null;

			} else {

				globject.opaque = material;
				globject.transparent = null;

			}

		} else {

			material = meshMaterial;

			if ( material ) {

				if ( material.transparent ) {

					globject.transparent = material;
					globject.opaque = null;

				} else {

					globject.opaque = material;
					globject.transparent = null;

				}

			}

		}

	};

	// Geometry splitting

	function sortFacesByMaterial ( geometry, material ) {

		var f, fl, face, materialIndex, vertices,
			groupHash, hash_map = {};

		var numMorphTargets = geometry.morphTargets.length;
		var numMorphNormals = geometry.morphNormals.length;

		var usesFaceMaterial = material instanceof THREE.MeshFaceMaterial;

		geometry.geometryGroups = {};

		for ( f = 0, fl = geometry.faces.length; f < fl; f ++ ) {

			face = geometry.faces[ f ];
			materialIndex = usesFaceMaterial ? face.materialIndex : 0;

			if ( hash_map[ materialIndex ] === undefined ) {

				hash_map[ materialIndex ] = { 'hash': materialIndex, 'counter': 0 };

			}

			groupHash = hash_map[ materialIndex ].hash + '_' + hash_map[ materialIndex ].counter;

			if ( geometry.geometryGroups[ groupHash ] === undefined ) {

				geometry.geometryGroups[ groupHash ] = { 'faces3': [], 'faces4': [], 'materialIndex': materialIndex, 'vertices': 0, 'numMorphTargets': numMorphTargets, 'numMorphNormals': numMorphNormals };

			}

			vertices = face instanceof THREE.Face3 ? 3 : 4;

			if ( geometry.geometryGroups[ groupHash ].vertices + vertices > 65535 ) {

				hash_map[ materialIndex ].counter += 1;
				groupHash = hash_map[ materialIndex ].hash + '_' + hash_map[ materialIndex ].counter;

				if ( geometry.geometryGroups[ groupHash ] === undefined ) {

					geometry.geometryGroups[ groupHash ] = { 'faces3': [], 'faces4': [], 'materialIndex': materialIndex, 'vertices': 0, 'numMorphTargets': numMorphTargets, 'numMorphNormals': numMorphNormals };

				}

			}

			if ( face instanceof THREE.Face3 ) {

				geometry.geometryGroups[ groupHash ].faces3.push( f );

			} else {

				geometry.geometryGroups[ groupHash ].faces4.push( f );

			}

			geometry.geometryGroups[ groupHash ].vertices += vertices;

		}

		geometry.geometryGroupsList = [];

		for ( var g in geometry.geometryGroups ) {

			geometry.geometryGroups[ g ].id = _geometryGroupCounter ++;

			geometry.geometryGroupsList.push( geometry.geometryGroups[ g ] );

		}

	};

	// Objects refresh

	initOpenGLObjects = function ( scene ) {

		if ( !scene.__gpuObjects ) {

			scene.__gpuObjects = [];
			scene.__gpuObjectsImmediate = [];
			scene.__gpuSprites = [];
			scene.__gpuFlares = [];

		}

		while ( scene.__objectsAdded.length ) {

			addObject( scene.__objectsAdded[ 0 ], scene );
			scene.__objectsAdded.splice( 0, 1 );

		}

		while ( scene.__objectsRemoved.length ) {

			removeObject( scene.__objectsRemoved[ 0 ], scene );
			scene.__objectsRemoved.splice( 0, 1 );

		}

		// update must be called after objects adding / removal

		for ( var o = 0, ol = scene.__gpuObjects.length; o < ol; o ++ ) {

			var object = scene.__gpuObjects[ o ].object;

			// TODO: Remove hack (OpenGLRenderer refactoring)

			if ( object.__gpuInit === undefined ) {

				if ( object.__gpuActive !== undefined ) {

					removeObject( object, scene );

				}

				addObject( object, scene );

			}

			updateObject( object );

		}

	};

	// Objects adding

	function addObject( object, scene ) {

		var g, geometry, material, geometryGroup;

		if ( object.__gpuInit === undefined ) {

			object.__gpuInit = true;

			object._modelViewMatrix = new THREE.Matrix4();
			object._normalMatrix = new THREE.Matrix3();

			if ( object.geometry !== undefined && object.geometry.__gpuInit === undefined ) {

				object.geometry.__gpuInit = true;
				object.geometry.addEventListener( 'dispose', onGeometryDispose );

			}

			geometry = object.geometry;

			if ( geometry === undefined ) {

				// fail silently for now

			} else if ( geometry instanceof THREE.BufferGeometry ) {

				initDirectBuffers( geometry );

			} else if ( object instanceof THREE.Mesh ) {

				material = object.material;

				if ( geometry.geometryGroups === undefined ) {

					sortFacesByMaterial( geometry, material );

				}

				// create separate VBOs per geometry chunk

				for ( g in geometry.geometryGroups ) {

					geometryGroup = geometry.geometryGroups[ g ];

					// initialise VBO on the first access

					if ( ! geometryGroup.__gpuVertexBuffer ) {

						createMeshBuffers( geometryGroup );
						initMeshBuffers( geometryGroup, object );

						geometry.verticesNeedUpdate = true;
						geometry.morphTargetsNeedUpdate = true;
						geometry.elementsNeedUpdate = true;
						geometry.uvsNeedUpdate = true;
						geometry.normalsNeedUpdate = true;
						geometry.tangentsNeedUpdate = true;
						geometry.colorsNeedUpdate = true;

					}

				}

			} else if ( object instanceof THREE.Ribbon ) {

				if ( ! geometry.__gpuVertexBuffer ) {

					createRibbonBuffers( geometry );
					initRibbonBuffers( geometry, object );

					geometry.verticesNeedUpdate = true;
					geometry.colorsNeedUpdate = true;
					geometry.normalsNeedUpdate = true;

				}

			} else if ( object instanceof THREE.Line ) {

				if ( ! geometry.__gpuVertexBuffer ) {

					createLineBuffers( geometry );
					initLineBuffers( geometry, object );

					geometry.verticesNeedUpdate = true;
					geometry.colorsNeedUpdate = true;
					geometry.lineDistancesNeedUpdate = true;

				}

			} else if ( object instanceof THREE.ParticleSystem ) {

				if ( ! geometry.__gpuVertexBuffer ) {

					createParticleBuffers( geometry );
					initParticleBuffers( geometry, object );

					geometry.verticesNeedUpdate = true;
					geometry.colorsNeedUpdate = true;

				}

			}

		}

		if ( object.__gpuActive === undefined ) {

			if ( object instanceof THREE.Mesh ) {

				geometry = object.geometry;

				if ( geometry instanceof THREE.BufferGeometry ) {

					addBuffer( scene.__gpuObjects, geometry, object );

				} else if ( geometry instanceof THREE.Geometry ) {

					for ( g in geometry.geometryGroups ) {

						geometryGroup = geometry.geometryGroups[ g ];

						addBuffer( scene.__gpuObjects, geometryGroup, object );

					}

				}

			} else if ( object instanceof THREE.Ribbon ||
						object instanceof THREE.Line ||
						object instanceof THREE.ParticleSystem )
			{

				geometry = object.geometry;
				addBuffer( scene.__gpuObjects, geometry, object );

			} else if ( object instanceof THREE.ImmediateRenderObject || object.immediateRenderCallback ) {

				addBufferImmediate( scene.__gpuObjectsImmediate, object );

			} else if ( object instanceof THREE.Sprite ) {

				scene.__gpuSprites.push( object );

			} else if ( object instanceof THREE.LensFlare ) {

				scene.__gpuFlares.push( object );

			}

			object.__gpuActive = true;

		}

	};

	function addBuffer( objlist, buffer, object ) {

		objlist.push(
			{
				id: null,
				buffer: buffer,
				object: object,
				opaque: null,
				transparent: null,
				z: 0
			}
		);

	};

	function addBufferImmediate( objlist, object ) {

		objlist.push(
			{
				id: null,
				object: object,
				opaque: null,
				transparent: null,
				z: 0
			}
		);

	};

	// Objects updates

	function updateObject( object ) {

		var geometry = object.geometry,
			geometryGroup, customAttributesDirty, material;

		if ( geometry instanceof THREE.BufferGeometry ) {

			setDirectBuffers( geometry, GL.DYNAMIC_DRAW, !geometry.dynamic );

		} else if ( object instanceof THREE.Mesh ) {

			// check all geometry groups

			for( var i = 0, il = geometry.geometryGroupsList.length; i < il; i ++ ) {

				geometryGroup = geometry.geometryGroupsList[ i ];

				material = getBufferMaterial( object, geometryGroup );

				if ( geometry.buffersNeedUpdate ) {

					initMeshBuffers( geometryGroup, object );

				}

				customAttributesDirty = material.attributes && areCustomAttributesDirty( material );

				if ( geometry.verticesNeedUpdate || geometry.morphTargetsNeedUpdate || geometry.elementsNeedUpdate ||
					 geometry.uvsNeedUpdate || geometry.normalsNeedUpdate ||
					 geometry.colorsNeedUpdate || geometry.tangentsNeedUpdate || customAttributesDirty ) {

					setMeshBuffers( geometryGroup, object, GL.DYNAMIC_DRAW, !geometry.dynamic, material );

				}

			}

			geometry.verticesNeedUpdate = false;
			geometry.morphTargetsNeedUpdate = false;
			geometry.elementsNeedUpdate = false;
			geometry.uvsNeedUpdate = false;
			geometry.normalsNeedUpdate = false;
			geometry.colorsNeedUpdate = false;
			geometry.tangentsNeedUpdate = false;

			geometry.buffersNeedUpdate = false;

			material.attributes && clearCustomAttributes( material );

		} else if ( object instanceof THREE.Ribbon ) {

			material = getBufferMaterial( object, geometry );

			customAttributesDirty = material.attributes && areCustomAttributesDirty( material );

			if ( geometry.verticesNeedUpdate || geometry.colorsNeedUpdate || geometry.normalsNeedUpdate || customAttributesDirty ) {

				setRibbonBuffers( geometry, GL.DYNAMIC_DRAW );

			}

			geometry.verticesNeedUpdate = false;
			geometry.colorsNeedUpdate = false;
			geometry.normalsNeedUpdate = false;

			material.attributes && clearCustomAttributes( material );

		} else if ( object instanceof THREE.Line ) {

			material = getBufferMaterial( object, geometry );

			customAttributesDirty = material.attributes && areCustomAttributesDirty( material );

			if ( geometry.verticesNeedUpdate || geometry.colorsNeedUpdate || geometry.lineDistancesNeedUpdate || customAttributesDirty ) {

				setLineBuffers( geometry, GL.DYNAMIC_DRAW );

			}

			geometry.verticesNeedUpdate = false;
			geometry.colorsNeedUpdate = false;
			geometry.lineDistancesNeedUpdate = false;

			material.attributes && clearCustomAttributes( material );


		} else if ( object instanceof THREE.ParticleSystem ) {

			material = getBufferMaterial( object, geometry );

			customAttributesDirty = material.attributes && areCustomAttributesDirty( material );

			if ( geometry.verticesNeedUpdate || geometry.colorsNeedUpdate || object.sortParticles || customAttributesDirty ) {

				setParticleBuffers( geometry, GL.DYNAMIC_DRAW, object );

			}

			geometry.verticesNeedUpdate = false;
			geometry.colorsNeedUpdate = false;

			material.attributes && clearCustomAttributes( material );

		}

	};

	// Objects updates - custom attributes check

	function areCustomAttributesDirty( material ) {

		for ( var a in material.attributes ) {

			if ( material.attributes[ a ].needsUpdate ) return true;

		}

		return false;

	};

	function clearCustomAttributes( material ) {

		for ( var a in material.attributes ) {

			material.attributes[ a ].needsUpdate = false;

		}

	};

	// Objects removal

	function removeObject( object, scene ) {

		if ( object instanceof THREE.Mesh  ||
			 object instanceof THREE.ParticleSystem ||
			 object instanceof THREE.Ribbon ||
			 object instanceof THREE.Line ) {

			removeInstances( scene.__gpuObjects, object );

		} else if ( object instanceof THREE.Sprite ) {

			removeInstancesDirect( scene.__gpuSprites, object );

		} else if ( object instanceof THREE.LensFlare ) {

			removeInstancesDirect( scene.__gpuFlares, object );

		} else if ( object instanceof THREE.ImmediateRenderObject || object.immediateRenderCallback ) {

			removeInstances( scene.__gpuObjectsImmediate, object );

		}

		delete object.__gpuActive;

	};

	function removeInstances( objlist, object ) {

		for ( var o = objlist.length - 1; o >= 0; o -- ) {

			if ( objlist[ o ].object === object ) {

				objlist.splice( o, 1 );

			}

		}

	};

	function removeInstancesDirect( objlist, object ) {

		for ( var o = objlist.length - 1; o >= 0; o -- ) {

			if ( objlist[ o ] === object ) {

				objlist.splice( o, 1 );

			}

		}

	};

	// Materials

	initMaterial = function ( material, lights, fog, object ) {

		material.addEventListener( 'dispose', onMaterialDispose );

		var u, a, identifiers, i, parameters, maxLightCount, maxBones, maxShadows, shaderID;

		if ( material instanceof THREE.MeshDepthMaterial ) {

			shaderID = 'depth';

		} else if ( material instanceof THREE.MeshNormalMaterial ) {

			shaderID = 'normal';

		} else if ( material instanceof THREE.MeshBasicMaterial ) {

			shaderID = 'basic';

		} else if ( material instanceof THREE.MeshLambertMaterial ) {

			shaderID = 'lambert';

		} else if ( material instanceof THREE.MeshPhongMaterial ) {

			shaderID = 'phong';

		} else if ( material instanceof THREE.LineBasicMaterial ) {

			shaderID = 'basic';

		} else if ( material instanceof THREE.LineDashedMaterial ) {

			shaderID = 'dashed';

		} else if ( material instanceof THREE.ParticleBasicMaterial ) {

			shaderID = 'particle_basic';

		}

		if ( shaderID ) {

			setMaterialShaders( material, THREE.ShaderLib[ shaderID ] );

		}

		// heuristics to create shader parameters according to lights in the scene
		// (not to blow over maxLights budget)

		maxLightCount = allocateLights( lights );

		maxShadows = allocateShadows( lights );

		maxBones = allocateBones( object );

		parameters = {

			map: !!material.map,
			envMap: !!material.envMap,
			lightMap: !!material.lightMap,
			bumpMap: !!material.bumpMap,
			normalMap: !!material.normalMap,
			specularMap: !!material.specularMap,

			vertexColors: material.vertexColors,

			fog: fog,
			useFog: material.fog,
			fogExp: fog instanceof THREE.FogExp2,

			sizeAttenuation: material.sizeAttenuation,

			skinning: material.skinning,
			maxBones: maxBones,
			useVertexTexture: _supportsBoneTextures && object && object.useVertexTexture,
			boneTextureWidth: object && object.boneTextureWidth,
			boneTextureHeight: object && object.boneTextureHeight,

			morphTargets: material.morphTargets,
			morphNormals: material.morphNormals,
			maxMorphTargets: maxMorphTargets,
			maxMorphNormals: maxMorphNormals,

			maxDirLights: maxLightCount.directional,
			maxPointLights: maxLightCount.point,
			maxSpotLights: maxLightCount.spot,
			maxHemiLights: maxLightCount.hemi,

			maxShadows: maxShadows,
			shadowMapEnabled: shadowMapEnabled && object.receiveShadow,
			shadowMapType: shadowMapType,
			shadowMapDebug: shadowMapDebug,
			shadowMapCascade: shadowMapCascade,

			alphaTest: material.alphaTest,
			metal: material.metal,
			perPixel: material.perPixel,
			wrapAround: material.wrapAround,
			doubleSided: material.side === THREE.DoubleSide,
			flipSided: material.side === THREE.BackSide

		};

		material.program = buildProgram( shaderID, material.fragmentShader, material.vertexShader, material.uniforms, material.attributes, material.defines, parameters );

		var attributes = material.program.attributes;

		if ( material.morphTargets ) {

			material.numSupportedMorphTargets = 0;

			var id, base = "morphTarget";

			for ( i = 0; i < maxMorphTargets; i ++ ) {

				id = base + i;

				if ( attributes[ id ] >= 0 ) {

					material.numSupportedMorphTargets ++;

				}

			}

		}

		if ( material.morphNormals ) {

			material.numSupportedMorphNormals = 0;

			var id, base = "morphNormal";

			for ( i = 0; i < maxMorphNormals; i ++ ) {

				id = base + i;

				if ( attributes[ id ] >= 0 ) {

					material.numSupportedMorphNormals ++;

				}

			}

		}

		material.uniformsList = [];

		for ( u in material.uniforms ) {

			material.uniformsList.push( [ material.uniforms[ u ], u ] );

		}

	};

	function setMaterialShaders( material, shaders ) {

		material.uniforms = THREE.UniformsUtils.clone( shaders.uniforms );
		material.vertexShader = shaders.vertexShader;
		material.fragmentShader = shaders.fragmentShader;

	};

	function setProgram( camera, lights, fog, material, object ) {

		_usedTextureUnits = 0;

		if ( material.needsUpdate ) {

			if ( material.program ) deallocateMaterial( material );

			initMaterial( material, lights, fog, object );
			material.needsUpdate = false;

		}

		if ( material.morphTargets ) {

			if ( ! object.__gpuMorphTargetInfluences ) {

				object.__gpuMorphTargetInfluences = new Float32Array( maxMorphTargets );

			}

		}

		var refreshMaterial = false;

		var program = material.program,
			p_uniforms = program.uniforms,
			m_uniforms = material.uniforms;

		if ( program !== _currentProgram ) {

			GL.useProgram( program );
			_currentProgram = program;

			refreshMaterial = true;

		}

		if ( material.id !== _currentMaterialId ) {

			_currentMaterialId = material.id;
			refreshMaterial = true;

		}

		if ( refreshMaterial || camera !== _currentCamera ) {

			GL.uniformMatrix4fv( p_uniforms.projectionMatrix, false, camera.projectionMatrix.elements );

			if ( camera !== _currentCamera ) _currentCamera = camera;

		}

		// skinning uniforms must be set even if material didn't change
		// auto-setting of texture unit for bone texture must go before other textures
		// not sure why, but otherwise weird things happen

		if ( material.skinning ) {

			if ( _supportsBoneTextures && object.useVertexTexture ) {

				if ( p_uniforms.boneTexture !== null ) {

					var textureUnit = getTextureUnit();

					GL.uniform1i( p_uniforms.boneTexture, textureUnit );
					setTexture( object.boneTexture, textureUnit );

				}

			} else {

				if ( p_uniforms.boneGlobalMatrices !== null ) {

					GL.uniformMatrix4fv( p_uniforms.boneGlobalMatrices, false, object.boneMatrices );

				}

			}

		}

		if ( refreshMaterial ) {

			// refresh uniforms common to several materials

			if ( fog && material.fog ) {

				refreshUniformsFog( m_uniforms, fog );

			}

			if ( material instanceof THREE.MeshPhongMaterial ||
				 material instanceof THREE.MeshLambertMaterial ||
				 material.lights ) {

				if ( _lightsNeedUpdate ) {

					setupLights( program, lights );
					_lightsNeedUpdate = false;

				}

				refreshUniformsLights( m_uniforms, _lights );

			}

			if ( material instanceof THREE.MeshBasicMaterial ||
				 material instanceof THREE.MeshLambertMaterial ||
				 material instanceof THREE.MeshPhongMaterial ) {

				refreshUniformsCommon( m_uniforms, material );

			}

			// refresh single material specific uniforms

			if ( material instanceof THREE.LineBasicMaterial ) {

				refreshUniformsLine( m_uniforms, material );

			} else if ( material instanceof THREE.LineDashedMaterial ) {

				refreshUniformsLine( m_uniforms, material );
				refreshUniformsDash( m_uniforms, material );

			} else if ( material instanceof THREE.ParticleBasicMaterial ) {

				refreshUniformsParticle( m_uniforms, material );

			} else if ( material instanceof THREE.MeshPhongMaterial ) {

				refreshUniformsPhong( m_uniforms, material );

			} else if ( material instanceof THREE.MeshLambertMaterial ) {

				refreshUniformsLambert( m_uniforms, material );

			} else if ( material instanceof THREE.MeshDepthMaterial ) {

				m_uniforms.mNear.value = camera.near;
				m_uniforms.mFar.value = camera.far;
				m_uniforms.opacity.value = material.opacity;

			} else if ( material instanceof THREE.MeshNormalMaterial ) {

				m_uniforms.opacity.value = material.opacity;

			}

			if ( object.receiveShadow && ! material._shadowPass ) {

				refreshUniformsShadow( m_uniforms, lights );

			}

			// load common uniforms

			loadUniformsGeneric( program, material.uniformsList );

			// load material specific uniforms
			// (shader material also gets them for the sake of genericity)

			if ( material instanceof THREE.ShaderMaterial ||
				 material instanceof THREE.MeshPhongMaterial ||
				 material.envMap ) {

				if ( p_uniforms.cameraPosition !== null ) {

					_vector3.getPositionFromMatrix( camera.matrixWorld );
					GL.uniform3f( p_uniforms.cameraPosition, _vector3.x, _vector3.y, _vector3.z );

				}

			}

			if ( material instanceof THREE.MeshPhongMaterial ||
				 material instanceof THREE.MeshLambertMaterial ||
				 material instanceof THREE.ShaderMaterial ||
				 material.skinning ) {

				if ( p_uniforms.viewMatrix !== null ) {

					GL.uniformMatrix4fv( p_uniforms.viewMatrix, false, camera.matrixWorldInverse.elements );

				}

			}

		}

		loadUniformsMatrices( p_uniforms, object );

		if ( p_uniforms.modelMatrix !== null ) {

			GL.uniformMatrix4fv( p_uniforms.modelMatrix, false, object.matrixWorld.elements );

		}

		return program;

	};

	// Uniforms (refresh uniforms objects)

	function refreshUniformsCommon ( uniforms, material ) {

		uniforms.opacity.value = material.opacity;

		if ( gammaInput ) {

			uniforms.diffuse.value.copyGammaToLinear( material.color );

		} else {

			uniforms.diffuse.value = material.color;

		}

		uniforms.map.value = material.map;
		uniforms.lightMap.value = material.lightMap;
		uniforms.specularMap.value = material.specularMap;

		if ( material.bumpMap ) {

			uniforms.bumpMap.value = material.bumpMap;
			uniforms.bumpScale.value = material.bumpScale;

		}

		if ( material.normalMap ) {

			uniforms.normalMap.value = material.normalMap;
			uniforms.normalScale.value.copy( material.normalScale );

		}

		// uv repeat and offset setting priorities
		//	1. color map
		//	2. specular map
		//	3. normal map
		//	4. bump map

		var uvScaleMap;

		if ( material.map ) {

			uvScaleMap = material.map;

		} else if ( material.specularMap ) {

			uvScaleMap = material.specularMap;

		} else if ( material.normalMap ) {

			uvScaleMap = material.normalMap;

		} else if ( material.bumpMap ) {

			uvScaleMap = material.bumpMap;

		}

		if ( uvScaleMap !== undefined ) {

			var offset = uvScaleMap.offset;
			var repeat = uvScaleMap.repeat;

			uniforms.offsetRepeat.value.set( offset.x, offset.y, repeat.x, repeat.y );

		}

		uniforms.envMap.value = material.envMap;
		uniforms.flipEnvMap.value = ( material.envMap instanceof THREE.OpenGLRenderTargetCube ) ? 1 : -1;

		if ( gammaInput ) {

			//uniforms.reflectivity.value = material.reflectivity * material.reflectivity;
			uniforms.reflectivity.value = material.reflectivity;

		} else {

			uniforms.reflectivity.value = material.reflectivity;

		}

		uniforms.refractionRatio.value = material.refractionRatio;
		uniforms.combine.value = material.combine;
		uniforms.useRefract.value = material.envMap && material.envMap.mapping instanceof THREE.CubeRefractionMapping;

	};

	function refreshUniformsLine ( uniforms, material ) {

		uniforms.diffuse.value = material.color;
		uniforms.opacity.value = material.opacity;

	};

	function refreshUniformsDash ( uniforms, material ) {

		uniforms.dashSize.value = material.dashSize;
		uniforms.totalSize.value = material.dashSize + material.gapSize;
		uniforms.scale.value = material.scale;

	};

	function refreshUniformsParticle ( uniforms, material ) {

		uniforms.psColor.value = material.color;
		uniforms.opacity.value = material.opacity;
		uniforms.size.value = material.size;
		uniforms.scale.value = _canvas.height / 2.0; // TODO: Cache 

		uniforms.map.value = material.map;

	};

	function refreshUniformsFog ( uniforms, fog ) {

		uniforms.fogColor.value = fog.color;

		if ( fog instanceof THREE.Fog ) {

			uniforms.fogNear.value = fog.near;
			uniforms.fogFar.value = fog.far;

		} else if ( fog instanceof THREE.FogExp2 ) {

			uniforms.fogDensity.value = fog.density;

		}

	};

	function refreshUniformsPhong ( uniforms, material ) {

		uniforms.shininess.value = material.shininess;

		if ( gammaInput ) {

			uniforms.ambient.value.copyGammaToLinear( material.ambient );
			uniforms.emissive.value.copyGammaToLinear( material.emissive );
			uniforms.specular.value.copyGammaToLinear( material.specular );

		} else {

			uniforms.ambient.value = material.ambient;
			uniforms.emissive.value = material.emissive;
			uniforms.specular.value = material.specular;

		}

		if ( material.wrapAround ) {

			uniforms.wrapRGB.value.copy( material.wrapRGB );

		}

	};

	function refreshUniformsLambert ( uniforms, material ) {

		if ( gammaInput ) {

			uniforms.ambient.value.copyGammaToLinear( material.ambient );
			uniforms.emissive.value.copyGammaToLinear( material.emissive );

		} else {

			uniforms.ambient.value = material.ambient;
			uniforms.emissive.value = material.emissive;

		}

		if ( material.wrapAround ) {

			uniforms.wrapRGB.value.copy( material.wrapRGB );

		}

	};

	function refreshUniformsLights ( uniforms, lights ) {

		uniforms.ambientLightColor.value = lights.ambient;

		uniforms.directionalLightColor.value = lights.directional.colors;
		uniforms.directionalLightDirection.value = lights.directional.positions;

		uniforms.pointLightColor.value = lights.point.colors;
		uniforms.pointLightPosition.value = lights.point.positions;
		uniforms.pointLightDistance.value = lights.point.distances;

		uniforms.spotLightColor.value = lights.spot.colors;
		uniforms.spotLightPosition.value = lights.spot.positions;
		uniforms.spotLightDistance.value = lights.spot.distances;
		uniforms.spotLightDirection.value = lights.spot.directions;
		uniforms.spotLightAngleCos.value = lights.spot.anglesCos;
		uniforms.spotLightExponent.value = lights.spot.exponents;

		uniforms.hemisphereLightSkyColor.value = lights.hemi.skyColors;
		uniforms.hemisphereLightGroundColor.value = lights.hemi.groundColors;
		uniforms.hemisphereLightDirection.value = lights.hemi.positions;

	};

	function refreshUniformsShadow ( uniforms, lights ) {

		if ( uniforms.shadowMatrix ) {

			var j = 0;

			for ( var i = 0, il = lights.length; i < il; i ++ ) {

				var light = lights[ i ];

				if ( ! light.castShadow ) continue;

				if ( light instanceof THREE.SpotLight || ( light instanceof THREE.DirectionalLight && ! light.shadowCascade ) ) {

					uniforms.shadowMap.value[ j ] = light.shadowMap;
					uniforms.shadowMapSize.value[ j ] = light.shadowMapSize;

					uniforms.shadowMatrix.value[ j ] = light.shadowMatrix;

					uniforms.shadowDarkness.value[ j ] = light.shadowDarkness;
					uniforms.shadowBias.value[ j ] = light.shadowBias;

					j ++;

				}

			}

		}

	};

	// Uniforms (load to GPU)

	function loadUniformsMatrices ( uniforms, object ) {

		GL.uniformMatrix4fv( uniforms.modelViewMatrix, false, object._modelViewMatrix.elements );

		if ( uniforms.normalMatrix ) {

			GL.uniformMatrix3fv( uniforms.normalMatrix, false, object._normalMatrix.elements );

		}

	};

	function getTextureUnit() {

		var textureUnit = _usedTextureUnits;

		if ( textureUnit >= _maxTextures ) {

			console.warn( "OpenGLRenderer: trying to use " + textureUnit + " texture units while GPU supports only " + _maxTextures );

		}

		_usedTextureUnits += 1;

		return textureUnit;

	};

	function loadUniformsGeneric ( program, uniforms ) {

		var uniform, value, type, location, texture, textureUnit, i, il, j, jl, offset;

		for ( j = 0, jl = uniforms.length; j < jl; j ++ ) {

			location = program.uniforms[ uniforms[ j ][ 1 ] ];
			if ( !location ) continue;

			uniform = uniforms[ j ][ 0 ];

			type = uniform.type;
			value = uniform.value;

			if ( type === "i" ) { // single integer

				GL.uniform1i( location, value );

			} else if ( type === "f" ) { // single float

				GL.uniform1f( location, value );

			} else if ( type === "v2" ) { // single THREE.Vector2

				GL.uniform2f( location, value.x, value.y );

			} else if ( type === "v3" ) { // single THREE.Vector3

				GL.uniform3f( location, value.x, value.y, value.z );

			} else if ( type === "v4" ) { // single THREE.Vector4

				GL.uniform4f( location, value.x, value.y, value.z, value.w );

			} else if ( type === "c" ) { // single THREE.Color

				GL.uniform3f( location, value.r, value.g, value.b );

			} else if ( type === "iv1" ) { // flat array of integers (JS or typed array)

				GL.uniform1iv( location, value );

			} else if ( type === "iv" ) { // flat array of integers with 3 x N size (JS or typed array)

				GL.uniform3iv( location, value );

			} else if ( type === "fv1" ) { // flat array of floats (JS or typed array)

				GL.uniform1fv( location, value );

			} else if ( type === "fv" ) { // flat array of floats with 3 x N size (JS or typed array)

				GL.uniform3fv( location, value );

			} else if ( type === "v2v" ) { // array of THREE.Vector2

				if ( uniform._array === undefined ) {

					uniform._array = new Float32Array( 2 * value.length );

				}

				for ( i = 0, il = value.length; i < il; i ++ ) {

					offset = i * 2;

					uniform._array[ offset ] 	 = value[ i ].x;
					uniform._array[ offset + 1 ] = value[ i ].y;

				}

				GL.uniform2fv( location, uniform._array );

			} else if ( type === "v3v" ) { // array of THREE.Vector3

				if ( uniform._array === undefined ) {

					uniform._array = new Float32Array( 3 * value.length );

				}

				for ( i = 0, il = value.length; i < il; i ++ ) {

					offset = i * 3;

					uniform._array[ offset ] 	 = value[ i ].x;
					uniform._array[ offset + 1 ] = value[ i ].y;
					uniform._array[ offset + 2 ] = value[ i ].z;

				}

				GL.uniform3fv( location, uniform._array );

			} else if ( type === "v4v" ) { // array of THREE.Vector4

				if ( uniform._array === undefined ) {

					uniform._array = new Float32Array( 4 * value.length );

				}

				for ( i = 0, il = value.length; i < il; i ++ ) {

					offset = i * 4;

					uniform._array[ offset ] 	 = value[ i ].x;
					uniform._array[ offset + 1 ] = value[ i ].y;
					uniform._array[ offset + 2 ] = value[ i ].z;
					uniform._array[ offset + 3 ] = value[ i ].w;

				}

				GL.uniform4fv( location, uniform._array );

			} else if ( type === "m4") { // single THREE.Matrix4

				if ( uniform._array === undefined ) {

					uniform._array = new Float32Array( 16 );

				}

				value.flattenToArray( uniform._array );
				GL.uniformMatrix4fv( location, false, uniform._array );

			} else if ( type === "m4v" ) { // array of THREE.Matrix4

				if ( uniform._array === undefined ) {

					uniform._array = new Float32Array( 16 * value.length );

				}

				for ( i = 0, il = value.length; i < il; i ++ ) {

					value[ i ].flattenToArrayOffset( uniform._array, i * 16 );

				}

				GL.uniformMatrix4fv( location, false, uniform._array );

			} else if ( type === "t" ) { // single THREE.Texture (2d or cube)

				texture = value;
				textureUnit = getTextureUnit();

				GL.uniform1i( location, textureUnit );

				if ( !texture ) continue;

				if ( texture.image instanceof Array && texture.image.length === 6 ) {

					setCubeTexture( texture, textureUnit );

				} else if ( texture instanceof THREE.OpenGLRenderTargetCube ) {

					setCubeTextureDynamic( texture, textureUnit );

				} else {

					setTexture( texture, textureUnit );

				}

			} else if ( type === "tv" ) { // array of THREE.Texture (2d)

				if ( uniform._array === undefined ) {

					uniform._array = [];

				}

				for( i = 0, il = uniform.value.length; i < il; i ++ ) {

					uniform._array[ i ] = getTextureUnit();

				}

				GL.uniform1iv( location, uniform._array );

				for( i = 0, il = uniform.value.length; i < il; i ++ ) {

					texture = uniform.value[ i ];
					textureUnit = uniform._array[ i ];

					if ( !texture ) continue;

					setTexture( texture, textureUnit );

				}

			} else {

				console.warn( 'THREE.OpenGLRenderer: Unknown uniform type: ' + type );

			}

		}

	};

	function setupMatrices ( object, camera ) {

		object._modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld );
		object._normalMatrix.getNormalMatrix( object._modelViewMatrix );

	};

	//

	function setColorGamma( array, offset, color, intensitySq ) {

		array[ offset ]     = color.r * color.r * intensitySq;
		array[ offset + 1 ] = color.g * color.g * intensitySq;
		array[ offset + 2 ] = color.b * color.b * intensitySq;

	};

	function setColorLinear( array, offset, color, intensity ) {

		array[ offset ]     = color.r * intensity;
		array[ offset + 1 ] = color.g * intensity;
		array[ offset + 2 ] = color.b * intensity;

	};

	function setupLights ( program, lights ) {

		var l, ll, light, n,
		r = 0, g = 0, b = 0,
		color, skyColor, groundColor,
		intensity,  intensitySq,
		position,
		distance,

		zlights = _lights,

		dirColors = zlights.directional.colors,
		dirPositions = zlights.directional.positions,

		pointColors = zlights.point.colors,
		pointPositions = zlights.point.positions,
		pointDistances = zlights.point.distances,

		spotColors = zlights.spot.colors,
		spotPositions = zlights.spot.positions,
		spotDistances = zlights.spot.distances,
		spotDirections = zlights.spot.directions,
		spotAnglesCos = zlights.spot.anglesCos,
		spotExponents = zlights.spot.exponents,

		hemiSkyColors = zlights.hemi.skyColors,
		hemiGroundColors = zlights.hemi.groundColors,
		hemiPositions = zlights.hemi.positions,

		dirLength = 0,
		pointLength = 0,
		spotLength = 0,
		hemiLength = 0,

		dirCount = 0,
		pointCount = 0,
		spotCount = 0,
		hemiCount = 0,

		dirOffset = 0,
		pointOffset = 0,
		spotOffset = 0,
		hemiOffset = 0;

		for ( l = 0, ll = lights.length; l < ll; l ++ ) {

			light = lights[ l ];

			if ( light.onlyShadow ) continue;

			color = light.color;
			intensity = light.intensity;
			distance = light.distance;

			if ( light instanceof THREE.AmbientLight ) {

				if ( ! light.visible ) continue;

				if ( gammaInput ) {

					r += color.r * color.r;
					g += color.g * color.g;
					b += color.b * color.b;

				} else {

					r += color.r;
					g += color.g;
					b += color.b;

				}

			} else if ( light instanceof THREE.DirectionalLight ) {

				dirCount += 1;

				if ( ! light.visible ) continue;

				_direction.getPositionFromMatrix( light.matrixWorld );
				_vector3.getPositionFromMatrix( light.target.matrixWorld );
				_direction.sub( _vector3 );
				_direction.normalize();

				// skip lights with undefined direction
				// these create troubles in OpenGL (making pixel black)

				if ( _direction.x === 0 && _direction.y === 0 && _direction.z === 0 ) continue;

				dirOffset = dirLength * 3;

				dirPositions[ dirOffset ]     = _direction.x;
				dirPositions[ dirOffset + 1 ] = _direction.y;
				dirPositions[ dirOffset + 2 ] = _direction.z;

				if ( gammaInput ) {

					setColorGamma( dirColors, dirOffset, color, intensity * intensity );

				} else {

					setColorLinear( dirColors, dirOffset, color, intensity );

				}

				dirLength += 1;

			} else if ( light instanceof THREE.PointLight ) {

				pointCount += 1;

				if ( ! light.visible ) continue;

				pointOffset = pointLength * 3;

				if ( gammaInput ) {

					setColorGamma( pointColors, pointOffset, color, intensity * intensity );

				} else {

					setColorLinear( pointColors, pointOffset, color, intensity );

				}

				_vector3.getPositionFromMatrix( light.matrixWorld );

				pointPositions[ pointOffset ]     = _vector3.x;
				pointPositions[ pointOffset + 1 ] = _vector3.y;
				pointPositions[ pointOffset + 2 ] = _vector3.z;

				pointDistances[ pointLength ] = distance;

				pointLength += 1;

			} else if ( light instanceof THREE.SpotLight ) {

				spotCount += 1;

				if ( ! light.visible ) continue;

				spotOffset = spotLength * 3;

				if ( gammaInput ) {

					setColorGamma( spotColors, spotOffset, color, intensity * intensity );

				} else {

					setColorLinear( spotColors, spotOffset, color, intensity );

				}

				_vector3.getPositionFromMatrix( light.matrixWorld );

				spotPositions[ spotOffset ]     = _vector3.x;
				spotPositions[ spotOffset + 1 ] = _vector3.y;
				spotPositions[ spotOffset + 2 ] = _vector3.z;

				spotDistances[ spotLength ] = distance;

				_direction.copy( _vector3 );
				_vector3.getPositionFromMatrix( light.target.matrixWorld );
				_direction.sub( _vector3 );
				_direction.normalize();

				spotDirections[ spotOffset ]     = _direction.x;
				spotDirections[ spotOffset + 1 ] = _direction.y;
				spotDirections[ spotOffset + 2 ] = _direction.z;

				spotAnglesCos[ spotLength ] = Math.cos( light.angle );
				spotExponents[ spotLength ] = light.exponent;

				spotLength += 1;

			} else if ( light instanceof THREE.HemisphereLight ) {

				hemiCount += 1;

				if ( ! light.visible ) continue;

				_direction.getPositionFromMatrix( light.matrixWorld );
				_direction.normalize();

				// skip lights with undefined direction
				// these create troubles in OpenGL (making pixel black)

				if ( _direction.x === 0 && _direction.y === 0 && _direction.z === 0 ) continue;

				hemiOffset = hemiLength * 3;

				hemiPositions[ hemiOffset ]     = _direction.x;
				hemiPositions[ hemiOffset + 1 ] = _direction.y;
				hemiPositions[ hemiOffset + 2 ] = _direction.z;

				skyColor = light.color;
				groundColor = light.groundColor;

				if ( gammaInput ) {

					intensitySq = intensity * intensity;

					setColorGamma( hemiSkyColors, hemiOffset, skyColor, intensitySq );
					setColorGamma( hemiGroundColors, hemiOffset, groundColor, intensitySq );

				} else {

					setColorLinear( hemiSkyColors, hemiOffset, skyColor, intensity );
					setColorLinear( hemiGroundColors, hemiOffset, groundColor, intensity );

				}

				hemiLength += 1;

			}

		}

		// null eventual remains from removed lights
		// (is to avoid if in shader)

		for ( l = dirLength * 3, ll = Math.max( dirColors.length, dirCount * 3 ); l < ll; l ++ ) dirColors[ l ] = 0.0;
		for ( l = pointLength * 3, ll = Math.max( pointColors.length, pointCount * 3 ); l < ll; l ++ ) pointColors[ l ] = 0.0;
		for ( l = spotLength * 3, ll = Math.max( spotColors.length, spotCount * 3 ); l < ll; l ++ ) spotColors[ l ] = 0.0;
		for ( l = hemiLength * 3, ll = Math.max( hemiSkyColors.length, hemiCount * 3 ); l < ll; l ++ ) hemiSkyColors[ l ] = 0.0;
		for ( l = hemiLength * 3, ll = Math.max( hemiGroundColors.length, hemiCount * 3 ); l < ll; l ++ ) hemiGroundColors[ l ] = 0.0;

		zlights.directional.length = dirLength;
		zlights.point.length = pointLength;
		zlights.spot.length = spotLength;
		zlights.hemi.length = hemiLength;

		zlights.ambient[ 0 ] = r;
		zlights.ambient[ 1 ] = g;
		zlights.ambient[ 2 ] = b;

	};

	// GL state setting

	setFaceCulling = function ( cullFace, frontFaceDirection ) {

		if ( cullFace === THREE.CullFaceNone ) {

			GL.disable( GL.CULL_FACE );

		} else {

			if ( frontFaceDirection === THREE.FrontFaceDirectionCW ) {

				GL.frontFace( GL.CW );

			} else {

				GL.frontFace( GL.CCW );

			}

			if ( cullFace === THREE.CullFaceBack ) {

				GL.cullFace( GL.BACK );

			} else if ( cullFace === THREE.CullFaceFront ) {

				GL.cullFace( GL.FRONT );

			} else {

				GL.cullFace( GL.FRONT_AND_BACK );

			}

			GL.enable( GL.CULL_FACE );

		}

	};

	setMaterialFaces = function ( material ) {

		var doubleSided = material.side === THREE.DoubleSide;
		var flipSided = material.side === THREE.BackSide;

		if ( _oldDoubleSided !== doubleSided ) {

			if ( doubleSided ) {

				GL.disable( GL.CULL_FACE );

			} else {

				GL.enable( GL.CULL_FACE );

			}

			_oldDoubleSided = doubleSided;

		}

		if ( _oldFlipSided !== flipSided ) {

			if ( flipSided ) {

				GL.frontFace( GL.CW );

			} else {

				GL.frontFace( GL.CCW );

			}

			_oldFlipSided = flipSided;

		}

	};

	setDepthTest = function ( depthTest ) {

		if ( _oldDepthTest !== depthTest ) {

			if ( depthTest ) {

				GL.enable( GL.DEPTH_TEST );

			} else {

				GL.disable( GL.DEPTH_TEST );

			}

			_oldDepthTest = depthTest;

		}

	};

	setDepthWrite = function ( depthWrite ) {

		if ( _oldDepthWrite !== depthWrite ) {

			GL.depthMask( depthWrite );
			_oldDepthWrite = depthWrite;

		}

	};

	function setLineWidth ( width ) {

		if ( width !== _oldLineWidth ) {

			GL.lineWidth( width );

			_oldLineWidth = width;

		}

	};

	function setPolygonOffset ( polygonoffset, factor, units ) {

		if ( _oldPolygonOffset !== polygonoffset ) {

			if ( polygonoffset ) {

				GL.enable( GL.POLYGON_OFFSET_FILL );

			} else {

				GL.disable( GL.POLYGON_OFFSET_FILL );

			}

			_oldPolygonOffset = polygonoffset;

		}

		if ( polygonoffset && ( _oldPolygonOffsetFactor !== factor || _oldPolygonOffsetUnits !== units ) ) {

			GL.polygonOffset( factor, units );

			_oldPolygonOffsetFactor = factor;
			_oldPolygonOffsetUnits = units;

		}

	};

	setBlending = function ( blending, blendEquation, blendSrc, blendDst ) {

		if ( blending !== _oldBlending ) {

			if ( blending === THREE.NoBlending ) {

				GL.disable( GL.BLEND );

			} else if ( blending === THREE.AdditiveBlending ) {

				GL.enable( GL.BLEND );
				GL.blendEquation( GL.FUNC_ADD );
				GL.blendFunc( GL.SRC_ALPHA, GL.ONE );

			} else if ( blending === THREE.SubtractiveBlending ) {

				// TODO: Find blendFuncSeparate() combination
				GL.enable( GL.BLEND );
				GL.blendEquation( GL.FUNC_ADD );
				GL.blendFunc( GL.ZERO, GL.ONE_MINUS_SRC_COLOR );

			} else if ( blending === THREE.MultiplyBlending ) {

				// TODO: Find blendFuncSeparate() combination
				GL.enable( GL.BLEND );
				GL.blendEquation( GL.FUNC_ADD );
				GL.blendFunc( GL.ZERO, GL.SRC_COLOR );

			} else if ( blending === THREE.CustomBlending ) {

				GL.enable( GL.BLEND );

			} else {

				GL.enable( GL.BLEND );
				GL.blendEquationSeparate( GL.FUNC_ADD, GL.FUNC_ADD );
				GL.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );

			}

			_oldBlending = blending;

		}

		if ( blending === THREE.CustomBlending ) {

			if ( blendEquation !== _oldBlendEquation ) {

				GL.blendEquation( paramThreeToGL( blendEquation ) );

				_oldBlendEquation = blendEquation;

			}

			if ( blendSrc !== _oldBlendSrc || blendDst !== _oldBlendDst ) {

				GL.blendFunc( paramThreeToGL( blendSrc ), paramThreeToGL( blendDst ) );

				_oldBlendSrc = blendSrc;
				_oldBlendDst = blendDst;

			}

		} else {

			_oldBlendEquation = null;
			_oldBlendSrc = null;
			_oldBlendDst = null;

		}

	};

	// Defines

	function generateDefines ( defines ) {

		var value, chunk, chunks = [];

		for ( var d in defines ) {

			value = defines[ d ];
			if ( value === false ) continue;

			chunk = "#define " + d + " " + value;
			chunks.push( chunk );

		}

		return chunks.join( "\n" );

	};

	// Shaders

	function buildProgram ( shaderID, fragmentShader, vertexShader, uniforms, attributes, defines, parameters ) {

		var p, pl, d, program, code;
		var chunks = [];

		// Generate code

		if ( shaderID ) {

			chunks.push( shaderID );

		} else {

			chunks.push( fragmentShader );
			chunks.push( vertexShader );

		}

		for ( d in defines ) {

			chunks.push( d );
			chunks.push( defines[ d ] );

		}

		for ( p in parameters ) {

			chunks.push( p );
			chunks.push( parameters[ p ] );

		}

		code = chunks.join();

		// Check if code has been already compiled

		for ( p = 0, pl = _programs.length; p < pl; p ++ ) {

			var programInfo = _programs[ p ];

			if ( programInfo.code === code ) {

				// console.log( "Code already compiled." /*: \n\n" + code*/ );

				programInfo.usedTimes ++;

				return programInfo.program;

			}

		}

		var shadowMapTypeDefine = "SHADOWMAP_TYPE_BASIC";

		if ( parameters.shadowMapType === THREE.PCFShadowMap ) {

			shadowMapTypeDefine = "SHADOWMAP_TYPE_PCF";

		} else if ( parameters.shadowMapType === THREE.PCFSoftShadowMap ) {

			shadowMapTypeDefine = "SHADOWMAP_TYPE_PCF_SOFT";

		}

		// console.log( "building new program " );

		//

		var customDefines = generateDefines( defines );

		//

		program = GL.createProgram();

		var prefix_vertex = [

			"precision " + _precision + " float;",
			"precision " + _precision + " int;",

			customDefines,

			_supportsVertexTextures ? "#define VERTEX_TEXTURES" : "",

			gammaInput ? "#define GAMMA_INPUT" : "",
			gammaOutput ? "#define GAMMA_OUTPUT" : "",
			physicallyBasedShading ? "#define PHYSICALLY_BASED_SHADING" : "",

			"#define MAX_DIR_LIGHTS " + parameters.maxDirLights,
			"#define MAX_POINT_LIGHTS " + parameters.maxPointLights,
			"#define MAX_SPOT_LIGHTS " + parameters.maxSpotLights,
			"#define MAX_HEMI_LIGHTS " + parameters.maxHemiLights,

			"#define MAX_SHADOWS " + parameters.maxShadows,

			"#define MAX_BONES " + parameters.maxBones,

			parameters.map ? "#define USE_MAP" : "",
			parameters.envMap ? "#define USE_ENVMAP" : "",
			parameters.lightMap ? "#define USE_LIGHTMAP" : "",
			parameters.bumpMap ? "#define USE_BUMPMAP" : "",
			parameters.normalMap ? "#define USE_NORMALMAP" : "",
			parameters.specularMap ? "#define USE_SPECULARMAP" : "",
			parameters.vertexColors ? "#define USE_COLOR" : "",

			parameters.skinning ? "#define USE_SKINNING" : "",
			parameters.useVertexTexture ? "#define BONE_TEXTURE" : "",
			parameters.boneTextureWidth ? "#define N_BONE_PIXEL_X " + parameters.boneTextureWidth.toFixed( 1 ) : "",
			parameters.boneTextureHeight ? "#define N_BONE_PIXEL_Y " + parameters.boneTextureHeight.toFixed( 1 ) : "",

			parameters.morphTargets ? "#define USE_MORPHTARGETS" : "",
			parameters.morphNormals ? "#define USE_MORPHNORMALS" : "",
			parameters.perPixel ? "#define PHONG_PER_PIXEL" : "",
			parameters.wrapAround ? "#define WRAP_AROUND" : "",
			parameters.doubleSided ? "#define DOUBLE_SIDED" : "",
			parameters.flipSided ? "#define FLIP_SIDED" : "",

			parameters.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
			parameters.shadowMapEnabled ? "#define " + shadowMapTypeDefine : "",
			parameters.shadowMapDebug ? "#define SHADOWMAP_DEBUG" : "",
			parameters.shadowMapCascade ? "#define SHADOWMAP_CASCADE" : "",

			parameters.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",

			"uniform mat4 modelMatrix;",
			"uniform mat4 modelViewMatrix;",
			"uniform mat4 projectionMatrix;",
			"uniform mat4 viewMatrix;",
			"uniform mat3 normalMatrix;",
			"uniform vec3 cameraPosition;",

			"attribute vec3 position;",
			"attribute vec3 normal;",
			"attribute vec2 uv;",
			"attribute vec2 uv2;",

			"#ifdef USE_COLOR",

				"attribute vec3 color;",

			"#endif",

			"#ifdef USE_MORPHTARGETS",

				"attribute vec3 morphTarget0;",
				"attribute vec3 morphTarget1;",
				"attribute vec3 morphTarget2;",
				"attribute vec3 morphTarget3;",

				"#ifdef USE_MORPHNORMALS",

					"attribute vec3 morphNormal0;",
					"attribute vec3 morphNormal1;",
					"attribute vec3 morphNormal2;",
					"attribute vec3 morphNormal3;",

				"#else",

					"attribute vec3 morphTarget4;",
					"attribute vec3 morphTarget5;",
					"attribute vec3 morphTarget6;",
					"attribute vec3 morphTarget7;",

				"#endif",

			"#endif",

			"#ifdef USE_SKINNING",

				"attribute vec4 skinIndex;",
				"attribute vec4 skinWeight;",

			"#endif",

			""

		].join("\n");

		var prefix_fragment = [

			"precision " + _precision + " float;",
			"precision " + _precision + " int;",

			( parameters.bumpMap || parameters.normalMap ) ? "#extension GL_OES_standard_derivatives : enable" : "",

			customDefines,

			"#define MAX_DIR_LIGHTS " + parameters.maxDirLights,
			"#define MAX_POINT_LIGHTS " + parameters.maxPointLights,
			"#define MAX_SPOT_LIGHTS " + parameters.maxSpotLights,
			"#define MAX_HEMI_LIGHTS " + parameters.maxHemiLights,

			"#define MAX_SHADOWS " + parameters.maxShadows,

			parameters.alphaTest ? "#define ALPHATEST " + parameters.alphaTest: "",

			gammaInput ? "#define GAMMA_INPUT" : "",
			gammaOutput ? "#define GAMMA_OUTPUT" : "",
			physicallyBasedShading ? "#define PHYSICALLY_BASED_SHADING" : "",

			( parameters.useFog && parameters.fog ) ? "#define USE_FOG" : "",
			( parameters.useFog && parameters.fogExp ) ? "#define FOG_EXP2" : "",

			parameters.map ? "#define USE_MAP" : "",
			parameters.envMap ? "#define USE_ENVMAP" : "",
			parameters.lightMap ? "#define USE_LIGHTMAP" : "",
			parameters.bumpMap ? "#define USE_BUMPMAP" : "",
			parameters.normalMap ? "#define USE_NORMALMAP" : "",
			parameters.specularMap ? "#define USE_SPECULARMAP" : "",
			parameters.vertexColors ? "#define USE_COLOR" : "",

			parameters.metal ? "#define METAL" : "",
			parameters.perPixel ? "#define PHONG_PER_PIXEL" : "",
			parameters.wrapAround ? "#define WRAP_AROUND" : "",
			parameters.doubleSided ? "#define DOUBLE_SIDED" : "",
			parameters.flipSided ? "#define FLIP_SIDED" : "",

			parameters.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
			parameters.shadowMapEnabled ? "#define " + shadowMapTypeDefine : "",
			parameters.shadowMapDebug ? "#define SHADOWMAP_DEBUG" : "",
			parameters.shadowMapCascade ? "#define SHADOWMAP_CASCADE" : "",

			"uniform mat4 viewMatrix;",
			"uniform vec3 cameraPosition;",
			""

		].join("\n");

		var glVertexShader = getShader( "vertex", prefix_vertex + vertexShader );
		var glFragmentShader = getShader( "fragment", prefix_fragment + fragmentShader );

		GL.attachShader( program, glVertexShader );
		GL.attachShader( program, glFragmentShader );

		GL.linkProgram( program );

		if ( !GL.getProgramParameter( program, GL.LINK_STATUS ) ) {

			console.error( "Could not initialise shader\n" + "VALIDATE_STATUS: " + GL.getProgramParameter( program, GL.VALIDATE_STATUS ) + ", gl error [" + GL.getError() + "]" );
			console.error( "Program Info Log: " + GL.getProgramInfoLog( program ) );
		}

		// clean up

		GL.deleteShader( glFragmentShader );
		GL.deleteShader( glVertexShader );

		// console.log( prefix_fragment + fragmentShader );
		// console.log( prefix_vertex + vertexShader );

		program.uniforms = {};
		program.attributes = {};

		var identifiers, u, a, i;

		// cache uniform locations

		identifiers = [

			'viewMatrix', 'modelViewMatrix', 'projectionMatrix', 'normalMatrix', 'modelMatrix', 'cameraPosition',
			'morphTargetInfluences'

		];

		if ( parameters.useVertexTexture ) {

			identifiers.push( 'boneTexture' );

		} else {

			identifiers.push( 'boneGlobalMatrices' );

		}

		for ( u in uniforms ) {

			identifiers.push( u );

		}

		cacheUniformLocations( program, identifiers );

		// cache attributes locations

		identifiers = [

			"position", "normal", "uv", "uv2", "tangent", "color",
			"skinIndex", "skinWeight", "lineDistance"

		];

		for ( i = 0; i < parameters.maxMorphTargets; i ++ ) {

			identifiers.push( "morphTarget" + i );

		}

		for ( i = 0; i < parameters.maxMorphNormals; i ++ ) {

			identifiers.push( "morphNormal" + i );

		}

		for ( a in attributes ) {

			identifiers.push( a );

		}

		cacheAttributeLocations( program, identifiers );

		program.id = _programs_counter ++;

		_programs.push( { program: program, code: code, usedTimes: 1 } );

		info.memory.programs = _programs.length;

		return program;

	};

	// Shader parameters cache

	function cacheUniformLocations ( program, identifiers ) {

		var i, l, id;

		for( i = 0, l = identifiers.length; i < l; i ++ ) {

			id = identifiers[ i ];
			program.uniforms[ id ] = GL.getUniformLocation( program, id );

		}

	};

	function cacheAttributeLocations ( program, identifiers ) {

		var i, l, id;

		for( i = 0, l = identifiers.length; i < l; i ++ ) {

			id = identifiers[ i ];
			program.attributes[ id ] = GL.getAttribLocation( program, id );

		}

	};

	function addLineNumbers ( string ) {

		var chunks = string.split( "\n" );

		for ( var i = 0, il = chunks.length; i < il; i ++ ) {

			// Chrome reports shader errors on lines
			// starting counting from 1

			chunks[ i ] = ( i + 1 ) + ": " + chunks[ i ];

		}

		return chunks.join( "\n" );

	};

	function getShader ( type, string ) {

		var shader;

		if ( type === "fragment" ) {

			shader = GL.createShader( GL.FRAGMENT_SHADER );

		} else if ( type === "vertex" ) {

			shader = GL.createShader( GL.VERTEX_SHADER );

		}

		GL.shaderSource( shader, string );
		GL.compileShader( shader );

		if ( !GL.getShaderParameter( shader, GL.COMPILE_STATUS ) ) {

			console.error( GL.getShaderInfoLog( shader ) );
			console.error( addLineNumbers( string ) );
			return null;

		}

		return shader;

	};

	// Textures


	function isPowerOfTwo ( value ) {

		return ( value & ( value - 1 ) ) === 0;

	};

	function setTextureParameters ( textureType, texture, isImagePowerOfTwo ) {

		if ( isImagePowerOfTwo ) {

			GL.texParameteri( textureType, GL.TEXTURE_WRAP_S, paramThreeToGL( texture.wrapS ) );
			GL.texParameteri( textureType, GL.TEXTURE_WRAP_T, paramThreeToGL( texture.wrapT ) );

			GL.texParameteri( textureType, GL.TEXTURE_MAG_FILTER, paramThreeToGL( texture.magFilter ) );
			GL.texParameteri( textureType, GL.TEXTURE_MIN_FILTER, paramThreeToGL( texture.minFilter ) );

		} else {

			GL.texParameteri( textureType, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE );
			GL.texParameteri( textureType, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE );

			GL.texParameteri( textureType, GL.TEXTURE_MAG_FILTER, filterFallback( texture.magFilter ) );
			GL.texParameteri( textureType, GL.TEXTURE_MIN_FILTER, filterFallback( texture.minFilter ) );

		}

		if ( _glExtensionTextureFilterAnisotropic && texture.type !== THREE.FloatType ) {

			if ( texture.anisotropy > 1 || texture.__oldAnisotropy ) {

				GL.texParameterf( textureType, _glExtensionTextureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min( texture.anisotropy, _maxAnisotropy ) );
				texture.__oldAnisotropy = texture.anisotropy;

			}

		}

	};

	setTexture = function ( texture, slot ) {

		if ( texture.needsUpdate ) {

			if ( ! texture.__gpuInit ) {

				texture.__gpuInit = true;

				texture.addEventListener( 'dispose', onTextureDispose );

				texture.__gpuTexture = GL.createTexture();

				info.memory.textures ++;

			}

			GL.activeTexture( GL.TEXTURE0 + slot );
			GL.bindTexture( GL.TEXTURE_2D, texture.__gpuTexture );

			GL.pixelStorei( GL.UNPACK_FLIP_Y_WEBGL, texture.flipY );
			GL.pixelStorei( GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha );
			GL.pixelStorei( GL.UNPACK_ALIGNMENT, texture.unpackAlignment );

			var image = texture.image,
			isImagePowerOfTwo = isPowerOfTwo( image.width ) && isPowerOfTwo( image.height ),
			glFormat = paramThreeToGL( texture.format ),
			glType = paramThreeToGL( texture.type );

			setTextureParameters( GL.TEXTURE_2D, texture, isImagePowerOfTwo );

			var mipmap, mipmaps = texture.mipmaps;

			if ( texture instanceof THREE.DataTexture ) {

				// use manually created mipmaps if available
				// if there are no manual mipmaps
				// set 0 level mipmap and then use GL to generate other mipmap levels

				if ( mipmaps.length > 0 && isImagePowerOfTwo ) {

					for ( var i = 0, il = mipmaps.length; i < il; i ++ ) {

						mipmap = mipmaps[ i ];
						GL.texImage2D( GL.TEXTURE_2D, i, glFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data );

					}

					texture.generateMipmaps = false;

				} else {

					GL.texImage2D( GL.TEXTURE_2D, 0, glFormat, image.width, image.height, 0, glFormat, glType, image.data );

				}

			} else if ( texture instanceof THREE.CompressedTexture ) {

				// compressed textures can only use manually created mipmaps
				// OpenGL can't generate mipmaps for DDS textures

				for( var i = 0, il = mipmaps.length; i < il; i ++ ) {

					mipmap = mipmaps[ i ];
					GL.compressedTexImage2D( GL.TEXTURE_2D, i, glFormat, mipmap.width, mipmap.height, 0, mipmap.data );

				}

			} else { // regular Texture (image, video, canvas)

				// use manually created mipmaps if available
				// if there are no manual mipmaps
				// set 0 level mipmap and then use GL to generate other mipmap levels

				if ( mipmaps.length > 0 && isImagePowerOfTwo ) {

					for ( var i = 0, il = mipmaps.length; i < il; i ++ ) {

						mipmap = mipmaps[ i ];
						GL.texImage2D( GL.TEXTURE_2D, i, glFormat, glFormat, glType, mipmap );

					}

					texture.generateMipmaps = false;

				} else {

					GL.texImage2D( GL.TEXTURE_2D, 0, glFormat, glFormat, glType, texture.image );

				}

			}

			if ( texture.generateMipmaps && isImagePowerOfTwo ) GL.generateMipmap( GL.TEXTURE_2D );

			texture.needsUpdate = false;

			if ( texture.onUpdate ) texture.onUpdate();

		} else {

			GL.activeTexture( GL.TEXTURE0 + slot );
			GL.bindTexture( GL.TEXTURE_2D, texture.__gpuTexture );

		}

	};

	function clampToMaxSize ( image, maxSize ) {

		if ( image.width <= maxSize && image.height <= maxSize ) {

			return image;

		}

		// Warning: Scaling through the canvas will only work with images that use
		// premultiplied alpha.

		var maxDimension = Math.max( image.width, image.height );
		var newWidth = Math.floor( image.width * maxSize / maxDimension );
		var newHeight = Math.floor( image.height * maxSize / maxDimension );

		var canvas = document.createElement( 'canvas' );
		canvas.width = newWidth;
		canvas.height = newHeight;

		var ctx = canvas.getContext( "2d" );
		ctx.drawImage( image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight );

		return canvas;

	}

	function setCubeTexture ( texture, slot ) {

		if ( texture.image.length === 6 ) {

			if ( texture.needsUpdate ) {

				if ( ! texture.image.__gpuTextureCube ) {

					texture.addEventListener( 'dispose', onTextureDispose );

					texture.image.__gpuTextureCube = GL.createTexture();

					info.memory.textures ++;

				}

				GL.activeTexture( GL.TEXTURE0 + slot );
				GL.bindTexture( GL.TEXTURE_CUBE_MAP, texture.image.__gpuTextureCube );

				GL.pixelStorei( GL.UNPACK_FLIP_Y_WEBGL, texture.flipY );

				var isCompressed = texture instanceof THREE.CompressedTexture;

				var cubeImage = [];

				for ( var i = 0; i < 6; i ++ ) {

					if ( autoScaleCubemaps && ! isCompressed ) {

						cubeImage[ i ] = clampToMaxSize( texture.image[ i ], _maxCubemapSize );

					} else {

						cubeImage[ i ] = texture.image[ i ];

					}

				}

				var image = cubeImage[ 0 ],
				isImagePowerOfTwo = isPowerOfTwo( image.width ) && isPowerOfTwo( image.height ),
				glFormat = paramThreeToGL( texture.format ),
				glType = paramThreeToGL( texture.type );

				setTextureParameters( GL.TEXTURE_CUBE_MAP, texture, isImagePowerOfTwo );

				for ( var i = 0; i < 6; i ++ ) {

					if ( isCompressed ) {

						var mipmap, mipmaps = cubeImage[ i ].mipmaps;

						for( var j = 0, jl = mipmaps.length; j < jl; j ++ ) {

							mipmap = mipmaps[ j ];
							GL.compressedTexImage2D( GL.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glFormat, mipmap.width, mipmap.height, 0, mipmap.data );

						}

					} else {

						GL.texImage2D( GL.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glFormat, glFormat, glType, cubeImage[ i ] );

					}

				}

				if ( texture.generateMipmaps && isImagePowerOfTwo ) {

					GL.generateMipmap( GL.TEXTURE_CUBE_MAP );

				}

				texture.needsUpdate = false;

				if ( texture.onUpdate ) texture.onUpdate();

			} else {

				GL.activeTexture( GL.TEXTURE0 + slot );
				GL.bindTexture( GL.TEXTURE_CUBE_MAP, texture.image.__gpuTextureCube );

			}

		}

	};

	function setCubeTextureDynamic ( texture, slot ) {

		GL.activeTexture( GL.TEXTURE0 + slot );
		GL.bindTexture( GL.TEXTURE_CUBE_MAP, texture.__gpuTexture );

	};

	// Render targets

	function setupFrameBuffer ( framebuffer, renderTarget, textureTarget ) {

		GL.bindFramebuffer( GL.FRAMEBUFFER, framebuffer );
		GL.framebufferTexture2D( GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, textureTarget, renderTarget.__gpuTexture, 0 );

	};

	function setupRenderBuffer ( renderbuffer, renderTarget  ) {

		GL.bindRenderbuffer( GL.RENDERBUFFER, renderbuffer );

		if ( renderTarget.depthBuffer && ! renderTarget.stencilBuffer ) {

			GL.renderbufferStorage( GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, renderTarget.width, renderTarget.height );
			GL.framebufferRenderbuffer( GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, renderbuffer );

		/* For some reason is not working. Defaulting to RGBA4.
		} else if( ! renderTarget.depthBuffer && renderTarget.stencilBuffer ) {

			GL.renderbufferStorage( GL.RENDERBUFFER, GL.STENCIL_INDEX8, renderTarget.width, renderTarget.height );
			GL.framebufferRenderbuffer( GL.FRAMEBUFFER, GL.STENCIL_ATTACHMENT, GL.RENDERBUFFER, renderbuffer );
		*/
		} else if ( renderTarget.depthBuffer && renderTarget.stencilBuffer ) {

			GL.renderbufferStorage( GL.RENDERBUFFER, GL.DEPTH_STENCIL, renderTarget.width, renderTarget.height );
			GL.framebufferRenderbuffer( GL.FRAMEBUFFER, GL.DEPTH_STENCIL_ATTACHMENT, GL.RENDERBUFFER, renderbuffer );

		} else {

			GL.renderbufferStorage( GL.RENDERBUFFER, GL.RGBA4, renderTarget.width, renderTarget.height );

		}

	};

	setRenderTarget = function ( renderTarget ) {

		var isCube = ( renderTarget instanceof THREE.OpenGLRenderTargetCube );

		if ( renderTarget && ! renderTarget.__gpuFramebuffer ) {

			if ( renderTarget.depthBuffer === undefined ) renderTarget.depthBuffer = true;
			if ( renderTarget.stencilBuffer === undefined ) renderTarget.stencilBuffer = true;

			renderTarget.addEventListener( 'dispose', onRenderTargetDispose );

			renderTarget.__gpuTexture = GL.createTexture();

			info.memory.textures ++;

			// Setup texture, create render and frame buffers

			var isTargetPowerOfTwo = isPowerOfTwo( renderTarget.width ) && isPowerOfTwo( renderTarget.height ),
				glFormat = paramThreeToGL( renderTarget.format ),
				glType = paramThreeToGL( renderTarget.type );

			if ( isCube ) {

				renderTarget.__gpuFramebuffer = [];
				renderTarget.__gpuRenderbuffer = [];

				GL.bindTexture( GL.TEXTURE_CUBE_MAP, renderTarget.__gpuTexture );
				setTextureParameters( GL.TEXTURE_CUBE_MAP, renderTarget, isTargetPowerOfTwo );

				for ( var i = 0; i < 6; i ++ ) {

					renderTarget.__gpuFramebuffer[ i ] = GL.createFramebuffer();
					renderTarget.__gpuRenderbuffer[ i ] = GL.createRenderbuffer();

					GL.texImage2D( GL.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glFormat, renderTarget.width, renderTarget.height, 0, glFormat, glType, null );

					setupFrameBuffer( renderTarget.__gpuFramebuffer[ i ], renderTarget, GL.TEXTURE_CUBE_MAP_POSITIVE_X + i );
					setupRenderBuffer( renderTarget.__gpuRenderbuffer[ i ], renderTarget );

				}

				if ( isTargetPowerOfTwo ) GL.generateMipmap( GL.TEXTURE_CUBE_MAP );

			} else {

				renderTarget.__gpuFramebuffer = GL.createFramebuffer();

				if ( renderTarget.shareDepthFrom ) {

					renderTarget.__gpuRenderbuffer = renderTarget.shareDepthFrom.__gpuRenderbuffer;

				} else {

					renderTarget.__gpuRenderbuffer = GL.createRenderbuffer();

				}

				GL.bindTexture( GL.TEXTURE_2D, renderTarget.__gpuTexture );
				setTextureParameters( GL.TEXTURE_2D, renderTarget, isTargetPowerOfTwo );

				GL.texImage2D( GL.TEXTURE_2D, 0, glFormat, renderTarget.width, renderTarget.height, 0, glFormat, glType, null );

				setupFrameBuffer( renderTarget.__gpuFramebuffer, renderTarget, GL.TEXTURE_2D );

				if ( renderTarget.shareDepthFrom ) {

					if ( renderTarget.depthBuffer && ! renderTarget.stencilBuffer ) {

						GL.framebufferRenderbuffer( GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, renderTarget.__gpuRenderbuffer );

					} else if ( renderTarget.depthBuffer && renderTarget.stencilBuffer ) {

						GL.framebufferRenderbuffer( GL.FRAMEBUFFER, GL.DEPTH_STENCIL_ATTACHMENT, GL.RENDERBUFFER, renderTarget.__gpuRenderbuffer );

					}

				} else {

					setupRenderBuffer( renderTarget.__gpuRenderbuffer, renderTarget );

				}

				if ( isTargetPowerOfTwo ) GL.generateMipmap( GL.TEXTURE_2D );

			}

			// Release everything

			if ( isCube ) {

				GL.bindTexture( GL.TEXTURE_CUBE_MAP, null );

			} else {

				GL.bindTexture( GL.TEXTURE_2D, null );

			}

			GL.bindRenderbuffer( GL.RENDERBUFFER, null );
			GL.bindFramebuffer( GL.FRAMEBUFFER, null );

		}

		var framebuffer, width, height, vx, vy;

		if ( renderTarget ) {

			if ( isCube ) {

				framebuffer = renderTarget.__gpuFramebuffer[ renderTarget.activeCubeFace ];

			} else {

				framebuffer = renderTarget.__gpuFramebuffer;

			}

			width = renderTarget.width;
			height = renderTarget.height;

			vx = 0;
			vy = 0;

		} else {

			framebuffer = null;

			width = _viewportWidth;
			height = _viewportHeight;

			vx = _viewportX;
			vy = _viewportY;

		}

		if ( framebuffer !== _currentFramebuffer ) {

			GL.bindFramebuffer( GL.FRAMEBUFFER, framebuffer );
			GL.viewport( vx, vy, width, height );

			_currentFramebuffer = framebuffer;

		}

		_currentWidth = width;
		_currentHeight = height;

	};

	function updateRenderTargetMipmap ( renderTarget ) {

		if ( renderTarget instanceof THREE.OpenGLRenderTargetCube ) {

			GL.bindTexture( GL.TEXTURE_CUBE_MAP, renderTarget.__gpuTexture );
			GL.generateMipmap( GL.TEXTURE_CUBE_MAP );
			GL.bindTexture( GL.TEXTURE_CUBE_MAP, null );

		} else {

			GL.bindTexture( GL.TEXTURE_2D, renderTarget.__gpuTexture );
			GL.generateMipmap( GL.TEXTURE_2D );
			GL.bindTexture( GL.TEXTURE_2D, null );

		}

	};

	// Fallback filters for non-power-of-2 textures

	function filterFallback ( f ) {

		if ( f === THREE.NearestFilter || f === THREE.NearestMipMapNearestFilter || f === THREE.NearestMipMapLinearFilter ) {

			return GL.NEAREST;

		}

		return GL.LINEAR;

	};

	// Map three.js constants to OpenGL constants

	function paramThreeToGL ( p ) {

		if ( p === THREE.RepeatWrapping ) return GL.REPEAT;
		if ( p === THREE.ClampToEdgeWrapping ) return GL.CLAMP_TO_EDGE;
		if ( p === THREE.MirroredRepeatWrapping ) return GL.MIRRORED_REPEAT;

		if ( p === THREE.NearestFilter ) return GL.NEAREST;
		if ( p === THREE.NearestMipMapNearestFilter ) return GL.NEAREST_MIPMAP_NEAREST;
		if ( p === THREE.NearestMipMapLinearFilter ) return GL.NEAREST_MIPMAP_LINEAR;

		if ( p === THREE.LinearFilter ) return GL.LINEAR;
		if ( p === THREE.LinearMipMapNearestFilter ) return GL.LINEAR_MIPMAP_NEAREST;
		if ( p === THREE.LinearMipMapLinearFilter ) return GL.LINEAR_MIPMAP_LINEAR;

		if ( p === THREE.UnsignedByteType ) return GL.UNSIGNED_BYTE;
		if ( p === THREE.UnsignedShort4444Type ) return GL.UNSIGNED_SHORT_4_4_4_4;
		if ( p === THREE.UnsignedShort5551Type ) return GL.UNSIGNED_SHORT_5_5_5_1;
		if ( p === THREE.UnsignedShort565Type ) return GL.UNSIGNED_SHORT_5_6_5;

		if ( p === THREE.ByteType ) return GL.BYTE;
		if ( p === THREE.ShortType ) return GL.SHORT;
		if ( p === THREE.UnsignedShortType ) return GL.UNSIGNED_SHORT;
		if ( p === THREE.IntType ) return GL.INT;
		if ( p === THREE.UnsignedIntType ) return GL.UNSIGNED_INT;
		if ( p === THREE.FloatType ) return GL.FLOAT;

		if ( p === THREE.AlphaFormat ) return GL.ALPHA;
		if ( p === THREE.RGBFormat ) return GL.RGB;
		if ( p === THREE.RGBAFormat ) return GL.RGBA;
		if ( p === THREE.LuminanceFormat ) return GL.LUMINANCE;
		if ( p === THREE.LuminanceAlphaFormat ) return GL.LUMINANCE_ALPHA;

		if ( p === THREE.AddEquation ) return GL.FUNC_ADD;
		if ( p === THREE.SubtractEquation ) return GL.FUNC_SUBTRACT;
		if ( p === THREE.ReverseSubtractEquation ) return GL.FUNC_REVERSE_SUBTRACT;

		if ( p === THREE.ZeroFactor ) return GL.ZERO;
		if ( p === THREE.OneFactor ) return GL.ONE;
		if ( p === THREE.SrcColorFactor ) return GL.SRC_COLOR;
		if ( p === THREE.OneMinusSrcColorFactor ) return GL.ONE_MINUS_SRC_COLOR;
		if ( p === THREE.SrcAlphaFactor ) return GL.SRC_ALPHA;
		if ( p === THREE.OneMinusSrcAlphaFactor ) return GL.ONE_MINUS_SRC_ALPHA;
		if ( p === THREE.DstAlphaFactor ) return GL.DST_ALPHA;
		if ( p === THREE.OneMinusDstAlphaFactor ) return GL.ONE_MINUS_DST_ALPHA;

		if ( p === THREE.DstColorFactor ) return GL.DST_COLOR;
		if ( p === THREE.OneMinusDstColorFactor ) return GL.ONE_MINUS_DST_COLOR;
		if ( p === THREE.SrcAlphaSaturateFactor ) return GL.SRC_ALPHA_SATURATE;

		if ( _glExtensionCompressedTextureS3TC !== undefined ) {

			if ( p === THREE.RGB_S3TC_DXT1_Format ) return _glExtensionCompressedTextureS3TC.COMPRESSED_RGB_S3TC_DXT1_EXT;
			if ( p === THREE.RGBA_S3TC_DXT1_Format ) return _glExtensionCompressedTextureS3TC.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			if ( p === THREE.RGBA_S3TC_DXT3_Format ) return _glExtensionCompressedTextureS3TC.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			if ( p === THREE.RGBA_S3TC_DXT5_Format ) return _glExtensionCompressedTextureS3TC.COMPRESSED_RGBA_S3TC_DXT5_EXT;

		}

		return 0;

	};

	// Allocations

	function allocateBones ( object ) {

		if ( _supportsBoneTextures && object && object.useVertexTexture ) {

			return 1024;

		} else {

			// default for when object is not specified
			// ( for example when prebuilding shader
			//   to be used with multiple objects )
			//
			// 	- leave some extra space for other uniforms
			//  - limit here is ANGLE's 254 max uniform vectors
			//    (up to 54 should be safe)

			var nVertexUniforms = GL.getParameter( GL.MAX_VERTEX_UNIFORM_VECTORS );
			var nVertexMatrices = Math.floor( ( nVertexUniforms - 20 ) / 4 );

			var maxBones = nVertexMatrices;

			if ( object !== undefined && object instanceof THREE.SkinnedMesh ) {

				maxBones = Math.min( object.bones.length, maxBones );

				if ( maxBones < object.bones.length ) {

					console.warn( "OpenGLRenderer: too many bones - " + object.bones.length + ", GPU supports just " + maxBones + " (try OpenGL instead of ANGLE)" );

				}

			}

			return maxBones;

		}

	};

	function allocateLights( lights ) {

		var dirLights = 0;
		var pointLights = 0;
		var spotLights = 0;
		var hemiLights = 0;

		for ( var l = 0, ll = lights.length; l < ll; l ++ ) {

			var light = lights[ l ];

			if ( light.onlyShadow ) continue;

			if ( light instanceof THREE.DirectionalLight ) dirLights ++;
			if ( light instanceof THREE.PointLight ) pointLights ++;
			if ( light instanceof THREE.SpotLight ) spotLights ++;
			if ( light instanceof THREE.HemisphereLight ) hemiLights ++;

		}

		return { 'directional' : dirLights, 'point' : pointLights, 'spot': spotLights, 'hemi': hemiLights };

	};

	function allocateShadows( lights ) {

		var maxShadows = 0;

		for ( var l = 0, ll = lights.length; l < ll; l++ ) {

			var light = lights[ l ];

			if ( ! light.castShadow ) continue;

			if ( light instanceof THREE.SpotLight ) maxShadows ++;
			if ( light instanceof THREE.DirectionalLight && ! light.shadowCascade ) maxShadows ++;

		}

		return maxShadows;

	};

	// Initialization

	function initGL() {

		try {

			if ( ! ( GL = _canvas.getContext( 'experimental-opengl', { alpha: _alpha, premultipliedAlpha: _premultipliedAlpha, antialias: _antialias, stencil: _stencil, preserveDrawingBuffer: _preserveDrawingBuffer } ) ) ) {

				throw 'Error creating OpenGL context.';

			}

		} catch ( error ) {

			console.error( error );

		}

		_glExtensionTextureFloat = GL.getExtension( 'OES_texture_float' );
		_glExtensionTextureFloatLinear = GL.getExtension( 'OES_texture_float_linear' );
		_glExtensionStandardDerivatives = GL.getExtension( 'OES_standard_derivatives' );

		_glExtensionTextureFilterAnisotropic = GL.getExtension( 'EXT_texture_filter_anisotropic' ) || GL.getExtension( 'MOZ_EXT_texture_filter_anisotropic' ) || GL.getExtension( 'WEBKIT_EXT_texture_filter_anisotropic' );

		_glExtensionCompressedTextureS3TC = GL.getExtension( 'WEBGL_compressed_texture_s3tc' ) || GL.getExtension( 'MOZ_WEBGL_compressed_texture_s3tc' ) || GL.getExtension( 'WEBKIT_WEBGL_compressed_texture_s3tc' );

		if ( ! _glExtensionTextureFloat ) {

			console.log( 'THREE.OpenGLRenderer: Float textures not supported.' );

		}

		if ( ! _glExtensionStandardDerivatives ) {

			console.log( 'THREE.OpenGLRenderer: Standard derivatives not supported.' );

		}

		if ( ! _glExtensionTextureFilterAnisotropic ) {

			console.log( 'THREE.OpenGLRenderer: Anisotropic texture filtering not supported.' );

		}

		if ( ! _glExtensionCompressedTextureS3TC ) {

			console.log( 'THREE.OpenGLRenderer: S3TC compressed textures not supported.' );

		}

		if ( GL.getShaderPrecisionFormat === undefined ) {

			GL.getShaderPrecisionFormat = function() {

				return {
					"rangeMin"  : 1,
					"rangeMax"  : 1,
					"precision" : 1
				};

			}
		}

	};

	function setDefaultGLState () {

		GL.clearColor( 0, 0, 0, 1 );
		GL.clearDepth( 1 );
		GL.clearStencil( 0 );

		GL.enable( GL.DEPTH_TEST );
		GL.depthFunc( GL.LEQUAL );

		GL.frontFace( GL.CCW );
		GL.cullFace( GL.BACK );
		GL.enable( GL.CULL_FACE );

		GL.enable( GL.BLEND );
		GL.blendEquation( GL.FUNC_ADD );
		GL.blendFunc( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA );

		GL.clearColor( _clearColor.r, _clearColor.g, _clearColor.b, _clearAlpha );

	};

	// default plugins (order is important)

	shadowMapPlugin = new THREE.ShadowMapPlugin();
	addPrePlugin( shadowMapPlugin );

	addPostPlugin( new THREE.SpritePlugin() );
	addPostPlugin( new THREE.LensFlarePlugin() );

};
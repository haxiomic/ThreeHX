/*
 -- Early-Stage WebGL Renderer Port & redesign--

TODO: (only care about objects, geometry, material and maybe ambient light)

First order of business:
sortFacesByMaterial
createMeshBuffers
initMeshBuffers

Make .clone() work for everything

unsafe casts = slightly better performance
better if we can statically type everything for c++ target, but when ever there is inheritance, there is a performance cost

 -- Design Change Notes --
Use OpenglView.render instead? (can override rect with scroll_rect)
Use h3d memory utils for buffers
Scene dispose, see http://mrdoob.github.io/three.js/examples/webgl_test_memory.html?
Scene probably shouldn't extend object3d; loads of extra useless data
Add aliases to make plugin compatibility easier, eg: scene.__gpuObjects becomes scene.__webglObjects

----- Other Files -----
Object3D.hx
	- userData treated as JSON string (in .clone); why not simply a dynamic?
*/

/* Render fields
Stage3D should have the same fields.
Issue, eg: object.geometry.attributes.buffer could be either GLBuffer or VertexBuffer3D
Fix, change define depending on platform

we can ignore bufferGeomtry for now?

* Object3d
__openglInit		bool
modelViewMatrix		matrix4
normalMatrix		matrix3
geometry  			BufferGeometry

* BufferGeometry
attribute.buffer 	GL.createBuffer, stores references to glBuffer
--loads of stuff unique to the geometry see deallocateGeometry

different types of object use different attributes to store opengl buffers and such in geometry
we could make different types (eg: LineBufferGeometry)

what about Geometry?? vs BufferGeomtry?
We'll add buffer geomtry later
* Geometry?
__openglVertexBuffer
	
*/

package three.renderers;

import openfl.display.OpenGLView;
import openfl.gl.GL;
import openfl.gl.GLBuffer;
import three.cameras.Camera;
import three.core.BaseGeometry;
import three.core.Geometry;
import three.core.GeometryGroup;
import three.core.Object3D;
import three.extras.renderers.plugins.Plugin;
import three.lights.Light;
import three.materials.Material;
import three.math.*;
import three.materials.MeshFaceMaterial;
import three.objects.GeomObject;
import three.objects.Mesh;
import three.scenes.*;
import three.scenes.SceneObject;
import three.THREE;


class OpenGLRenderer extends Renderer{

	// ---------- Public properties ----------
	public var view                   : OpenGLView;
	public var clearColor(default, set)       : Color;
	public var clearAlpha(default, set)       : Float = 0;

	//	clearing
	public var autoClear              : Bool  = true;
	public var autoClearColor         : Bool  = true;
	public var autoClearDepth         : Bool  = true;
	public var autoClearStencil       : Bool  = true;

	//	scene graph
	public var sortObjects            : Bool  = true;
	public var autoUpdateObjects      : Bool  = true;

	//	physically based shading

	public var gammaInput             : Bool  = false;
	public var gammaOutput            : Bool  = false;
	public var physicallyBasedShading : Bool  = false;

	//	shadow map
	public var shadowMapEnabled       : Bool  = false;
	public var shadowMapAutoUpdate    : Bool  = true;
	public var shadowMapType          : Int;
	public var shadowMapCullFace      : Int;
	public var shadowMapDebug         : Bool  = false;
	public var shadowMapCascade       : Bool  = false;

	//	morphs
	public var maxMorphTargets        : Int   = 8;
	public var maxMorphNormals        : Int   = 4;

	//	flags
	public var autoScaleCubemaps      : Bool  = true;

	// #! Not set 
	public var devicePixelRatio       : Float = 1;

	//	custom render plugins
	public var renderPluginsPre       : Array<Plugin>;
	public var renderPluginsPost      : Array<Plugin>;

	public var info:Renderer.Info;


	// ---------- Private properties ----------
	private var precision                : String = 'highp';
	private var alpha                    : Bool   = true;
	private var premultipliedAlpha       : Bool   = true;
	private var antialias                : Bool   = false;
	private var stencil                  : Bool   = true;
	private var preserveDrawingBuffer    : Bool   = false;

	// private var programs = [];
	// private var programs
	private var programs_counter         : Int = 0;

	// internal state cache
	// private var currentProgram = null;
	// private var currentFramebuffer = null;
	private var currentMaterialId        : Int = -1;
	private var currentGeometryGroupHash : Int;
	private var currentCamera            : Camera = null;
	private var geometryGroupCounter     : Int = 0;

	private var usedTextureUnits         : Int = 0;

	// GL state cache
	private var oldDoubleSided           : Int = -1;
	private var oldFlipSided             : Int = -1;

	private var oldBlending              : Int = -1;

	private var oldBlendEquation         : Null<Int> = -1;
	private var oldBlendSrc              : Null<Int> = -1;
	private var oldBlendDst              : Null<Int> = -1;

	private var oldDepthTest             : Int = -1;
	private var oldDepthWrite            : Int = -1;

	private var oldPolygonOffset         : Bool;
	private var oldPolygonOffsetFactor   : Float;
	private var oldPolygonOffsetUnits    : Float;

	private var oldLineWidth             : Float;

	private var viewportX                : Int = 0;
	private var viewportY                : Int = 0;
	private var viewportWidth            : Int = 0;
	private var viewportHeight           : Int = 0;
	private var currentWidth             : Int = 0;
	private var currentHeight            : Int = 0;

	// private var enabledAttributes = {};

	// frustum
	private var frustum                  : Frustum;

	// camera matrices cache
	private var projScreenMatrix         : Matrix4;
	private var projScreenMatrixPS       : Matrix4;

	private var vector3                  : Vector3;

	// light arrays cache
	private var direction                : Vector3;

	private var lightsNeedUpdate         : Bool = true;

	//	GPU capabilities
	private var glExtensionTextureFloat             : Dynamic = null;
	private var glExtensionTextureFloatLinear       : Dynamic = null;
	private var glExtensionStandardDerivatives      : Dynamic = null;
	private var glExtensionTextureFilterAnisotropic : Dynamic = null;
	private var glExtensionCompressedTextureS3TC    : Dynamic = null;

	private var maxTextures                         : Dynamic = null;
	private var maxVertexTextures                   : Dynamic = null;
	private var maxTextureSize                      : Dynamic = null;
	private var maxCubemapSize                      : Dynamic = null;

	private var maxAnisotropy                       : Dynamic = null;
	private var supportsVertexTextures              : Dynamic = null;
	private var supportsBoneTextures                : Dynamic = null;
	private var compressedTextureFormats            : Dynamic = null;

	private var vertexShaderPrecisionHighpFloat     : ShaderPrecisionFormat;
	private var vertexShaderPrecisionMediumpFloat   : ShaderPrecisionFormat;
	private var vertexShaderPrecisionLowpFloat      : ShaderPrecisionFormat;

	private var fragmentShaderPrecisionHighpFloat   : ShaderPrecisionFormat;
	private var fragmentShaderPrecisionMediumpFloat : ShaderPrecisionFormat;
	private var fragmentShaderPrecisionLowpFloat    : ShaderPrecisionFormat;

	private var vertexShaderPrecisionHighpInt       : ShaderPrecisionFormat;
	private var vertexShaderPrecisionMediumpInt     : ShaderPrecisionFormat;
	private var vertexShaderPrecisionLowpInt        : ShaderPrecisionFormat;

	private var fragmentShaderPrecisionHighpInt     : ShaderPrecisionFormat;
	private var fragmentShaderPrecisionMediumpInt   : ShaderPrecisionFormat;
	private var fragmentShaderPrecisionLowpInt      : ShaderPrecisionFormat;

	public function new(?view:OpenGLView           = null,
						precision:String           = 'highp',
						alpha:Bool                 = true,
						premultipliedAlpha:Bool    = true,
						antialias:Bool             = false,
						stencil:Bool               = true,
						preserveDrawingBuffer:Bool = false){
		super();
		if(!OpenGLView.isSupported)
			throw "OpenGL not supported";

		this.view         = (view!=null ? view : new OpenGLView());
		//	Public
		#if js
			// #! set devicePixelRatio from js.html.DOMWindow
			devicePixelRatio = 1;
		#end

		//Initiate variables
		//public
		this.clearColor        = new Color( 0x000000 );
		this.clearAlpha        = 0;
		this.renderPluginsPre  = new Array<Plugin>();
		this.renderPluginsPost = new Array<Plugin>();
		this.info = {
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
		}
		//private
		//from params
		this.precision             = precision;
		this.alpha                 = alpha;
		this.premultipliedAlpha    = premultipliedAlpha;
		this.antialias             = antialias;
		this.stencil               = stencil;
		this.preserveDrawingBuffer = preserveDrawingBuffer;

		this.shadowMapType      = THREE.PCFShadowMap;
		this.shadowMapCullFace  = THREE.CullFaceFront;
		this.frustum            = new Frustum();
		this.projScreenMatrix   = new Matrix4();
		this.projScreenMatrixPS = new Matrix4();


		//Prepare openGL
		supportedExtensions();	//What extensions are supported
		setDefaultGLState();

		//GPU capabilities
		maxTextures                         = GL.getParameter( GL.MAX_TEXTURE_IMAGE_UNITS );
		maxVertexTextures                   = GL.getParameter( GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS );
		maxTextureSize                      = GL.getParameter( GL.MAX_TEXTURE_SIZE );
		maxCubemapSize                      = GL.getParameter( GL.MAX_CUBE_MAP_TEXTURE_SIZE );

		//#! req supportedExtensions(), req unavailable openFL functions
		//maxAnisotropy = glExtensionTextureFilterAnisotropic ? GL.getParameter( glExtensionTextureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT ) : 0;
		//supportsVertexTextures = ( maxVertexTextures > 0 );
		//supportsBoneTextures = ( supportsVertexTextures && glExtensionTextureFloat );
		//compressedTextureFormats = glExtensionCompressedTextureS3TC ? GL.getParameter( GL.COMPRESSED_TEXTURE_FORMATS ) : [];

		vertexShaderPrecisionHighpFloat     = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.HIGH_FLOAT );
		vertexShaderPrecisionMediumpFloat   = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.MEDIUM_FLOAT );
		vertexShaderPrecisionLowpFloat      = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.LOW_FLOAT );
		fragmentShaderPrecisionHighpFloat   = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.HIGH_FLOAT );
		fragmentShaderPrecisionMediumpFloat = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.MEDIUM_FLOAT );
		fragmentShaderPrecisionLowpFloat    = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.LOW_FLOAT );
		vertexShaderPrecisionHighpInt       = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.HIGH_INT );
		vertexShaderPrecisionMediumpInt     = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.MEDIUM_INT );
		vertexShaderPrecisionLowpInt        = GL.getShaderPrecisionFormat( GL.VERTEX_SHADER, GL.LOW_INT );
		fragmentShaderPrecisionHighpInt     = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.HIGH_INT );
		fragmentShaderPrecisionMediumpInt   = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.MEDIUM_INT );
		fragmentShaderPrecisionLowpInt      = GL.getShaderPrecisionFormat( GL.FRAGMENT_SHADER, GL.LOW_INT );

		//At bottom
		loadDefaultPlugins();
	}

	//Public methods
	public function getView():OpenGLView{
		return view;
	}

	//#! req supportedExtensions(), req unavailable openFL functions
 /*	public function supportsVertexTextures():Bool{}
	public function supportsFloatTextures():Bool{}
	public function supportsStandardDerivatives():Bool{}
	public function supportsCompressedTextureS3TC():Bool{}

	public function getMaxAnisotropy (){}
	public function getPrecision(){}*/

	public function setSize( width:Int, height:Int ){
		//resize OpenGlView - seems to fill window always
		//not sure if we can make use of this 
		//resize veiwport instead?
		setViewport(0,0, width, height);
	}
	
	public function setViewport( x:Int = 0, y:Int = 0, width:Int = 0, height:Int = 0):Void{
		viewportX = x;
		viewportY = y;
		viewportWidth = width;
		viewportHeight = height;
		GL.viewport ( x, y, width, height);
	}
	public function setScissor( x:Int, y:Int, width:Int, height:Int ){
		GL.scissor( x, y, width, height );
	}
	public function enableScissorTest( enable:Bool ){
		enable ? GL.enable( GL.SCISSOR_TEST ) : GL.disable( GL.SCISSOR_TEST );
	}
	// Clearing
	public function setClearColor( color:Color, ?alpha:Float ){
		clearColor = color;
		if(alpha != null)
			clearAlpha = alpha;
	}
	public function getClearColor():Color{
		return clearColor;
	}
	public function getClearAlpha():Float{
		return clearAlpha;
	}
	public function clear( color:Bool = true, ?depth:Bool, ?stencil:Bool ){
		var bits:Int = 0;
		if(color)bits |= GL.COLOR_BUFFER_BIT;
		if(depth)bits |= GL.DEPTH_BUFFER_BIT;
		if(stencil)bits |= GL.STENCIL_BUFFER_BIT;
		GL.clear(bits);
	}
	//#! requires renderTarget class and setRenderTarget
	public function clearTarget( renderTarget, color:Bool = true, ?depth:Bool, ?stencil:Bool ){
		setRenderTarget( renderTarget );
		clear( color, depth, stencil );
	}
	// Plugins
	public function addPostPlugin( plugin:Plugin ){
		plugin.init(this);
		renderPluginsPost.push(plugin);
	}
	public function addPrePlugin( plugin:Plugin ){
		plugin.init(this);
		renderPluginsPre.push(plugin);
	}

	public function setMaterialFaces(material:Material) {
		var doubleSided:Bool = material.side == THREE.DoubleSide;
		var flipSided:Bool = material.side == THREE.BackSide;

		var newDoubleSided:Int = (doubleSided ? 1 : 2);
		if ( oldDoubleSided != newDoubleSided ) {
			if ( doubleSided )
				GL.disable( GL.CULL_FACE );
			else
				GL.enable( GL.CULL_FACE );

			oldDoubleSided = newDoubleSided;
		}

		var newFlipSided:Int = (flipSided ? 1 : 2);
		if ( oldFlipSided != newFlipSided ) {
			if ( flipSided )
				GL.frontFace( GL.CW );
			else
				GL.frontFace( GL.CCW );

			oldFlipSided = newFlipSided;
		}
	}
	public function setDepthTest( depthTest:Bool ) {
		var newDepthTest:Int = ( depthTest ? 1 : 2);
		if ( oldDepthTest != newDepthTest ) {	//check for change
			if ( depthTest ) 
				GL.enable( GL.DEPTH_TEST );
			else
				GL.disable( GL.DEPTH_TEST );

			oldDepthTest = newDepthTest;
		}
	}
	public function setDepthWrite( depthWrite:Bool ) {
		var newDepthWrite:Int = ( depthWrite ? 1 : 2);
		if ( oldDepthWrite != newDepthWrite ) {
			GL.depthMask( depthWrite );
			oldDepthWrite = newDepthWrite;
		}
	}
	public function setBlending( blending:Int, ?blendEquation:Int, ?blendSrc:Int, ?blendDst:Int ) {
		if ( blending != oldBlending ) {

			if ( blending == THREE.NoBlending ) {
				GL.disable( GL.BLEND );
			} else if ( blending == THREE.AdditiveBlending ) {
				GL.enable( GL.BLEND );
				GL.blendEquation( GL.FUNC_ADD );
				GL.blendFunc( GL.SRC_ALPHA, GL.ONE );
			} else if ( blending == THREE.SubtractiveBlending ) {
				// TODO: Find blendFuncSeparate() combination
				GL.enable( GL.BLEND );
				GL.blendEquation( GL.FUNC_ADD );
				GL.blendFunc( GL.ZERO, GL.ONE_MINUS_SRC_COLOR );
			} else if ( blending == THREE.MultiplyBlending ) {
				// TODO: Find blendFuncSeparate() combination
				GL.enable( GL.BLEND );
				GL.blendEquation( GL.FUNC_ADD );
				GL.blendFunc( GL.ZERO, GL.SRC_COLOR );
			} else if ( blending == THREE.CustomBlending ) {
				GL.enable( GL.BLEND );
			} else {
				GL.enable( GL.BLEND );
				GL.blendEquationSeparate( GL.FUNC_ADD, GL.FUNC_ADD );
				GL.blendFuncSeparate( GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA );
			}

			oldBlending = blending;
		}

		if ( blending == THREE.CustomBlending ) {

			if ( blendEquation != oldBlendEquation ) {
				GL.blendEquation( paramThreeToGL( blendEquation ) );
				oldBlendEquation = blendEquation;
			}

			if ( blendSrc != oldBlendSrc || blendDst != oldBlendDst ) {
				GL.blendFunc( paramThreeToGL( blendSrc ), paramThreeToGL( blendDst ) );
				oldBlendSrc = blendSrc;
				oldBlendDst = blendDst;
			}

		} else {
			oldBlendEquation = null;
			oldBlendSrc = null;
			oldBlendDst = null;
		}
	}
	private function setPolygonOffset ( polygonoffset:Bool, factor:Float, units:Float ) {

		if ( oldPolygonOffset != polygonoffset ) {
			if ( polygonoffset )
				GL.enable( GL.POLYGON_OFFSET_FILL );
			else 
				GL.disable( GL.POLYGON_OFFSET_FILL );

			oldPolygonOffset = polygonoffset;
		}

		if ( polygonoffset && ( oldPolygonOffsetFactor != factor || oldPolygonOffsetUnits != units ) ) {
			GL.polygonOffset( factor, units );

			oldPolygonOffsetFactor = factor;
			oldPolygonOffsetUnits = units;
		}
	}
	// Rendering
	//#! requires shadowMap plugin
/*	public function updateShadowMap( scene, camera:Camera ){}
	public function renderBufferImmediate( object:Object3D, program, material  {}
	public function renderBufferDirect( camera, lights, fog, material, geometry, object:Object3D  {}
	public function renderBuffer( camera, lights, fog, material, geometryGroup, object:Object3D  {}*/

	private function onGeometryDispose(?e){trace("onGeometryDispose not implemented :[");}

	public function render( scene:Scene, camera:Camera, ?renderTarget, forceClear:Bool = false):Void{
		//#! need to type
		var i:Int, il:Int,
		glObject:SceneObject,
		object:Object3D,
		renderList:Array<SceneObject>,

		lights:Map<Light, Light> = scene.__lights,
		fog = scene.fog;

		// reset caching for this frame
		currentMaterialId = -1;
		lightsNeedUpdate = true;

		// update scene graph
		if ( scene.autoUpdate == true ) scene.updateMatrixWorld();

		// update camera matrices and frustum
		if ( camera.parent == null ) camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse( camera.matrixWorld );

		projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
		frustum.setFromMatrix( projScreenMatrix );

		// update OpenGL objects
		if ( autoUpdateObjects ) initOpenGLObjects( scene );

		// custom render plugins (pre pass)
		renderPlugins( renderPluginsPre, scene, camera );

		info.render.calls = 0;
		info.render.vertices = 0;
		info.render.faces = 0;
		info.render.points = 0;

		setRenderTarget( renderTarget );

		if ( autoClear || forceClear ) 
			clear( autoClearColor, autoClearDepth, autoClearStencil );

		renderList = scene.__gpuObjects;

		//#! itterating renderList, order is important
		for ( i in 0...renderList.length) {

			glObject = renderList[ i ];
			object = glObject.object;

			glObject.id = i;
			glObject.render = false;

			if ( object.visible ) {
				if (!( object.type == THREE.Mesh || object.type == THREE.ParticleSystem ) || !( object.frustumCulled ) || frustum.intersectsObject(object)) {

					setupMatrices( object, camera );
					unrollBufferMaterial( glObject );
					glObject.render = true;

					if ( sortObjects == true ) {
						if ( object.renderDepth != null ) {
							glObject.z = object.renderDepth;
						} else {
							vector3.getPositionFromMatrix( object.matrixWorld );
							vector3.applyProjection( projScreenMatrix );

							glObject.z = vector3.z;
						}
					}
				}
			}

		}

		if(sortObjects){
	//		renderList.sort();
		}

		// set matrices for immediate objects
		renderList = scene.__gpuObjectsImmediate;

		for ( i in 0...renderList.length) {
			glObject = renderList[ i ];
			object = glObject.object;

			if ( object.visible ) {
				setupMatrices( object, camera );
				unrollImmediateBufferMaterial( glObject );
			}
		}

		if ( scene.overrideMaterial != null) {
			var material = scene.overrideMaterial;

			setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst );
			setDepthTest( material.depthTest );
			setDepthWrite( material.depthWrite );
			setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );

			renderObjects( scene.__gpuObjects, false, "", camera, lights, fog, true, material );
			//renderObjectsImmediate( scene.__gpuObjectsImmediate, "", camera, lights, fog, false, material );
		} else {
			var material = null;
			// opaque pass (front-to-back order)
			setBlending( THREE.NoBlending );

			renderObjects( scene.__gpuObjects, true, "opaque", camera, lights, fog, false, material );
			//renderObjectsImmediate( scene.__gpuObjectsImmediate, "opaque", camera, lights, fog, false, material );

			// transparent pass (back-to-front order)
			renderObjects( scene.__gpuObjects, false, "transparent", camera, lights, fog, true, material );
			//renderObjectsImmediate( scene.__gpuObjectsImmediate, "transparent", camera, lights, fog, true, material );
		}

		//Render plugins
		renderPlugins( renderPluginsPost, scene, camera );

		// Generate mipmap if we're using any kind of mipmap filtering
		//#! mipmap filtering
		/*if ( renderTarget && renderTarget.generateMipmaps && renderTarget.minFilter != THREE.NearestFilter && renderTarget.minFilter != THREE.LinearFilter ) {
			updateRenderTargetMipmap( renderTarget );
		}*/

		setDepthTest( true );
		setDepthWrite( true );
	}

	function renderObjects ( renderList:Array<SceneObject>, reverse:Bool, materialType:String, camera:Camera, lights:Map<Light, Light>, fog:Fog = null, useBlending:Bool = false, overrideMaterial:Material = null){
		var glObject:SceneObject, object:Object3D, buffer:BaseGeometry, material:Material,
		start:Int, end:Int, delta:Int;

		if ( reverse ) {
			start = renderList.length - 1;
			end = -1;
			delta = -1;
		} else {
			start = 0;
			end = renderList.length;
			delta = 1;
		}

		var i:Int = start;
		while(i!=end){
			glObject = renderList[ i ];

			if ( glObject.render ) {

				object = glObject.object;
				buffer = glObject.buffer;

				if ( overrideMaterial != null) {
					material = overrideMaterial;
				} else {
					material = (materialType == "opaque" ? glObject.opaque : glObject.transparent);

					if ( material == null) continue;

					if ( useBlending ) setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst );

					setDepthTest( material.depthTest );
					setDepthWrite( material.depthWrite );
					setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );
				}

				setMaterialFaces( material );

				if (buffer.type == THREE.BufferGeometry ){
					//renderBufferDirect( camera, lights, fog, material, buffer, object );
				}else {
					renderBuffer( camera, lights, fog, material, cast buffer, object );
				}
			}

			i+=delta;
		}
	}

	public function renderImmediateObject( camera, lights, fog, material, object:Object3D ){
		trace("renderImmediateObject() not complete");
	}

	public function renderBufferDirect ( camera:Camera, lights:Map<Light, Light>, fog:Fog, material:Material, geometry:Geometry, object:Object3D) {
		trace("renderBufferDirect() not complete");
	}

	public function renderBuffer ( camera:Camera, lights:Map<Light, Light>, fog:Fog, material:Material, geometryGroup:GeometryGroup, object:Object3D) {
		trace("renderBuffer() not complete");
	}

	function unrollImmediateBufferMaterial ( globject:SceneObject ) {
		var object:Mesh = cast globject.object,
			material:Material = object.material;

		if ( material.transparent ) {
			globject.transparent = material;
			globject.opaque = null;
		} else {
			globject.opaque = material;
			globject.transparent = null;
		}

	}

	function unrollBufferMaterial ( globject:SceneObject) {
		var object:Mesh = cast globject.object,
			buffer:GeometryGroup,
			material:Material, meshFaceMaterial:MeshFaceMaterial;

		if ( object.material.type == THREE.MeshFaceMaterial ) {
			buffer = cast (globject.buffer, GeometryGroup);
			meshFaceMaterial = cast object.material;
			material = meshFaceMaterial.materials[ buffer.materialIndex ];

			if ( material.transparent ) {
				globject.transparent = material;
				globject.opaque = null;
			} else {
				globject.opaque = material;
				globject.transparent = null;
			}

		} else {
			material = object.material;
			if ( material != null ) {
				if ( material.transparent ) {
					globject.transparent = material;
					globject.opaque = null;
				} else {
					globject.opaque = material;
					globject.transparent = null;
				}
			}
		}
	}

	private function sortFacesByMaterial( geometry:Geometry, material:Material ) {
		trace('sortFacesByMaterial not complete');
	}

	private function createMeshBuffers( group ){
		trace('createMeshBuffers not complete');
	}

	private function initMeshBuffers( group, object:GeomObject){
		trace('initMeshBuffers not complete');
	}

	private function initOpenGLObjects( scene:Scene ) {
		// #!1, req 3
		//Initate arrays to hold objects for scene

		//Update openglObject list based on changes to scene objects since this was last executed
		//add new objects to scene
		for(obj in scene.__objectsAdded){
			addObject(obj, scene);
			scene.__objectsAdded.remove(obj);
		}
		//remove, removed objected from scene
		for(obj in scene.__objectsRemoved){
			removeObject(obj, scene);
			scene.__objectsRemoved.remove(obj);
		}

		//#! do we really need to update all objects in scene?
		for(rObj in scene.__gpuObjects){
			/* #! understand 'hack' in js code */
			updateObject(rObj.object);	
		}
	}

	//Internal Methods 
	private function addObject(object:Object3D, scene:Scene){
		var geometry:Geometry = null, material:Material;

		if(Std.is(object, GeomObject))
			geometry = cast(object, GeomObject).geometry;
		

		if(object.__gpuInit == false){
			//What does this mean? can we get rid of __openglInit?
			object.__gpuInit = true;
			object.modelViewMatrix = new Matrix4();
			object.normalMatrix = new Matrix3();

			//Add dispose listener

			if(geometry != null){
				geometry.__gpuInit = true;
				geometry.addEventListener('dispose', onGeometryDispose);
			}

			//Handle types of objects
			if(geometry == null){
				// fail silently for now
			}else if(object.type == THREE.Mesh){
				var mesh:Mesh = cast object;
				material = mesh.material;
				//Fill geometry groups
				if(geometry.geometryGroups == null)
					sortFacesByMaterial(geometry, material);
				
				//Create a vertex buffer object for each chunk of geometry
				for(group in geometry.geometryGroups){
					//initialise VBO 
					if(group.vertexBuffer == null){
						createMeshBuffers(group);
						initMeshBuffers(group, mesh);
						//Geometry needs update
						geometry.verticesNeedUpdate = true;
						geometry.morphTargetsNeedUpdate = true;
						geometry.elementsNeedUpdate = true;
						geometry.uvsNeedUpdate = true;
						geometry.normalsNeedUpdate = true;
						geometry.tangentsNeedUpdate = true;
						geometry.colorsNeedUpdate = true;
					}
				}
			}
			//else if(object.type == THREE.type ){
			//} 
		}

		//Add buffers to scene
		if(object.__gpuActive == false){
			/* geometryGroups seems to be a list of buffers filled in the previous statement */
			//Mesh
			if(object.type == THREE.Mesh){
				/*#! different behavour for BufferGeometry */
				for(group in geometry.geometryGroups){
					//?? how is group a buffer
					//group referred to as buffer, but actually it's a geometry or a BufferGeometry
					addBuffer(scene.__gpuObjects, group, object);
				}
			}
			object.__gpuActive = true;
		}
	}
	private function removeObject(object:Object3D, scene:Scene){
		if(	     object.type == THREE.Mesh		
			//|| Std.is(object, three.objects.ParticleSystem) 	
			//|| Std.is(object, three.objects.Ribbon) 			
			//|| Std.is(object, three.objects.Line)	
			)
			removeInstances( scene.__gpuObjects, object );
		//else if(){}
		//#! need sprites, lenseflare etc
		object.__gpuActive = false;
	}

	private function addBuffer(objlist:Array<SceneObject>, buffer:Geometry, object:Object3D){
		trace("av");
		var glObject:SceneObject = new SceneObject(object, buffer);
		objlist.push(glObject);
	}
	private function addBufferImmediate(objlist:Array<SceneObject>, object:Object3D){
		var rObject:SceneObject = new SceneObject(object);
		objlist.push(rObject);
	}
	private function removeInstances( objlist:Array<SceneObject>, object:Object3D ) {
		for(i in 0...objlist.length){
			if(objlist[i].object == object)
				objlist.splice(i,1);
		}
	}
	private function removeInstancesDirect( objlist:Array<SceneObject>, object:SceneObject ) {
		for(i in 0...objlist.length){
			if(objlist[i] == object)
				objlist.splice(i,1);
		}
	}
	private function updateObject( object:Object3D ) {
		trace('updateObject not complete');
	}
	private function areCustomAttributesDirty( material:Material ) {}
	private function clearCustomAttributes( material:Material ) {}

	private function renderPlugins(plugins:Array<Plugin>, scene:Scene, camera:Camera ):Void{
		// #!2
		if (plugins.length <= 0) return;

		for (i in 0...plugins.length) {
			// reset state for plugin (to start from clean slate)
			//currentProgram = null;
			//currentCamera = null;

			oldBlending = -1;
			oldDepthTest = -1;
			oldDepthWrite = -1;
			oldDoubleSided = -1;
			oldFlipSided = -1;
			currentGeometryGroupHash = -1;
			currentMaterialId = -1;

			lightsNeedUpdate = true;

			plugins[i].render( scene, camera, currentWidth, currentHeight );

			// reset state after plugin (anything could have changed)
			//currentProgram = null;
			//currentCamera = null;

			oldBlending = -1;
			oldDepthTest = -1;
			oldDepthWrite = -1;
			oldDoubleSided = -1;
			oldFlipSided = -1;
			currentGeometryGroupHash = -1;
			currentMaterialId = -1;

			lightsNeedUpdate = true;
		}
		
	}

	private function setupMatrices ( object:Object3D, camera:Camera ) {
		object.modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld );
		object.normalMatrix.getNormalMatrix( object.modelViewMatrix );
	}

	public function setRenderTarget(renderTarget){
		trace("setRenderTarget() not complete");
	}

	// Map three.js constants to OpenGL constants
	private function paramThreeToGL ( p:Int ) {
		if ( p == THREE.RepeatWrapping ) return GL.REPEAT;
		if ( p == THREE.ClampToEdgeWrapping ) return GL.CLAMP_TO_EDGE;
		if ( p == THREE.MirroredRepeatWrapping ) return GL.MIRRORED_REPEAT;

		if ( p == THREE.NearestFilter ) return GL.NEAREST;
		if ( p == THREE.NearestMipMapNearestFilter ) return GL.NEAREST_MIPMAP_NEAREST;
		if ( p == THREE.NearestMipMapLinearFilter ) return GL.NEAREST_MIPMAP_LINEAR;

		if ( p == THREE.LinearFilter ) return GL.LINEAR;
		if ( p == THREE.LinearMipMapNearestFilter ) return GL.LINEAR_MIPMAP_NEAREST;
		if ( p == THREE.LinearMipMapLinearFilter ) return GL.LINEAR_MIPMAP_LINEAR;

		if ( p == THREE.UnsignedByteType ) return GL.UNSIGNED_BYTE;
		if ( p == THREE.UnsignedShort4444Type ) return GL.UNSIGNED_SHORT_4_4_4_4;
		if ( p == THREE.UnsignedShort5551Type ) return GL.UNSIGNED_SHORT_5_5_5_1;
		if ( p == THREE.UnsignedShort565Type ) return GL.UNSIGNED_SHORT_5_6_5;

		if ( p == THREE.ByteType ) return GL.BYTE;
		if ( p == THREE.ShortType ) return GL.SHORT;
		if ( p == THREE.UnsignedShortType ) return GL.UNSIGNED_SHORT;
		if ( p == THREE.IntType ) return GL.INT;
		if ( p == THREE.UnsignedIntType ) return GL.UNSIGNED_INT;
		if ( p == THREE.FloatType ) return GL.FLOAT;

		if ( p == THREE.AlphaFormat ) return GL.ALPHA;
		if ( p == THREE.RGBFormat ) return GL.RGB;
		if ( p == THREE.RGBAFormat ) return GL.RGBA;
		if ( p == THREE.LuminanceFormat ) return GL.LUMINANCE;
		if ( p == THREE.LuminanceAlphaFormat ) return GL.LUMINANCE_ALPHA;

		if ( p == THREE.AddEquation ) return GL.FUNC_ADD;
		if ( p == THREE.SubtractEquation ) return GL.FUNC_SUBTRACT;
		if ( p == THREE.ReverseSubtractEquation ) return GL.FUNC_REVERSE_SUBTRACT;

		if ( p == THREE.ZeroFactor ) return GL.ZERO;
		if ( p == THREE.OneFactor ) return GL.ONE;
		if ( p == THREE.SrcColorFactor ) return GL.SRC_COLOR;
		if ( p == THREE.OneMinusSrcColorFactor ) return GL.ONE_MINUS_SRC_COLOR;
		if ( p == THREE.SrcAlphaFactor ) return GL.SRC_ALPHA;
		if ( p == THREE.OneMinusSrcAlphaFactor ) return GL.ONE_MINUS_SRC_ALPHA;
		if ( p == THREE.DstAlphaFactor ) return GL.DST_ALPHA;
		if ( p == THREE.OneMinusDstAlphaFactor ) return GL.ONE_MINUS_DST_ALPHA;

		if ( p == THREE.DstColorFactor ) return GL.DST_COLOR;
		if ( p == THREE.OneMinusDstColorFactor ) return GL.ONE_MINUS_DST_COLOR;
		if ( p == THREE.SrcAlphaSaturateFactor ) return GL.SRC_ALPHA_SATURATE;

		if ( glExtensionCompressedTextureS3TC != null ) {
			if ( p == THREE.RGB_S3TC_DXT1_Format ) return glExtensionCompressedTextureS3TC.COMPRESSED_RGB_S3TC_DXT1_EXT;
			if ( p == THREE.RGBA_S3TC_DXT1_Format ) return glExtensionCompressedTextureS3TC.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			if ( p == THREE.RGBA_S3TC_DXT3_Format ) return glExtensionCompressedTextureS3TC.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			if ( p == THREE.RGBA_S3TC_DXT5_Format ) return glExtensionCompressedTextureS3TC.COMPRESSED_RGBA_S3TC_DXT5_EXT;
		}

		return 0;
	}

	private function supportedExtensions():Void{
		trace('Cannot use supportedExtensions() - extension queryı functions not working in OpenFL/NME yet :[');
		return;
		//#! extension query functions not available in OpenFL/NME
		glExtensionTextureFloat = GL.getExtension( 'OES_texture_float' );
		glExtensionTextureFloatLinear = GL.getExtension( 'OES_texture_float_linear' );
		glExtensionStandardDerivatives = GL.getExtension( 'OES_standard_derivatives' );
		glExtensionTextureFilterAnisotropic = GL.getExtension( 'EXT_texture_filter_anisotropic' ) || GL.getExtension( 'MOZ_EXT_texture_filter_anisotropic' ) || GL.getExtension( 'WEBKIT_EXT_texture_filter_anisotropic' );
		glExtensionCompressedTextureS3TC = GL.getExtension( 'WEBGL_compressed_texture_s3tc' ) || GL.getExtension( 'MOZ_WEBGL_compressed_texture_s3tc' ) || GL.getExtension( 'WEBKIT_WEBGL_compressed_texture_s3tc' );

		if ( !glExtensionTextureFloat ) 
			trace( 'OpenGLRenderer: Float textures not supported.' );
		if ( !glExtensionStandardDerivatives ) 
			trace( 'OpenGLRenderer: Standard derivatives not supported.' );
		if ( !glExtensionTextureFilterAnisotropic ) 
			trace( 'OpenGLRenderer: Anisotropic texture filtering not supported.' );
		if ( !glExtensionCompressedTextureS3TC )
			trace( 'OpenGLRenderer: S3TC compressed textures not supported.' );
	}

	private function setDefaultGLState ():Void {
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

		GL.clearColor( clearColor.r, clearColor.g, clearColor.b, clearAlpha );
	};

	private function loadDefaultPlugins():Void{

	}
	//getters and setters
	private inline function set_clearColor(v:Color):Color{
		clearColor = v;
		GL.clearColor(clearColor.r, clearColor.g, clearColor.b, clearAlpha);
		return clearColor;
	}
	private inline function set_clearAlpha(v:Float):Float{
		clearAlpha = v;
		GL.clearColor(clearColor.r, clearColor.g, clearColor.b, clearAlpha);
		return clearAlpha;
	}
}
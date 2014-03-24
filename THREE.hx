
package three;



/**
 * 
 * @author dcm
 */

class THREE
{	
	/* Could do this automatically with Macros? See http://haxe.org/manual/macros_compiler */
	//Geometry type-flags
	static inline public var BaseGeometry:Int       = 0;	
	static inline public var Geometry:Int           = 1;	
	static inline public var BufferGeometry:Int     = 2;
	//Object3D type-flags
	static inline public var Mesh:Int               = 3;	
	static inline public var ParticleSystem:Int 	= 4;
	//Light type-flags
	static inline public var Light:Int              = 5;	
	static inline public var AmbientLight:Int       = 6;	
	static inline public var PointLight:Int         = 7;	
	//Material type-flags
	static inline public var MeshFaceMaterial:Int   = 8;	
	static inline public var MeshBasicMaterial:Int  = 9;	
	//Renderable type-flags
	static inline public var RenderableFace3:Int    = 10;
	static inline public var RenderableFace4:Int    = 11;
	static inline public var RenderableLine:Int     = 12;
	static inline public var RenderableObject:Int   = 13;
	static inline public var RenderableParticle:Int = 14;
	static inline public var RenderableVertex:Int   = 15;
	
	
	static inline public var defaultEulerOrder:String = 'XYZ';
	
	
	// ----- Original THREE.js Constants -----
	
	//GL State Constants
	static inline public var CullFaceNone:Int = 0;
	static inline public var CullFaceBack:Int = 1;
	static inline public var CullFaceFront:Int = 2;
	static inline public var CullFaceFrontBack:Int = 3;
	
	static inline public var FrontFaceDirectionCW:Int = 0;
	static inline public var FrontFaceDirectionCCW:Int = 1;
	
	//Shadowing Types
	static inline public var BasicShadowMap:Int = 0;
	static inline public var PCFShadowMap:Int = 1;
	static inline public var PCFSoftShadowMap:Int = 2;
	
	//Material Sides
	static inline public var FrontSide:Int = 0;
	static inline public var BackSide:Int = 1;
	static inline public var DoubleSide:Int = 2;
	
	//Material Shading
	static inline public var NoShading:Int = 0;
	static inline public var FlatShading:Int = 1;
	static inline public var SmoothShading:Int = 2;
	
	//Material Colors
	static inline public var NoColors:Int = 0;
	static inline public var FaceColors:Int = 1;
	static inline public var VertexColors:Int = 2;
	
	//Blending
	static inline public var NoBlending:Int = 0;
	static inline public var NormalBlending:Int = 1;
	static inline public var AdditiveBlending:Int = 2;
	static inline public var SubtractiveBlending:Int = 3;
	static inline public var MultiplyBlending:Int = 4;
	static inline public var CustomBlending:Int = 5;
	
	/*
	 * Custom blending equations
	 * Numbers start from 100 to not clash with other mappings to OpenGL constants
	 */
	static inline public var AddEquation:Int = 100;
	static inline public var SubtractEquation:Int = 101;
	static inline public var ReverseSubtractEquation:Int = 102;
	
	//Custom blending destination factors
	static inline public var ZeroFactor:Int = 200;
	static inline public var OneFactor:Int = 201;
	static inline public var SrcColorFactor:Int = 202;
	static inline public var OneMinusSrcColorFactor:Int = 203;
	static inline public var SrcAlphaFactor:Int = 204;
	static inline public var OneMinusSrcAlphaFactor:Int = 205;
	static inline public var DstAlphaFactor:Int = 206;
	static inline public var OneMinusDstAlphaFactor:Int = 207;
	
	//Custom blending source factors
	static inline public var DstColorFactor:Int = 208;
	static inline public var OneMinusDstColorFactor:Int = 209;
	static inline public var SrcAlphaSaturateFactor:Int = 210;
	
	//Textures
	static inline public var MultiplyOperation:Int = 0;
	static inline public var MixOperation:Int = 1;
	static inline public var AddOperation:Int = 2;
	
	//Mapping Modes - these were empty functions.. 
	static inline public var UVMapping:Int = 0;
	static inline public var CubeRflectionMapping:Int = 1;
	static inline public var CubeRefractionMapping:Int = 2;
	static inline public var SphericalReflectionMapping:Int = 3;
	static inline public var SphericalRefractionMapping:Int = 4;
	
	//Wrapping Modes
	static inline public var RepeatWrapping:Int = 1000;
	static inline public var ClampToEdgeWrapping:Int = 1001;
	static inline public var MirroredRepeatWrapping:Int = 1002;
	
	//Filters
	static inline public var NearestFilter:Int = 1003;
	static inline public var NearestMipMapNearestFilter:Int = 1004;
	static inline public var NearestMipMapLinearFilter:Int = 1005;
	static inline public var LinearFilter:Int = 1006;
	static inline public var LinearMipMapNearestFilter:Int = 1007;
	static inline public var LinearMipMapLinearFilter:Int = 1008;
	
	//Data Types
	static inline public var UnsignedByteType:Int = 1009;
	static inline public var ByteType:Int = 1010;
	static inline public var ShortType:Int = 1011;
	static inline public var UnsignedShortType:Int = 1012;
	static inline public var IntType:Int = 1013;
	static inline public var UnsignedIntType:Int = 1014;
	static inline public var FloatType:Int = 1015;
	
	//Pixel Types
	static inline public var UnsignedShort4444Type:Int = 1016;
	static inline public var UnsignedShort5551Type:Int = 1017;
	static inline public var UnsignedShort565Type:Int = 1018;
	
	//Pixel Formats
	static inline public var AlphaFormat:Int = 1019;
	static inline public var RGBFormat:Int = 1020;
	static inline public var RGBAFormat:Int = 1021;
	static inline public var LuminanceFormat:Int = 1022;
	static inline public var LuminanceAlphaFormat:Int = 1023;
	
	//Compressed Texture Formats
	static inline public var RGB_S3TC_DXT1_Format:Int = 2001;
	static inline public var RGBA_S3TC_DXT1_Format:Int = 2002;
	static inline public var RGBA_S3TC_DXT3_Format:Int = 2003;
	static inline public var RGBA_S3TC_DXT5_Format:Int = 2004;
	
}


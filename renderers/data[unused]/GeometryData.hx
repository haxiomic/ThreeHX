package three.renderers.data;

import three.core.Face3;
import three.core.Face4;

class GeometryData 
{
	public var geometryGroups:Map<GeometryGroup, GeometryGroup> = null;
	public var renderInit:Bool = false;
	public function new(){}
}

/*
Used params
__colorArray
__faceArray
__inittedArrays
__lineArray
__morphNormalsArrays
__morphTargetsArrays
__normalArray
__openglColorBuffer
__openglCustomAttributesList
__openglFaceBuffer
__openglFaceCount
__openglLineBuffer
__openglLineCount
__openglLineDistanceBuffer
__openglMorphNormalsBuffers
__openglMorphTargetsBuffers
__openglNormalBuffer
__openglParticleCount
__openglSkinIndicesBuffer
__openglSkinWeightsBuffer
__openglTangentBuffer
__openglUV2Buffer
__openglUVBuffer
__openglVertexBuffer
__openglVertexCount
__skinIndexArray
__skinWeightArray
__tangentArray
__uv2Array
__uvArray
__vertexArray
faces3
faces4
id
materialIndex
numMorphNormals
numMorphTargets
*/

/* #! this class is exclusively used by the renderer, it feels wrong to have it in core. 
	  But it's nessesary to keep things statically typed without overhauling the renderer
	  design, is there a better way? 
*/ 
class GeometryGroup 
{	
	public var id:Int;

	public var faces3:Face3;
	public var faces4:Face4;

	public var materialIndex:Int;

	public var numMorphNormals:Int;
	public var numMorphTargets:Int;

	public function new(){}
}
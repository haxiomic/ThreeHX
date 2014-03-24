package three.renderers.data;

import three.core.BaseGeometry;
import three.core.Object3D;
import three.materials.Material;
import three.renderers.data.Object3DData;

class SceneData extends Object3DData
{
	//#! need to type properly
	public var objects:Map<SceneObject, SceneObject>;
	public var objectsImmediate:Map<SceneObject, SceneObject>;
	public var sprites:Map<Dynamic, Dynamic>;
	public var flares:Map<Dynamic, Dynamic>;
	public function new(){
		super();
		objects = new Map<SceneObject, SceneObject>();
		objectsImmediate = new Map<SceneObject, SceneObject>();
		sprites = new Map<Dynamic, Dynamic>();
		flares = new Map<Dynamic, Dynamic>();
	}
}

class SceneObject {
	public var id:Int = -1;
	public var object:Object3D;
	public var buffer:BaseGeometry;
	public var opaque:Material = null;
	public var transparent:Material = null;
	public var z:Float;
	public function new(object:Object3D, ?buffer:BaseGeometry){
		this.object = object;
		this.buffer = buffer;
	}
}
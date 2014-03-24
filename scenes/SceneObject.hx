package three.scenes;

import three.core.BaseGeometry;
import three.core.Object3D;
import three.materials.Material;

class SceneObject 
{
	public var id:Int = -1;
	public var render:Bool = true;
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
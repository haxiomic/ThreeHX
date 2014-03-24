package three.renderers.data;

import three.math.Matrix4;
import three.math.Matrix3;

class Object3DData 
{
	public var init:Bool = false;
	public var active:Bool = false;
	public var modelViewMatrix:Matrix4;
	public var normalMatrix:Matrix3;
	public function new(){}
}
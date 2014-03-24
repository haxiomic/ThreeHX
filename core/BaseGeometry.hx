package three.core;

import three.math.Box3;
import three.math.Sphere;
import three.math.Vector3;

import flash.events.EventDispatcher;
import flash.events.Event;

class BaseGeometry extends EventDispatcher
{
	public var type(default, null):Int;
	public var id:Int;

	//Render Fields
	//Move as required

	public function new(){
		super();
		type = Reflect.field(Main, Type.getClassName(Type.getClass(this)));
	}

	public function dispose ()
	{
		dispatchEvent(new Event('dispose'));
	}
}
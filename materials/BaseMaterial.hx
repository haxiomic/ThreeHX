package three.materials;

class BaseMaterial 
{	
	public var type(default, null):Int;

	public function new(){
		type = Reflect.field(Main, Type.getClassName(Type.getClass(this)));
	}

}
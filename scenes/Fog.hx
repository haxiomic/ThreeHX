package three.scenes;
import three.math.Color;

class Fog 
{
	public var name:String;
	public var color:Color;
	public var near:Int;
	public var far:Int;
	public function new(hex:Int, ?near:Int, ?far:Int){
		this.name = '';
		this.color = new Color(hex);
		this.near = (near != null ? near : 1);
		this.far = (far != null ? far : 1000);
	}

	public function clone():Fog{
		return new Fog(color.getHex(), near, far);
	}
}
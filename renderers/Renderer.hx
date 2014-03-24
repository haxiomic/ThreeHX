package three.renderers;

class Renderer{
	public function new(){}
}

typedef Info = {
	memory:Memory,
	render:Render
}

typedef Memory = {
	programs:Int,
	geometries:Int,
	textures:Int
}

typedef Render = {
	calls: Int,
	vertices: Int,
	faces: Int,
	points:Int
}
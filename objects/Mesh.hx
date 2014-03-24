package three.objects;

import three.core.Geometry;
import three.core.Object3D;
import three.materials.Material;
import three.materials.MeshBasicMaterial;
import three.THREE;

/* 
 * 
 * @author dcm
 */

class Mesh extends GeomObject
{
	
	public var material:Material;

	
	public function new(geometry:Geometry = null, material:Material = null) 
	{
		super(geometry);
		//type = THREE.Mesh;
		setMaterial(material);
	}
	
	
	public function setMaterial (material:Material = null)
	{
		if (material != null) this.material = material;
		else this.material = new MeshBasicMaterial( { color: Math.random() * 0xffffff, wireframe: true } );
	}
	
	
	//#! needs fixing
	override public function clone (?object:Object3D) : Object3D
	{
		//if (object == null) object = new Mesh(geometry, material);
		//super.clone(object);
		return object;
	}
	
	
}
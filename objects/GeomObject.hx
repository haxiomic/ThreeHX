package three.objects;

import three.core.Geometry;
import three.core.Object3D;

class GeomObject extends Object3D
{

	public var geometry(default, set):Geometry;

	public function new(?geometry:Geometry){
		super();
		if (geometry != null) setGeometry(geometry);
		else geometry = new Geometry();
	}

	public function setGeometry (geometry:Geometry)
	{
		this.geometry = geometry;
	}

	public function updateMorphTargets () : Void
	{
		trace("GeomObject.updateMorphTargets() not complete");
		if (geometry.morphTargets.length == 0) return;
		//todo - whenever
		/*
		morphTargetBase = -1;
		morphTargetForcedOrder = new Array();
		morphTargetInfluence = new Array();
		morphTargetDictionary = new Map<String,Int>();
		
		var m = 0, ml = geometry.morphTargets.length;
		while (m < ml)
		{
			morphTargetInfluences.push(0);
			morphTargetDictionary.set(geometry.morphTargets[m].name, m);
			m++;
		}
		*/
		return;
	}

	public function getMorphTargetIndexByName (name:String) : Int
	{
		trace("GeomObject.getMorphTargetIndexByName() not complete");
		return 0; //todo
		/*
		if (morphTargetDictionary.exists(name) == false) 
		{
			trace('Mesh.getMorphTargetIndexByName: $name does not exist!');
			return 0;
		}
		return morphTargetDictionary.get(name);
		*/
	}
	
	//Setters and getters
	//Alias
	private inline function set_geometry(v:Geometry):Geometry{
		geometry = v;
		if (this.geometry.boundingSphere == null) 
			this.geometry.computeBoundingSphere();
		
		updateMorphTargets();
		return this.geometry;
	}
}
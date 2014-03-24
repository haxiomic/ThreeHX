
package three.scenes;

import three.cameras.Camera;
import three.core.Object3D;
import three.extras.Utils;
import three.lights.Light;
import three.materials.Material;

/**
 * 
 * @author dcm
 */

class Scene extends Object3D
{

	public var fog:Fog = null; //THREE.FogExp2 (???)
	public var overrideMaterial:Material = null;
	
	public var autoUpdate:Bool;
		
	public var __objects:Map<Object3D,Object3D>;
	public var __lights:Map<Light,Light>;
	public var __objectsAdded:Map<Object3D,Object3D>;
	public var __objectsRemoved:Map<Object3D,Object3D>;


	//Render fields
	@:allow(three.renderers) private var __gpuObjects:Array<SceneObject>;
	@:allow(three.renderers) private var __gpuObjectsImmediate:Array<SceneObject>;
	@:allow(three.renderers) private var __gpuSprites:Array<SceneObject>;
	@:allow(three.renderers) private var __gpuFlares:Array<SceneObject>;
	

	public function new() 
	{
		super();
		__objects = new Map<Object3D,Object3D>();
		__lights = new Map<Light,Light>();
		__objectsAdded = new Map<Object3D,Object3D>();
		__objectsRemoved = new Map<Object3D,Object3D>();
		
		autoUpdate = true;
		matrixAutoUpdate = false;

		//Render Fields
		__gpuObjects = new Array<SceneObject>();
		__gpuObjectsImmediate = new Array<SceneObject>();
		__gpuSprites = new Array<SceneObject>();
		__gpuFlares = new Array<SceneObject>();
	}
	
	@:allow(three.core.Object3D)
	private function __addObject (object:Object3D)
	{
		if (Std.is(object, Light) == true)
		{
			var light:Light = cast Light; 
			if (__lights.exists(light) == false) __lights.set(light, light);
			if (light.target != null && light.target.parent == null) add(light.target);
			
		//todo - THREE.Bone is also a false condition here in r58
		} else if (Std.is(object, Camera) == false)
		{
			if (__objects.exists(object) == false)
			{
				__objects.set(object, object);
				__objectsAdded.set(object, object);
				
				if (__objectsRemoved.exists(object) == true) __objectsRemoved.remove(object);
			}
		}
		
		var cIter = object.children.iterator();
		while (cIter.hasNext() == true) __addObject(cIter.next());
	}
	
	@:allow(three.core.Object3D)
	private function __removeObject (object:Object3D) 
	{
		if (Std.is(object, Light) == true)
		{
			var light:Light = cast Light; 
			if (__lights.exists(light) == true) __lights.remove(light);
			
		} else if (Std.is(object, Camera) == false)
		{
			if (__objects.exists(object) == true)
			{
				__objects.set(object, object);
				__objectsRemoved.set(object, object);
				
				if (__objectsAdded.exists(object) == true) __objectsAdded.remove(object);
			}
		}
		
		var cIter = object.children.iterator();
		while (cIter.hasNext() == true) __removeObject(cIter.next());
	}
	
}


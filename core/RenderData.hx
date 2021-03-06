
package three.core;

import three.lights.Light;
import three.math.Color;
import three.renderers.renderables.Renderable;
import three.renderers.renderables.RenderableObject;

/**
 * Render data generated by Projector
 * @author dcm
 */

class RenderData
{
	public var objects:Array<RenderableObject>;
	public var sprites:Array<Dynamic>; //todo - sprites
	public var lights:Array<Light>;
	public var elements:Array<Renderable>;
	
	public var ambientLight:Color;
	
	public function new ()
	{
		objects = new Array<RenderableObject>();
		sprites = new Array<Dynamic>();
		lights = new Array<Light>();
		elements = new Array<Renderable>();
		
		ambientLight = new Color();
	}
}



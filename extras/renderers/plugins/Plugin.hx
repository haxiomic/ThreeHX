
package three.extras.renderers.plugins;

import three.cameras.Camera;
import three.renderers.Renderer;
import three.scenes.Scene;

class Plugin 
{
	public function new(){}
	public function init(renderer:Renderer):Void{}
	public function render(scene:Scene, camera:Camera, viewportWidth:Int, viewportHeight:Int):Void{}
}
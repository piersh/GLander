///<reference path="Math.ts"/>
///<reference path="Util.ts"/>
///<reference path="Terrain.ts"/>
///<reference path="Actor.ts"/>

class Texture2D
{
}

class ScoreTag
{
	private _tex: Texture2D = null;
	private _position: Vec3 = null;
	private _velocity: Vec3 = null;
	private _life = 0;
	get Position(): Vec3
	{
		return this._position;
	}
	get Texture(): Texture2D
	{
		return this._tex;
	}
	Initialize(texture: Texture2D, position: Vec3, velocity: Vec3): void
	{
		this._tex = texture;
		this._position = position;
		this._velocity = velocity;
		this._life = 1;
	}
	Update(terrain: Terrain): boolean
	{
		this._life = this._life - 0.02;
		var result: boolean;
		if (this._life <= 0)
		{
			result = false;
		}
		else
		{
			this._velocity.y = this._velocity.y + 0.0045;
			this._position = terrain.Wrap(this._position.add(this._velocity));
			result = true;
		}
		return result;
	}
}
class ScoreTags
{
	_rgScoreTags = new Array<ScoreTag>();
	_rgFree = new Array<ScoreTag>();
	_rgV: ScoreTags_ParticleVertex[] = new Array<ScoreTags_ParticleVertex>(6);
	_ctx: CanvasRenderingContext2D;
	_height = 20;

	_vbTextureCoords: WebGLBuffer;
	_vbPosition: WebGLBuffer;
	_vbColor: WebGLBuffer;
	_vbSize: WebGLBuffer;
	_ibTerrain: WebGLBuffer;

	constructor()
	{
		//this._font = font;

		var ctx = this._ctx = document.createElement("canvas").getContext("2d");
		ctx.font = `{this._height}px monospace`;
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.canvas.height = this._height * 2;
		ctx.canvas.width = ctx.measureText("0123456789").width + 20;

		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		var widths = [];
		var offsets = [];
		var offset = 0;
		for (var i = 0; i < 10; i++)
		{
			var str = String.fromCharCode("0".charCodeAt(0) + i);
			var width = ctx.measureText(str).width;
			widths[i] = width;
			offsets[i] = offset;
			offset += width + 1;
		}

		for (var row = 0; row < 2; row++)
		{
			var color = row == 0 ? Color.White : Color.Red;
			ctx.fillStyle = `rgba(${color.R},${color.G},${color.B},${color.A / 255})`;

			for (var i = 0; i < 10; i++)
			{
				var str = String.fromCharCode("0".charCodeAt(0) + i);
				ctx.fillText(str, offsets[i], row * this._height);
			}
		}

		for (var iVertex = 0; iVertex < 6; ++iVertex)
		{
			switch (iVertex % 6)
			{
				case 0:
					this._rgV[iVertex].TextureCoords = Vec2.Zero;
					break;
				case 1:
				case 4:
					this._rgV[iVertex].TextureCoords = Vec2.UnitY;
					break;
				case 2:
				case 3:
					this._rgV[iVertex].TextureCoords = Vec2.UnitX;
					break;
				case 5:
					this._rgV[iVertex].TextureCoords = Vec2.One;
					break;
			}
		}
	}
	AddScoreTag(score: number, position: Vec3, velocity: Vec3): void
	{
		var scoreTag = (this._rgFree.length > 0) ? this._rgFree.pop() : new ScoreTag();
		var scoreTexture = this.GetScoreTexture(score);
		scoreTag.Initialize(scoreTexture, position, velocity);
		this._rgScoreTags.push(scoreTag);
	}
	Update(terrain: Terrain, actors: Actors): void
	{
		for (var iTag = 0; iTag < this._rgScoreTags.length; ++iTag)
		{
			var scoreTag = this._rgScoreTags[iTag];
			console.assert(scoreTag !== null);
			if (!scoreTag.Update(terrain))
				this.RemoveAt(iTag--);
		}
	}
	Draw(minX: number, maxX: number, minZ: number, maxZ: number, width: number, height: number): void
	{
		useProgram(_programBillboards);

		//const width = sizeTerrain.Width;
		//const height = sizeTerrain.Height;

		loadAttribBuffer(_programBillboards["aTextureCoords"], this._vbTextureCoords);
		loadAttribBuffer(_programBillboards["aPosition"], this._vbPosition);
		loadAttribBuffer(_programBillboards["aColor"], this._vbColor);
		loadAttribBuffer(_programBillboards["aSize"], this._vbSize);

		gl.uniformMatrix4fv(_programBillboards["xWorldView"], false, mxView.flatten());

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibTerrain);

		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);

		const rgfPosition = <Float32Array>this._vbPosition["items"];
		const rgfSize = <Float32Array>this._vbSize["items"];

		for (var iTag = 0; iTag < this._rgScoreTags.length; ++iTag)
		{
			const scoreTag = this._rgScoreTags[iTag];
			console.assert(scoreTag !== null);

			const x = Util.Wrap(scoreTag.Position.x, minX, minX + width);
			if (x > maxX)
				continue;

			const z = Util.Wrap(scoreTag.Position.z, minZ, minZ + height);
			if (z > maxZ)
				continue;

			const pos = new Vec3(x, scoreTag.Position.y, z);
			pos.writeTo(rgfPosition, 0);
			pos.writeTo(rgfPosition, 1);
			pos.writeTo(rgfPosition, 2);
			pos.writeTo(rgfPosition, 3);

			rgfSize[0] =
			rgfSize[1] =
			rgfSize[2] =
			rgfSize[3] = scoreTag.Size;

			updateDynamicBuffer(this._vbPosition, 0, rgfPosition);
			updateDynamicBuffer(this._vbSize, 0, rgfSize);
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
		}

		gl.disableVertexAttribArray(_programBillboards["aTextureCoords"]);
		gl.disableVertexAttribArray(_programBillboards["aPosition"]);
		gl.disableVertexAttribArray(_programBillboards["aSize"]);
	}

	RemoveAt(i: number): void
	{
		this._rgFree.push(this._rgScoreTags[i]);
		this._rgScoreTags[i] = this._rgScoreTags.pop();
	}
}

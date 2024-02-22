import { EventEmitter } from "events";
import { Camera } from "v4l2-camera-ts";

// a "thread", i.e. a detached async loop
export class CameraThread extends EventEmitter {
	private _stopSignal = false;
	private _running = false;
	private _frames = 0;

	constructor(
		private readonly _camera: Camera,
	) {
		super();
	}

	get running() {
		return this._running;
	}

	get frames() {
		return this._frames;
	}

	start() {
		this._camera.start();
		this._stopSignal = false;
		this._frames = 0;

		setTimeout(() => this.run(), 0); // "detach"

		this._running = true;
	}

	stop() {
		this._stopSignal = true;
	}

	stopAndWait() {
		return new Promise<void>(resolve => {
			this.once("stopped", resolve);
			this.stop();
		});
	}

	private async run() {
		try {
			while (!this._stopSignal) {
				const frame = await this._camera.getNextFrame();

				if (this._stopSignal) break; // can change in the meantime

				this.emit("frame", frame);
				this._frames++;
			}

			this._camera.stop();
		} catch(e) {
			this.emit("error", e);
		}

		this.emit("stopped");
		this._running = false;
	}

	getNextFrame(): Promise<Buffer> {
		if (!this._running) {
			throw new Error("Camera thread is not running");
		}

		return new Promise((resolve, reject) => {
			const errorFn = (err: Error) => {
				this.off("frame", resolve);
				reject(err);
			};

			const frameFn = (frame: Buffer) => {
				this.off("error", errorFn);
				resolve(frame);
			};

			this.once("frame", frameFn);
			this.once("error", errorFn);
		});
	}
}
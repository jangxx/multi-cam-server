import { EventEmitter } from "events";
import { Camera } from "v4l2-camera-ts";

// a "thread", i.e. a detached async loop
export class CameraThread extends EventEmitter {
	private _stopSignal = false;
	private _running = false;

	constructor(
		private readonly _camera: Camera,
	) {
		super();
	}

	get running() {
		return this._running;
	}

	start() {
		this._camera.start();
		this._stopSignal = false;

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
			}

			this._camera.stop();
		} catch(e) {
			this.emit("error", e);
		}

		this.emit("stopped");
		this._running = false;
	}

	// private run() {
	// 	let promise = Promise.resolve();

	// 	const loop = () => {
	// 		promise = promise.then(() => {
	// 			if (this._stopSignal) return;

	// 			return this._camera.getNextFrame();
	// 		}).then(frame => {
	// 			if (this._stopSignal) return;

	// 			this.emit("frame", frame);

	// 			loop();
	// 		}, e => {
	// 			console.log("caught", e);
	// 		});
	// 	};

	// 	loop();
	// }
}
import fsp from "fs/promises";
import path from "path";
import { Camera } from "v4l2-camera";

import { CameraThread } from "./camera-thread";
import { InternalError, NotFoundError } from "./exceptions";

export class CameraManager {
	private _cameras: Record<string, Camera> = {};
	private _cameraThreads: Record<string, CameraThread> = {};

	constructor() {
	}

	openCamera(cameraPath: string, name?: string) {
		if (name === undefined) {
			name = path.basename(cameraPath);
		}

		console.log(`Opening camera ${name} (${cameraPath})`);

		const camera = new Camera();
		camera.open(cameraPath);

		this._cameras[name] = camera;
		this._cameraThreads[name] = new CameraThread(camera);

		this._cameraThreads[name].on("error", (err) => {
			console.log(`Camera ${name} encountered an error:`, err);

			camera.close();

			delete this._cameras[name!];
			delete this._cameraThreads[name!];
		});

		return { name };
	}

	setCameraParameters(name: string, width: number, height: number) {
		if (!this._cameras[name]) {
			throw new NotFoundError("camera");
		}

		console.log(`Setting camera ${name} resolution to ${width}x${height}`)

		const camera = this._cameras[name];

		camera.setFormat({
			width,
			height,
			pixelFormatStr: "MJPG",
		});

		const format = camera.queryFormat();

		if (format.pixelFormatStr !== "MJPG") {
			throw new InternalError(`Camera ${name} does not support MJPG format`);
		}
		if (format.width !== width || format.height !== height) {
			throw new InternalError(`Camera ${name} does not support the requested resolution`);
		}
	}

	getCameraFormat(name: string) {
		if (!this._cameras[name]) {
			throw new NotFoundError("camera");
		}

		return this._cameras[name].queryFormat();
	}

	aquireCameraThread(name: string): CameraThread {
		if (!this._cameraThreads[name]) {
			throw new NotFoundError("camera");
		}

		const thread = this._cameraThreads[name];

		if (!thread.running) {
			thread.start();
		}

		return thread;
	}

	releaseCameraThread(name: string) {
		if (!this._cameraThreads[name]) {
			throw new NotFoundError("camera");
		}

		const thread = this._cameraThreads[name];

		if (thread.running && thread.listenerCount("frame") === 0) {
			thread.stop();
		}
	}
}
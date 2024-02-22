import fsp from "fs/promises";
import path from "path";
import { Camera } from "v4l2-camera-ts";

import { CameraThread } from "./camera-thread";
import { InternalError, NotFoundError } from "./exceptions";

interface CameraObject {
	camera: Camera;
	thread: CameraThread;
	meta: {
		path: string;
	};
}

export class CameraManager {
	private _cameras: Record<string, CameraObject> = {};

	constructor() {
	}

	async _closeAll() {
		for (const name in this._cameras) {
			await this._cameras[name].thread.stopAndWait();

			this._cameras[name].camera.close();

			delete this._cameras[name];
		}
	}

	listCameras() {
		return Object.entries(this._cameras).map(([name, { meta }]) => ({
			name,
			path: meta.path,
			formatUrl: `/cam/${name}`,
			streamUrl: `/cam/${name}/stream`,
			snapshotUrl: `/cam/${name}/snapshot`,
		}));
	}

	openCamera(cameraPath: string, name?: string) {
		if (name === undefined) {
			name = path.basename(cameraPath);
		}

		console.log(`Opening camera "${name}" (${cameraPath})`);

		const camera = new Camera();
		camera.open(cameraPath);

		const cameraObj = {
			camera,
			thread: new CameraThread(camera),
			meta: {
				path: cameraPath,
			},
		};

		this._cameras[name] = cameraObj;

		this._cameras[name].thread.on("error", (err) => {
			console.log(`Camera "${name}" encountered an error:`, err.message);

			this._closeAll().then(() => {
				process.exit(1);
			});
		});

		return { name };
	}

	setCameraParameters(name: string, width: number, height: number) {
		if (!this._cameras[name]) {
			throw new NotFoundError("camera");
		}

		console.log(`Setting camera "${name}" resolution to ${width}x${height}`)

		const { camera } = this._cameras[name];

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

		return this._cameras[name].camera.queryFormat();
	}

	aquireCameraThread(name: string): CameraThread {
		if (!this._cameras[name]) {
			throw new NotFoundError("camera");
		}

		const { thread } = this._cameras[name];

		if (!thread.running) {
			thread.start();
		}

		return thread;
	}

	releaseCameraThread(name: string) {
		if (!this._cameras[name]) {
			throw new NotFoundError("camera");
		}

		const { thread } = this._cameras[name];

		if (thread.running && thread.listenerCount("frame") === 0) {
			thread.stop();
		}
	}
}
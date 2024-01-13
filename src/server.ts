import express from "express";

import { CameraManager } from "./camera-manager";

export function startServer(address: string, port: number, manager: CameraManager) {
	const app = express();

	app.listen(port, address, () => {
		console.log(`Started server on ${address}:${port}`);
	});
}
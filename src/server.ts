import express from "express";

import { CameraManager } from "./camera-manager";

export function startServer(address: string, port: number, manager: CameraManager) {
	const app = express();

	app.get("/cam/:name", (req, res) => {
		const name = req.params.name;

		try {
			const format = manager.getCameraFormat(name);

			res.json(format);
		} catch(e: any) {
			if (e.isCustomError) {
				res.status(e.httpCode).json({ error: e.message });
			} else {
				res.status(500).send((e as Error).stack);
			}
		}
	});

	app.get("/cam/:name/stream", (req, res) => {
		const name = req.params.name;

		try {
			const thread = manager.aquireCameraThread(name);

			res.writeHead(200, {
				"Content-Type": "multipart/x-mixed-replace; boundary=frame",
				"Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
				Connection: "keep-alive",
				Pragma: "no-cache",
			});

			const listener = (frame: Buffer) => {
				res.write("--frame\r\n");
				res.write("Content-Type: image/jpeg\r\n");
				res.write(`Content-Length: ${frame.length}\r\n`);
				res.write("\r\n");
				res.write(frame, "binary");
				res.write("\r\n");
			};

			thread.on("frame", listener);

			res.on("close", () => {
				thread.off("frame", listener);

				try {
					manager.releaseCameraThread(name);
				} catch(e) {
					// ignore
				}

				res.end();
			});
		} catch(e: any) {
			if (e.isCustomError) {
				res.status(e.httpCode).json({ error: e.message });
			} else {
				res.status(500).send((e as Error).stack);
			}
		}
	});

	app.get("/cams", (req, res) => {
		res.json(manager.listCameras());
	});

	app.listen(port, address, () => {
		console.log(`Started server on ${address}:${port}`);
	});
}
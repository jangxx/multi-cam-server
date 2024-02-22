import express from "express";
import sharp from "sharp";

import { CameraManager } from "./camera-manager";

function run(fn: (req: express.Request, res: express.Response) => Promise<void>) {
	return (req: express.Request, res: express.Response, next: express.NextFunction) => {
		fn(req, res).catch(next);
	};
}

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

	app.get("/cam/:name/snapshot", run(async (req, res) => {
		const name = req.params.name;
		const warmupFrames = parseInt(req.query?.["warmup-frames"] as string) || 0;
		const quality = parseInt(req.query?.["quality"] as string) || 80;

		try {
			const thread = manager.aquireCameraThread(name);

			res.setHeader("Content-Type", "image/jpeg");

			if (thread.frames == 0) {
				for (let i = 0; i < warmupFrames; i++) {
					await thread.getNextFrame();
				}
			}

			const frame = await thread.getNextFrame();

			sharp(frame).toFormat("jpeg", { quality }).pipe(res);

			manager.releaseCameraThread(name);
		} catch(e: any) {
			if (e.isCustomError) {
				res.status(e.httpCode).json({ error: e.message });
			} else {
				res.status(500).send((e as Error).stack);
			}
		}
	}));

	app.get("/cams", (req, res) => {
		res.json(manager.listCameras());
	});

	app.listen(port, address, () => {
		console.log(`Started server on ${address}:${port}`);
	});
}
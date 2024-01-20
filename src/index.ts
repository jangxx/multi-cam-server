import { program } from "commander";
import packageJson from "../package.json";
import { startServer } from "./server";
import { CameraManager } from "./camera-manager";

program
	.version(packageJson.version)
	.option("-p, --port [port]", "Port to run bind server to", "8080")
	.option("-a, --address [address]", "Address to bind the server to", "0.0.0.0")
	.requiredOption("-c, --camera <camera...>", "Paths to the camera to add to the server. You can prepend an alternative name with a colon (e.g. 'webcam:/dev/video0')")
	.requiredOption("-r, --resolution <resolution...>", "Resolution to use for the camera(s). Either a single value (e.g. '640x480') for all cameras or one value per camera prefixed with the name (e.g. 'webcam:640x480')");

program.parse(process.argv);

const args = program.opts();

const cameraManager = new CameraManager();

const resolutions: Record<string, { width: number, height: number }> = {};

for (const resolutionDef of args.resolution) {
	const matches = resolutionDef.match(/^([a-zA-Z0-9_-]+):(\d+)x(\d+)$/);

	if (matches) {
		resolutions[matches[1]] = {
			width: parseInt(matches[2]),
			height: parseInt(matches[3]),
		};
	} else {
		const matches2 = resolutionDef.match(/^(\d+)x(\d+)$/);

		if (matches2) {
			resolutions["*"] = {
				width: parseInt(matches2[1]),
				height: parseInt(matches2[2]),
			};
		} else {
			throw new Error(`Invalid resolution: ${resolutionDef}`);
		}
	}
}

for (const cameraDef of args.camera) {
	const matches = cameraDef.match(/^([a-zA-Z0-9_-]+):(.+)$/);

	let result: ReturnType<CameraManager["openCamera"]>;

	if (matches) {
		result = cameraManager.openCamera(matches[2], matches[1]);
	} else {
		result = cameraManager.openCamera(cameraDef);
	}

	const resolution = resolutions[result.name] || resolutions["*"];

	if (!resolution) {
		throw new Error(`No resolution specified for camera ${result.name}`);
	}

	cameraManager.setCameraParameters(result.name, resolution.width, resolution.height);
}

startServer(args.address, parseInt(args.port), cameraManager);
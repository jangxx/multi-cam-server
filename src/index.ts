import { program } from "commander";
import packageJson from "../package.json";
import { startServer } from "./server";
import { CameraManager } from "./camera-manager";

program
	.version(packageJson.version)
	.option("-p, --port <port>", "Port to run the server on", "8080")
	.option("-a, --address <address>", "Address to run the server on", "0.0.0.0")
	.requiredOption("-c, --camera <camera...>", "Paths to the camera to add to the server. You can prepend an alternative name with a colon (e.g. 'webcam:/dev/video0')");

program.parse(process.argv);

const args = program.opts();

const cameraManager = new CameraManager();

// TODO: load and initialize cameras

startServer(args.address, parseInt(args.port), cameraManager);
# multi-cam-server
Very basic MJPEG streaming server which can serve multiple cameras and also only accesses them if the stream is open.

## Usage

```bash
npx multi-cam-server -c /dev/video0 -r 1920x1080
```

This will download the program and run it immediately.
The stream can now be accessed under _http://localhost:8080/cam/video0/stream_.

## Motivation

I had been using mjpeg-streamer for many years but started to dislike it after I realized that it always keeping the camera open is responsible for a big increase in power consumption on my server.

This server can not only serve more than one webcam from the same server, it will also only read data from the webcam if the stream is open.
Not only does this save power, it also allows you to use the webcam LED to see if anyone is watching the stream instead of it always being on.

## Routes

- `<host>`/cams: Returns a list of all opened cameras and their respective URLs.
- `<host>`/cam/`{name}`: Returns format information about the webcam `{name}`.
- `<host>`/cam/`{name}`/stream: Returns an MJPEG stream of webcam frames.

## Parameters

```
Options:
  -V, --version                     output the version number
  -p, --port <port>                 Port to run bind server to (default: "8080")
  -a, --address <address>           Address to bind the server to (default: "0.0.0.0")
  -c, --camera <camera...>          Paths to the camera to add to the server. 
                                    You can prepend an alternative name with a colon (e.g. 'webcam:/dev/video0')
  -r, --resolution <resolution...>  Resolution to use for the camera(s).
                                    Either a single value (e.g. '640x480') for all cameras
									or one value per camera prefixed with the name (e.g. 'webcam:640x480')
  -h, --help                        display help for command
```
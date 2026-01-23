This repo contains two components, the api and the website.

The api wraps matlab into a REST API, and the website is a frontend for that API that exposes a webinterface and the raw API via nginx.


# `api`: Matlab API wrapper

## TODO

 * [ ] Check if simulink works
 * [ ] Check if license really isn't needed
 * [x] check if can be made faster, e.g. by keeping the matlab runtime up. Now it seems slow because every call starts the matlab runtime.

## Overview

This repo demonstrates an API wrapper around a matlab function. It works a bit like this:

 - You're on linux.
 - A docker container provides the entire matlab runtime environment, and allows you to build it
   without being the original developer of the code.
 - The container contains a fastAPI+python file, that is hosted as an HTTP REST-API
 - The API accepts json and returns json. The accepted JSON is passed to the 'matlab executable', a compiled version of the matlab code.
 - The accepted JSON is passed to matlab, and parsed into whatever inputs the `model` requires. In this case `x=5`.
 - The output of is formatted into json and returned to fastAPI, which in return returns it to the user of the API.

The code for this API is located in `/api`. (`web` contains a website frontend).

## Matlab code

### `mymagic.m`

Contains whatever model you have. In this case it's a function that takes an integer and returns a matrix.

### `mymagic_cli.m`

Wraps `mymagic` such that it takes json as input, and provides json as output as well. This allows the function
to be called from the command line with a relatively flexible interface (json supports a lot, like
dictionaries, lists, matrices, etc).

Here `x_in` is a JSON-string, e.g. `'{"x": 5}` and out_json is a filename, e.g. `"out.json"`.
Then `x = jsondecode(x_in);` transforms the json-string into a struct, such that `5` (or whatever value) van be extracted.
There can be as many input variables of different types as you want.

Then the result, `y`, is written to a json-file (`out_json`).

```matlab
function mymagic_cli(x_in, out_json)
  % Wraps mymagic.m such that it can be called with a json string with the inputs,
  % and such that the output is written as a json-file as well.
  % Example: mymagic_cli('{"x": 5}', "out.json")

  x = jsondecode(x_in);
  
  y = mymagic(x.x);

  fid = fopen(out_json, 'w');
  fwrite(fid, jsonencode(y), 'char');
  fclose(fid);
end
```

There's a variation of this file, `mymagic_worker.m`, which keeps running in a loop and waits for input files to appear. This is useful if you want to keep the matlab runtime up, and avoid the overhead of starting it every API call, and makes the website MUCH faster.

## Compile the matlab worker to a standalone application

that runs without a license.

```bash
(cd api; mcc -m mymagic_worker.m -a mymagic.m -d build)
```

If you wish, you can test the script in the `build`-folder, this will start the worker and it will run indefinetly (i.e. as a daemon):

```bash
./api/build/run_mymagic_worker.sh '/usr/local/MATLAB/R2025b/' jobs
```

In a new terminal, run

```bash
echo '{"x": 4}' > jobs/some_job.in.json
sleep 1
cat jobs/some_job.out.json 
```

Assuming 1 second is enough for the worker to process the job, this will output:

```json
{"ok":true,"y":[[16,2,3,13],[5,11,10,8],[9,7,6,12],[4,14,15,1]]}
```

Now stop the worker by running `touch jobs/__quit__` and optionally clean up the jobs folder with `rm -r jobs/`.

# The web-application

`web/webapp` Contains a website that presents a slider and automatically calls the API and shows the resulting magix matrix.

![website](website.png)

We'll deploy everything below:


# Building everything (`docker compose`)

`compose.yaml` contains all the building instructions, except for compiling the matlab worker, which needs to be done beforehand with the `mcc` command. That's on purpose, because building requires a license, and this way that needs to be done only once and can be commited to the repository.

Build the containers using one of these commands, the latter gives a more verbose output allowing for easier debugging:

```bash
docker compose build
# Alternatively:
# docker compose build --progress plain
```
Then start the containers, the optional `-d` starts them in the background.

```bash
docker compose up
# Alterntively
# docker compose up -d
```

Now you can test the API:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"x": 5}' http://localhost:8080/api/mymagic | python3 -m json.tool
```

which outputs the output of `mymagic.m`:

```json
{
    "x": 5,
    "y": [
        [17, 24,  1,  8, 15],
        [23,  5,  7, 14, 16],
        [ 4,  6, 13, 20, 22],
        [10, 12, 19, 21,  3],
        [11, 18, 25,  2,  9]
    ],
}
```

You can also test the website at [http://localhost:8080/](http://localhost:8080/) and use the webinterface as shown in the image above.

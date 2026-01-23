# Matlab API wrapper

This repo demonstrates an API wrapper around a matlab function. It works a bit like this:

 - You're on linux.
 - A docker container provides the entire matlab runtime environment, and allows you to build it
   without being the original developer of the code.
 - The container contains a fastAPI+python file, that is hosted as an HTTP REST-API
 - The API accepts json and returns json. The accepted JSON is passed to the 'matlab executable', a compiled version of the matlab code.
 - The accepted JSON is passed to matlab, and parsed into whatever inputs the `model` requires. In this case `x=5`.
 - The output of is formatted into json and returned to fastAPI, which in return returns it to the user of the API.


# Matlab code

# `mymagic.m`

Contains whatever model you have. In this case it's a function that takes an integer and returns a matrix.

# `mymagic_cli.m`

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


# Compile the matlab function to a standalone application

that runs without a license.

```bash
mcc -m mymagic_cli.m -a mymagic_cli.m -d build
```

If you wish, you can test the script in the `build`-folder. Please note the escaped quotes, e.g. '{\"x\": 5}', this is necessary because of how `run_mymagic_cli.sh` operates (little bug from the matlab compiler), but they won't be necessary for the API.

```bash
./build/run_mymagic_cli.sh '/usr/local/MATLAB/R2025b/' '{\"x\": 5}' out.json
```

Which should create an output file `out.json` with the following content:

```json
[[17,24,1,8,15],[23,5,7,14,16],[4,6,13,20,22],[10,12,19,21,3],[11,18,25,2,9]]
```


# Build and running the docker image

This builds a docker image, which automatically contains the matlab runtime too.

```bash
docker build -t mymagic-api .
```

Running it then starts a small 'virtual machine' on your computer, a so called container:

```bash
docker run -p 8000:8000 mymagic-api
```

After it starts, you can call the API with the following command:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"x": 5}' http://localhost:8000/mymagic | python3 -m json.tool
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
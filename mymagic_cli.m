function mymagic_cli(x_in, out_json)
  % Wraps mymagic.m such that it can be called with a json string with the inputs,
  % and such that the output is written as a json-file as well.
  % Example: mymagic_cli('{"x": 5}', "out.json")
  inp = jsondecode(x_in);

  y = mymagic(inp.x);

  fid = fopen(out_json, 'w');
  fwrite(fid, jsonencode(y), 'char');
  fclose(fid);
end

function mymagic_cli(in_json, out_json)
  % Wraps mymagic.m such that it can be called with a json string with the inputs,
  % and such that the output is written as a json-file as well.
  % Example: mymagic_cli("in.json", "out.json")
  
  inp = jsondecode(fileread(in_json))
  
  y = mymagic(inp.x);

  fid = fopen(out_json, 'w');
  fwrite(fid, jsonencode(y), 'char');
  fclose(fid);
end

function mymagic_worker(job_dir)
% Persistent worker that polls job_dir for JSON jobs:
%   <id>.in.json  -> writes <id>.out.json
%
% Input JSON example:
%   {"x": 5}
%
% Output JSON example:
%   {"ok":true,"y":[[...],[...]]}
%
% Quit: create a file named "__quit__" in job_dir.

    if nargin < 1 || strlength(job_dir) == 0
        job_dir = "/tmp/mymagic_jobs";
    end

    if ~isfolder(job_dir)
        mkdir(job_dir);
    end

    fprintf("mymagic_worker_fs polling: %s\n", job_dir);

    while true
        % graceful shutdown
        if isfile(fullfile(job_dir, "__quit__"))
            fprintf("Quit file detected. Exiting.\n");
            break;
        end

        files = dir(fullfile(job_dir, "*.in.json"));
        if isempty(files)
            pause(0.02); % 20ms
            continue;
        end

        for k = 1:numel(files)
            in_path = fullfile(files(k).folder, files(k).name);

            % Avoid partially written files: require stable size for a short moment
            s1 = dir(in_path); 
            pause(0.01);
            s2 = dir(in_path);
            if isempty(s1) || isempty(s2) || s1.bytes ~= s2.bytes
                continue;
            end

            out_path = strrep(in_path, ".in.json", ".out.json");
            tmp_out  = out_path + ".tmp";

            try
                req = jsondecode(fileread(in_path));
                x = req.x;
                y = magic(x);
                resp = struct("ok", true, "y", y);
            catch ME
                resp = struct("ok", false, "error", getReport(ME, "basic"));
            end

            % Atomic-ish write: write temp then move
            fid = fopen(tmp_out, "w");
            fwrite(fid, jsonencode(resp), "char");
            fclose(fid);
            movefile(tmp_out, out_path, "f");

            delete(in_path);
        end
    end
end
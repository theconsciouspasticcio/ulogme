import json
import os
import os.path
import glob
import logging


LOG_TYPES = ["window", "keyfreq", "notes", "blog"]
ROOT = ""
RENDER_ROOT = os.path.join(ROOT, "render", "event_jsons")

logging.basicConfig(format="%(asctime)s %(message)s", level=logging.INFO)


def load_events(fname):
    """
    Reads a file that consists of first column of unix timestamps
    followed by arbitrary string, one per line. Outputs as dictionary.
    Also keeps track of min and max time seen in global mint,maxt
    """

    events = []
    with open(fname, "r") as fh:
        for w in fh:
            w = w.strip()
            ix = w.find(" ")  # find first space, that's where stamp ends
            stamp = int(w[:ix])
            str = w[ix + 1 :]
            events.append({"t": stamp, "s": str})
    return events


def mtime(f):
    """
    return time file was last modified, or 0 if it doesnt exist
    """
    if os.path.isfile(f):
        return int(os.path.getmtime(f))
    else:
        return 0


def update_events(force=False):
    """
    goes down the list of .txt log files and writes all .json
    files that can be used by the frontend
    """
    logging.info("updating events")
    L = []
    for log_type in LOG_TYPES:
        L.extend(glob.glob(f"logs/{log_type}_*.txt"))

    # extract all times. all log files of form {type}_{stamp}.txt
    ts = [int(x[x.find("_") + 1 : x.find(".txt")]) for x in L]
    ts = list(set(ts))
    ts.sort()

    mint = min(ts)

    # march from beginning to end, group events for each day and write json
    os.system("mkdir -p " + RENDER_ROOT)  # make sure output directory exists
    t = mint
    out_list = []
    for t in ts:
        t0 = t
        t1 = t0 + 60 * 60 * 24  # 24 hrs later
        fout = "events_%d.json" % (t0,)
        out_list.append({"t0": t0, "t1": t1, "fname": fout})

        fwrite = os.path.join(RENDER_ROOT, fout)

        # log_files_for_day will be dictionary with key as log type and value as log file name
        log_files_for_day = {}
        for log_type in LOG_TYPES:
            log_file_for_day = f"logs/{log_type}_{t0}.txt"
            if os.path.isfile(log_file_for_day):
                log_files_for_day[log_type] = log_file_for_day

        dowrite = False
        # output file already exists?
        # if the log files have not changed there is no need to regen
        if os.path.isfile(fwrite):
            tmod = mtime(fwrite)
            mod_times = [mtime(x) for x in log_files_for_day.values()]
            if max(mod_times) > tmod:
                dowrite = True  # better update!
                logging.info(f"a log file has changed, so will update {fwrite}")
        else:
            # output file doesnt exist, so write.
            dowrite = True

        if dowrite or force:
            # okay lets do work, frontend expects a dictionary with keys with suffix _events
            events = {f"{k}_events": load_events(x) for k, x in log_files_for_day.items() if k != "blog"}
            if "keyfreq_events" in events:
                for key_freq_entry in events["keyfreq_events"]:
                    try:
                        key_freq_entry["s"] = int(key_freq_entry["s"])  # int convert
                    except Exception:
                        print(f"Error on {key_freq_entry}")

            if "blog" in log_files_for_day:
                with open(log_files_for_day["blog"], "r") as fh:
                    events["blog"] = fh.read()

            for k in LOG_TYPES:
                if k != "blog" and k + "_events" not in events:
                    events[k + "_events"] = []

            with open(fwrite, "w") as fh:
                fh.write(json.dumps(events))
            logging.info("wrote " + fwrite)

    fwrite = os.path.join(RENDER_ROOT, "export_list.json")
    with open(fwrite, "w") as fh:
        fh.write(json.dumps(out_list))
    logging.info("wrote " + fwrite)


# invoked as script
if __name__ == "__main__":
    update_events(force=True)

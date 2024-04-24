import glob
import json
import logging
import os
import os.path
from datetime import datetime

LOG_TYPES = ["window", "keyfreq", "notes", "blog"]
ROOT = ""
RENDER_ROOT = os.path.join(ROOT, "render", "event_jsons")

logging.basicConfig(format="%(asctime)s %(message)s", level=logging.INFO)


# def load_events(fname):
#     """
#     Reads a file that consists of first column of unix timestamps
#     followed by arbitrary string, one per line. Outputs as dictionary.
#     Also keeps track of min and max time seen in global mint,maxt
#     """

#     events = []
#     with open(fname, "r") as fh:
#         for w in fh:
#             w = w.strip()
#             line = w.split(" ", maxsplit=1)
#             if len(line) == 1:
#                 # an error has occured an nothing has been logged
#                 timestamp = line[0]
#                 label = "unk"
#             else:
#                 timestamp, label = line
#             events.append({"t": int(timestamp), "s": label})
#     return events


def clean_timestamp(timestamp):
    # Remove null bytes and any other non-numeric characters
    return "".join(filter(str.isdigit, timestamp))


def load_events(fname):
    events = []
    with open(fname, "r") as fh:
        for line in fh:
            line = line.strip()
            parts = line.split(" ", maxsplit=1)
            if len(parts) == 1:
                # Handle the case where no label is provided
                timestamp = parts[0]
                label = "unk"
            else:
                timestamp, label = parts

            # Clean the timestamp before conversion
            clean_ts = clean_timestamp(timestamp)
            try:
                events.append({"t": int(clean_ts), "s": label})
            except ValueError:
                logging.error(f"Failed to convert timestamp: {timestamp}")
                # Log or handle cases where timestamp remains invalid
                continue
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
    ts = []
    for x in L:
        try:
            ts.append(int(x[x.find("_") + 1 : x.find(".txt")]))
        except ValueError:
            logging.warning(f"Error with filename {x}, skipping")

    ts = list(set(ts))
    ts.sort()

    mint = min(ts)

    # march from beginning to end, group events for each day and write json
    os.system("mkdir -p " + RENDER_ROOT)  # make sure output directory exists
    t = mint
    out_list = []
    for t in ts:
        t0 = t
        # convert t0 to day-month-year
        t0_string = datetime.fromtimestamp(t0).strftime("%d-%m-%Y")
        t0_corrected = datetime.fromtimestamp(t0).replace(hour=7)
        t0_corrected = int(t0_corrected.timestamp())
        t1 = t0_corrected + 60 * 60 * 24  # 24 hrs later
        fout = "events_%s.json" % (t0_string,)
        out_list.append({"t0": t0_corrected, "t1": t1, "fname": fout})

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
            event_out = {k + "_events": [] for k in LOG_TYPES if k != "blog"}
            for log_type, v in log_files_for_day.items():
                if log_type == "blog":
                    with open(log_files_for_day["blog"], "r") as fh:
                        event_out["blog"] = fh.read()
                    continue

                event_out[log_type + "_events"] = load_events(v)
                if log_type == "keyfreq":
                    for k in event_out[log_type + "_events"]:
                        k["s"] = int(k["s"])  # int convert

            with open(fwrite, "w") as fh:
                fh.write(json.dumps(event_out))
            logging.info("wrote " + fwrite)

    fwrite = os.path.join(RENDER_ROOT, "export_list.json")
    filtered_out_list = []
    start_times = []
    for k in out_list:
        if k["t0"] in start_times:
            continue
        start_times.append(k["t0"])
        filtered_out_list.append(k)
    with open(fwrite, "w") as fh:
        fh.write(json.dumps(filtered_out_list))
    logging.info("wrote " + fwrite)


# invoked as script
if __name__ == "__main__":
    update_events(force=True)

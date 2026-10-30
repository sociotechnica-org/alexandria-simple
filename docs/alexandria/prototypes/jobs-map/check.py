"""Validate a jobs data file against SCHEMA.md and, if present, the library.

Usage: python3 check.py sorare.jobs.json [path/to/library]
"""
import json
import os
import sys


def main(path, lib=None):
    d = json.load(open(path))
    jobs = {j["id"] for j in d["jobs"]}
    stocks = {s["id"] for s in d["stocks"]}
    phases = {p["id"] for p in d["phases"]}
    cells = {(c["job"], c["dimension"]) for c in d["cells"]}
    errs = []
    for f in d["flows"]:
        for e in (f["from"], f["to"]):
            if e not in jobs | {"hub", "wallet"}:
                errs.append(f"flow {f['id']}: endpoint {e}")
        errs += [f"flow {f['id']}: stock {s}" for s in f["carries"] if s not in stocks]
    for j in jobs:
        errs += [f"missing cell {j}/{k}" for k in ("better", "cheaper", "faster") if (j, k) not in cells]
    for f in d["features"]:
        if f["dueBy"] and f["dueBy"] not in phases:
            errs.append(f"feature {f['id']}: dueBy {f['dueBy']}")
        errs += [f"feature {f['id']}: serves {s}" for s in f["serves"] if (s["job"], s["dimension"]) not in cells]
    for p in d["phases"]:
        errs += [f"phase {p['id']}: job {j}" for j in p["jobs"] if j not in jobs]
    if lib and os.path.isdir(lib):
        names = {f[:-3] for _, _, fs in os.walk(lib) for f in fs if f.endswith(".md")}
        for sec in ("stocks", "jobs", "phases", "flows"):
            for i in d[sec]:
                errs += [f"{sec} {i['id']}: card {c}" for c in i.get("cards", []) if c not in names]
    status = {}
    for f in d["features"]:
        if f["status"] == "proposed":
            continue
        for s in f["serves"]:
            k = (s["job"], s["dimension"])
            status[k] = "served" if s["coverage"] == "full" else status.get(k, "partial")
    print("errors:", errs or "none")
    for j in d["jobs"]:
        print(f"{j['id']:8}", "  ".join(f"{k}:{status.get((j['id'], k), 'open')}" for k in ("better", "cheaper", "faster")))
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/sorare/library")))

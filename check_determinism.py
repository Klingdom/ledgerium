import argparse
from pathlib import Path
import sys

def read(path: Path) -> str:
    return path.read_text(encoding='utf-8').replace('\r\n','\n')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--expected', required=True)
    ap.add_argument('--actual', required=True)
    args = ap.parse_args()

    expected = Path(args.expected)
    actual = Path(args.actual)

    files = ['process_graph.svg', 'sop.md']
    ok = True
    for fn in files:
        e = expected / fn
        a = actual / fn
        if not a.exists():
            print(f"MISSING: {a}")
            ok = False
            continue
        if read(e) != read(a):
            print(f"DIFF: {fn}")
            ok = False

    if not ok:
        sys.exit(1)

    print('OK: deterministic outputs match golden files')

if __name__ == '__main__':
    main()

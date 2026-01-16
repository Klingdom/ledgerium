import argparse
import json
from pathlib import Path
from jsonschema import Draft202012Validator

def load_schema(path: Path):
    return json.loads(path.read_text())

def validate_json(obj, schema):
    v = Draft202012Validator(schema)
    errors = sorted(v.iter_errors(obj), key=lambda e: e.path)
    if errors:
        msg = "\n".join([f"{list(e.path)}: {e.message}" for e in errors])
        raise SystemExit(msg)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--session', required=True)
    ap.add_argument('--events', required=True)
    ap.add_argument('--schemas', required=True)
    args = ap.parse_args()

    schemas = Path(args.schemas)
    session_schema = load_schema(schemas / 'session.schema.json')
    event_schema = load_schema(schemas / 'event.schema.json')

    session = json.loads(Path(args.session).read_text())
    validate_json(session, session_schema)

    # Validate NDJSON events
    events_path = Path(args.events)
    n = 0
    with events_path.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            validate_json(obj, event_schema)
            n += 1

    print(f"OK: session + {n} events validated")

if __name__ == '__main__':
    main()

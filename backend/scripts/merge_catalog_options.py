"""Preview a catalog plan, apply it atomically with a backup, or restore that backup.

Run from backend with: python -m scripts.merge_catalog_options --plan PATH
Add --apply --backup /safe/path/backup.json only after reviewing the preview.
To undo unchanged merged records: --restore /safe/path/backup.json --apply
"""

import argparse
import json
import os
from pathlib import Path

from app.catalog_merge import MergeGroup, apply_catalog_changes, prepare_catalog_merge
from app.database import SessionLocal


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--plan", type=Path)
    source.add_argument("--restore", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path)
    args = parser.parse_args()
    if args.apply and args.plan and not args.backup:
        parser.error("--backup is required when applying a plan")
    with SessionLocal() as database, database.begin():
        if args.restore:
            changes = json.loads(args.restore.read_text())["changes"]
        else:
            groups = [MergeGroup.model_validate(group) for group in json.loads(args.plan.read_text())]
            changes = prepare_catalog_merge(database, groups, lock=args.apply)
        if args.apply and changes:
            if args.plan:
                fd = os.open(args.backup, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
                with os.fdopen(fd, "w") as backup:
                    json.dump({"changes": changes}, backup, ensure_ascii=False, indent=2)
                    backup.flush()
                    os.fsync(backup.fileno())
            apply_catalog_changes(database, changes, restore=bool(args.restore))
        preview_key = "before" if args.restore else "after"
        preview = [{"id": change["id"], **{field: change[preview_key][field] for field in (
            "name", "price", "discount", "variants", "active",
        )}} for change in changes]
    print(json.dumps({"applied": args.apply, "products": preview}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

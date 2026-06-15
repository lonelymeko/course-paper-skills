#!/usr/bin/env python3
"""Create a course-paper submission folder and UTF-8 ZIP with school naming rules."""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path


def copy_required(src: Path, dest: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(src)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--class-name", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--docx", required=True, type=Path)
    parser.add_argument("--similarity-report", required=True, type=Path)
    parser.add_argument("--aigc-report", type=Path)
    parser.add_argument("--extra-report", action="append", default=[], type=Path)
    parser.add_argument("--course-zip-title", default="物联网期末论文")
    args = parser.parse_args()

    submit_dir = args.project / "提交包"
    base = f"{args.class_name}-{args.name}-{args.title}"
    files: list[Path] = []

    docx_dest = submit_dir / f"{base}.docx"
    copy_required(args.docx, docx_dest)
    files.append(docx_dest)

    sim_dest = submit_dir / f"{base}-查重报告.pdf"
    copy_required(args.similarity_report, sim_dest)
    files.append(sim_dest)

    if args.aigc_report:
        aigc_dest = submit_dir / f"{base}-AIGC报告.pdf"
        copy_required(args.aigc_report, aigc_dest)
        files.append(aigc_dest)

    for extra in args.extra_report:
        extra_dest = submit_dir / f"{base}-{extra.stem}.pdf"
        copy_required(extra, extra_dest)
        files.append(extra_dest)

    zip_path = args.project / f"{args.class_name}-{args.name}-{args.course_zip_title}.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(files):
            zf.write(file_path, file_path.name)

    print(f"submit_dir={submit_dir}")
    print(f"zip={zip_path}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


PLACEHOLDERS = {"", "待填写", "待填充", "未知", "unknown", "Unknown", "N/A", "na", "None", "未提供"}


FIELDS = [
    ("name", "姓名"),
    ("student_id", "学号"),
    ("school", "学校"),
    ("college", "学院"),
    ("class_name", "班级"),
    ("course", "课程名称"),
    ("instructor", "指导老师/任课老师"),
    ("title", "论文题目"),
    ("template", "学校论文模板路径"),
    ("requirements", "论文要求文件路径"),
    ("major", "专业"),
    ("deadline", "截止时间"),
]


REQUIRED_FIELDS = [
    "name",
    "student_id",
    "school",
    "college",
    "class_name",
    "course",
    "instructor",
    "title",
    "template",
]


PATH_FIELDS = ["template", "requirements"]


def is_placeholder(value: str) -> bool:
    return value.strip() in PLACEHOLDERS


def is_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def parse_args():
    parser = argparse.ArgumentParser(description="Write and validate a Chinese course-paper project brief.")
    parser.add_argument("--project", required=True, help="Project directory.")
    for key, label in FIELDS:
        parser.add_argument(f"--{key.replace('_', '-')}", default="", help=label)
    parser.add_argument("--allow-missing", action="store_true", help="Write the brief even if required fields are missing.")
    return parser.parse_args()


def main():
    args = parse_args()
    project = Path(args.project).expanduser().resolve()
    project.mkdir(parents=True, exist_ok=True)

    data = {key: getattr(args, key) for key, _ in FIELDS}
    missing = [key for key in REQUIRED_FIELDS if is_placeholder(data.get(key, ""))]
    if missing and not args.allow_missing:
        labels = [dict(FIELDS)[key] for key in missing]
        print("error: missing required paper metadata: " + "、".join(labels), file=sys.stderr)
        print("tip: collect these fields before final DOCX formatting and before PaperPass submission.", file=sys.stderr)
        sys.exit(2)

    bad_paths = []
    for key in PATH_FIELDS:
        value = data.get(key, "").strip()
        if not value or is_placeholder(value) or is_url(value):
            continue
        if not Path(value).expanduser().exists():
            bad_paths.append((key, value))
    if bad_paths and not args.allow_missing:
        labels = [f"{dict(FIELDS)[key]}={value}" for key, value in bad_paths]
        print("error: file path does not exist: " + "、".join(labels), file=sys.stderr)
        print("tip: provide the real school template / assignment requirement file, or pass --allow-missing only for a draft run.", file=sys.stderr)
        sys.exit(3)

    json_path = project / "project_brief.json"
    md_path = project / "project_brief.md"
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = ["# 课程论文项目信息", ""]
    for key, label in FIELDS:
        value = data.get(key) or "待填写"
        marker = "（必填）" if key in REQUIRED_FIELDS else "（可选）"
        lines.append(f"- {label}{marker}：`{value}`")
    lines += [
        "",
        "## 使用说明",
        "",
        "- 最终 DOCX 格式化前，应把必填信息写入封面、页眉或模板要求的位置。",
        "- PaperPass 等检测平台提交前，应使用真实姓名作为作者字段，避免官方报告显示占位作者。",
        "- 如果学校模板或论文要求文件缺失，先向用户索取；不要自行猜测学校格式。确实没有模板时，显式记录该风险。",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({
        "status": "written",
        "project": str(project),
        "json": str(json_path),
        "markdown": str(md_path),
        "missing": missing,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

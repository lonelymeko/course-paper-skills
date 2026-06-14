#!/usr/bin/env python3
import argparse
import hashlib
import json
import shutil
import sys
import zipfile
from datetime import datetime
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def recover_zip_name(name: str) -> str:
    try:
        return name.encode("cp437").decode("gbk")
    except UnicodeError:
        return name


def copy_if_exists(src: Path, dst: Path):
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        return dst
    return None


def extract_paperpass_pdfs(zip_path: Path, out_dir: Path, date_tag: str):
    outputs = {}
    if not zip_path.exists():
        return outputs

    with zipfile.ZipFile(zip_path) as archive:
        for info in archive.infolist():
            recovered = recover_zip_name(info.filename)
            if not recovered.lower().endswith(".pdf"):
                continue
            data = archive.read(info)
            if "AIGC" in recovered:
                target = out_dir / f"PaperPass_AIGC检测报告_{date_tag}.pdf"
                target.write_bytes(data)
                outputs["paperpass_aigc_pdf"] = target
            elif "查重报告" in recovered:
                target = out_dir / f"PaperPass_查重报告_{date_tag}.pdf"
                target.write_bytes(data)
                outputs["paperpass_similarity_pdf"] = target
    return outputs


def fmt(value, suffix=""):
    if value is None:
        return "未返回"
    return f"{value}{suffix}"


def build_summary(project: Path, date_tag: str, final_docx: Path, outputs: dict, paperpass_summary, xyz_summary):
    lines = [
        f"# 检测报告汇总 {date_tag}",
        "",
        "## 最终稿",
        "",
        f"- 文件：`{final_docx}`",
        f"- SHA256：`{sha256(final_docx)}`" if final_docx.exists() else "- SHA256：文件不存在",
        "",
    ]

    if paperpass_summary and paperpass_summary.get("report"):
        report = paperpass_summary["report"]
        lines += [
            "## PaperPass 官方检测",
            "",
            "- 平台：PaperPass",
            f"- 官方状态：`{report.get('Status')}`",
            f"- ReportID：`{report.get('ReportID')}`",
            f"- FileName：`{report.get('FileName')}`",
            f"- 上传时间：`{report.get('UploadTime')}`",
            f"- 查重相似度 Score：`{fmt(report.get('Score'), '%')}`",
            f"- AIGC AiScore：`{fmt(report.get('AiScore'), '%')}`",
            f"- AIGC 总占比 AiTotal：`{fmt(report.get('AiTotal'), '%')}`",
            f"- 正文字数 ContentLength：`{fmt(report.get('ContentLength'))}`",
        ]
        for label, key in [
            ("查重 PDF", "paperpass_similarity_pdf"),
            ("AIGC PDF", "paperpass_aigc_pdf"),
            ("官方离线 ZIP", "paperpass_zip"),
        ]:
            if outputs.get(key):
                lines.append(f"- {label}：`{outputs[key]}`")
        if paperpass_summary.get("downloaded", {}).get("path"):
            lines.append(f"- 原始下载文件：`{paperpass_summary['downloaded']['path']}`")
        lines.append("")

    if xyz_summary and xyz_summary.get("detectResult"):
        data = xyz_summary["detectResult"].get("data", {})
        result = data.get("result", {})
        lines += [
            "## XYZSCIENCE 官方 AIGC 检测",
            "",
            "- 平台：XYZ SCIENCE",
            f"- 官方状态：`{data.get('status')}`",
            f"- taskId：`{fmt(data.get('taskId'))}`",
            f"- reportId：`{fmt(result.get('reportId'))}`",
            f"- overallRate：`{fmt(result.get('overallRate'), '%')}`",
            f"- highCount：`{fmt(result.get('highCount'))}`",
            f"- suspectCount：`{fmt(result.get('suspectCount'))}`",
            f"- normalCount：`{fmt(result.get('normalCount'))}`",
            f"- totalDetected：`{fmt(result.get('totalDetected'))}`",
            f"- totalChars：`{fmt(result.get('totalChars'))}`",
            f"- aiChars：`{fmt(result.get('aiChars'))}`",
        ]
        if outputs.get("xyz_pdf"):
            lines.append(f"- PDF 报告：`{outputs['xyz_pdf']}`")
        lines.append("")

    lines += [
        "## 说明",
        "",
        "- 上述百分比、报告编号和状态均来自平台官方响应或官方报告文件。",
        "- PaperPass 处理中状态的 `Score=0` / `AiScore=0` 不能当作最终结果。",
        "- GitHub skills 仓库：`https://github.com/lonelymeko/course-paper-skills`",
        "",
    ]

    summary = project / f"检测报告汇总_{date_tag}.md"
    summary.write_text("\n".join(lines), encoding="utf-8")
    return summary


def build_artifact_index(project: Path, final_docx: Path, outputs: dict, summary: Path):
    lines = [
        "# Final Paper Artifacts",
        f"- Final DOCX: `{final_docx}`",
    ]
    if outputs.get("paperpass_similarity_pdf"):
        lines.append(f"- Similarity report: `{outputs['paperpass_similarity_pdf']}`")
    if outputs.get("paperpass_aigc_pdf"):
        lines.append(f"- AIGC report: `{outputs['paperpass_aigc_pdf']}`")
    if outputs.get("xyz_pdf"):
        lines.append(f"- Extra AIGC report: `{outputs['xyz_pdf']}`")
    if outputs.get("paperpass_zip"):
        lines.append(f"- Official PaperPass ZIP: `{outputs['paperpass_zip']}`")
    lines += [
        f"- Detection summary: `{summary}`",
        "",
        "Only report rates and report IDs from official saved responses.",
        "",
    ]
    index = project / "final_artifacts_summary.md"
    index.write_text("\n".join(lines), encoding="utf-8")
    return index


def main():
    parser = argparse.ArgumentParser(description="Package final DOCX and official detector reports into a delivery folder.")
    parser.add_argument("--project", required=True, help="Project/output directory.")
    parser.add_argument("--final-docx", required=True, help="Final manuscript DOCX.")
    parser.add_argument("--paperpass-run-dir", help="PaperPass run directory containing 32-paperpass-final-summary.json.")
    parser.add_argument("--xyzscience-run-dir", help="XYZSCIENCE run directory containing summary.json.")
    parser.add_argument("--date", default=datetime.now().strftime("%Y%m%d"), help="Date tag for output filenames.")
    args = parser.parse_args()

    project = Path(args.project).expanduser().resolve()
    final_docx = Path(args.final_docx).expanduser().resolve()
    project.mkdir(parents=True, exist_ok=True)

    outputs = {}
    paperpass_summary = None
    xyz_summary = None

    if args.paperpass_run_dir:
        paperpass_run = Path(args.paperpass_run_dir).expanduser().resolve()
        paperpass_summary = read_json(paperpass_run / "32-paperpass-final-summary.json")
        zip_src = None
        if paperpass_summary:
            downloaded = paperpass_summary.get("downloaded") or {}
            if downloaded.get("path"):
                zip_src = Path(downloaded["path"]).expanduser()
        zip_src = zip_src or (paperpass_run / "32-paperpass-official-report.zip")
        copied_zip = copy_if_exists(zip_src, project / f"PaperPass_官方离线报告_{args.date}.zip")
        if copied_zip:
            outputs["paperpass_zip"] = copied_zip
            outputs.update(extract_paperpass_pdfs(copied_zip, project, args.date))

    if args.xyzscience_run_dir:
        xyz_run = Path(args.xyzscience_run_dir).expanduser().resolve()
        xyz_summary = read_json(xyz_run / "summary.json")
        copied_xyz = copy_if_exists(
            xyz_run / "05-xyzscience-full-report.pdf",
            project / f"XYZSCIENCE_AIGC报告_{args.date}.pdf",
        )
        if copied_xyz:
            outputs["xyz_pdf"] = copied_xyz

    summary = build_summary(project, args.date, final_docx, outputs, paperpass_summary, xyz_summary)
    index = build_artifact_index(project, final_docx, outputs, summary)
    result = {
        "status": "written",
        "project": str(project),
        "summary": str(summary),
        "artifactIndex": str(index),
        "outputs": {key: str(value) for key, value in outputs.items()},
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)

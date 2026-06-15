#!/usr/bin/env python3
import copy
import shutil
import struct
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
}

for prefix, uri in NS.items():
    if prefix not in {"rel", "ct"}:
        ET.register_namespace(prefix, uri)


def qn(prefix, tag):
    return f"{{{NS[prefix]}}}{tag}"


def png_size(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    return struct.unpack(">II", data[16:24])


def paragraph_text(p):
    return "".join(t.text or "" for t in p.findall(".//w:t", NS)).strip()


def max_relationship_id(root):
    max_id = 0
    for rel in root.findall("rel:Relationship", NS):
        rid = rel.attrib.get("Id", "")
        if rid.startswith("rId") and rid[3:].isdigit():
            max_id = max(max_id, int(rid[3:]))
    return max_id


def add_png_default(content_types):
    for item in content_types.findall("ct:Default", NS):
        if item.attrib.get("Extension") == "png":
            return
    default = ET.Element(qn("ct", "Default"), {
        "Extension": "png",
        "ContentType": "image/png",
    })
    content_types.insert(0, default)


def make_text_run(text, bold=False, size="21"):
    run = ET.Element(qn("w", "r"))
    rpr = ET.SubElement(run, qn("w", "rPr"))
    ET.SubElement(rpr, qn("w", "rFonts"), {
        qn("w", "ascii"): "Times New Roman",
        qn("w", "hAnsi"): "Times New Roman",
        qn("w", "eastAsia"): "宋体",
    })
    if bold:
        ET.SubElement(rpr, qn("w", "b"))
    ET.SubElement(rpr, qn("w", "sz"), {qn("w", "val"): size})
    t = ET.SubElement(run, qn("w", "t"))
    t.text = text
    return run


def make_caption(text):
    p = ET.Element(qn("w", "p"))
    ppr = ET.SubElement(p, qn("w", "pPr"))
    ET.SubElement(ppr, qn("w", "spacing"), {
        qn("w", "before"): "0",
        qn("w", "after"): "120",
        qn("w", "line"): "360",
        qn("w", "lineRule"): "auto",
    })
    ET.SubElement(ppr, qn("w", "jc"), {qn("w", "val"): "center"})
    p.append(make_text_run(text, size="21"))
    return p


def make_intro(text):
    p = ET.Element(qn("w", "p"))
    ppr = ET.SubElement(p, qn("w", "pPr"))
    ET.SubElement(ppr, qn("w", "spacing"), {
        qn("w", "before"): "0",
        qn("w", "after"): "0",
        qn("w", "line"): "400",
        qn("w", "lineRule"): "exact",
    })
    ET.SubElement(ppr, qn("w", "ind"), {qn("w", "firstLine"): "480"})
    ET.SubElement(ppr, qn("w", "jc"), {qn("w", "val"): "both"})
    p.append(make_text_run(text, size="24"))
    return p


def make_image_paragraph(rid, image_name, cx, cy, docpr_id):
    p = ET.Element(qn("w", "p"))
    ppr = ET.SubElement(p, qn("w", "pPr"))
    ET.SubElement(ppr, qn("w", "spacing"), {
        qn("w", "before"): "120",
        qn("w", "after"): "60",
        qn("w", "line"): "360",
        qn("w", "lineRule"): "auto",
    })
    ET.SubElement(ppr, qn("w", "jc"), {qn("w", "val"): "center"})
    run = ET.SubElement(p, qn("w", "r"))
    drawing = ET.SubElement(run, qn("w", "drawing"))
    inline = ET.SubElement(drawing, qn("wp", "inline"), {"distT": "0", "distB": "0", "distL": "0", "distR": "0"})
    ET.SubElement(inline, qn("wp", "extent"), {"cx": str(cx), "cy": str(cy)})
    ET.SubElement(inline, qn("wp", "effectExtent"), {"l": "0", "t": "0", "r": "0", "b": "0"})
    ET.SubElement(inline, qn("wp", "docPr"), {"id": str(docpr_id), "name": image_name})
    ET.SubElement(inline, qn("wp", "cNvGraphicFramePr"))
    graphic = ET.SubElement(inline, qn("a", "graphic"))
    graphic_data = ET.SubElement(graphic, qn("a", "graphicData"), {"uri": NS["pic"]})
    pic = ET.SubElement(graphic_data, qn("pic", "pic"))
    nv_pic_pr = ET.SubElement(pic, qn("pic", "nvPicPr"))
    ET.SubElement(nv_pic_pr, qn("pic", "cNvPr"), {"id": "0", "name": image_name})
    ET.SubElement(nv_pic_pr, qn("pic", "cNvPicPr"))
    blip_fill = ET.SubElement(pic, qn("pic", "blipFill"))
    ET.SubElement(blip_fill, qn("a", "blip"), {qn("r", "embed"): rid})
    stretch = ET.SubElement(blip_fill, qn("a", "stretch"))
    ET.SubElement(stretch, qn("a", "fillRect"))
    sp_pr = ET.SubElement(pic, qn("pic", "spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a", "xfrm"))
    ET.SubElement(xfrm, qn("a", "off"), {"x": "0", "y": "0"})
    ET.SubElement(xfrm, qn("a", "ext"), {"cx": str(cx), "cy": str(cy)})
    prst = ET.SubElement(sp_pr, qn("a", "prstGeom"), {"prst": "rect"})
    ET.SubElement(prst, qn("a", "avLst"))
    return p


def insert_after(body, anchor_text, new_elements):
    children = list(body)
    for index, child in enumerate(children):
        if child.tag == qn("w", "p") and anchor_text in paragraph_text(child):
            insert_at = index + 1
            for element in reversed(new_elements):
                body.insert(insert_at, element)
            return
    raise ValueError(f"anchor not found: {anchor_text}")


def patch_docx(input_docx, output_docx, figure_paths):
    temp_dir = Path(output_docx).with_suffix("")
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True)
    with zipfile.ZipFile(input_docx) as zin:
        zin.extractall(temp_dir)

    media_dir = temp_dir / "word" / "media"
    media_dir.mkdir(exist_ok=True)

    rel_path = temp_dir / "word" / "_rels" / "document.xml.rels"
    rels = ET.parse(rel_path)
    rel_root = rels.getroot()
    next_rid = max_relationship_id(rel_root) + 1

    content_types_path = temp_dir / "[Content_Types].xml"
    content_types = ET.parse(content_types_path)
    add_png_default(content_types.getroot())

    image_meta = []
    for idx, figure_path in enumerate(figure_paths, start=1):
        target_name = f"self_drawn_figure_{idx}.png"
        shutil.copy2(figure_path, media_dir / target_name)
        rid = f"rId{next_rid}"
        next_rid += 1
        ET.SubElement(rel_root, qn("rel", "Relationship"), {
            "Id": rid,
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            "Target": f"media/{target_name}",
        })
        width, height = png_size(figure_path)
        image_meta.append((rid, target_name, width, height))

    rels.write(rel_path, encoding="UTF-8", xml_declaration=True)
    content_types.write(content_types_path, encoding="UTF-8", xml_declaration=True)

    doc_path = temp_dir / "word" / "document.xml"
    doc_tree = ET.parse(doc_path)
    root = doc_tree.getroot()
    body = root.find("w:body", NS)

    max_width_emu = 5_750_000
    figure1 = image_meta[0]
    cy1 = int(max_width_emu * figure1[3] / figure1[2])
    figure2 = image_meta[1]
    cy2 = int(max_width_emu * figure2[3] / figure2[2])

    insert_after(body, "表1给出系统主要模块及职责。", [
        make_intro("本文自绘的系统四层架构如图1所示，图中强调边缘控制器在灌溉闭环中的保护作用。"),
        make_image_paragraph(figure1[0], "图1 自绘系统四层架构图", max_width_emu, cy1, 101),
        make_caption("图1 温室智能灌溉系统四层架构图（自绘）"),
    ])

    insert_after(body, "若自动策略与手动操作冲突", [
        make_intro("监测流和控制流的关系如图2所示，平台负责规则判断和记录，边缘控制器负责最后的动作校验。"),
        make_image_paragraph(figure2[0], "图2 自绘数据流与控制流程图", max_width_emu, cy2, 102),
        make_caption("图2 数据流与灌溉控制闭环流程图（自绘）"),
    ])

    doc_tree.write(doc_path, encoding="UTF-8", xml_declaration=True)

    with zipfile.ZipFile(output_docx, "w", zipfile.ZIP_DEFLATED) as zout:
        for file in temp_dir.rglob("*"):
            if file.is_file():
                zout.write(file, file.relative_to(temp_dir).as_posix())
    shutil.rmtree(temp_dir)


def main():
    base = Path("/Users/xixiu/Desktop/作业/物联网")
    input_docx = base / "物联网导论课程论文_二稿_格式化.docx"
    output_docx = base / "物联网导论课程论文_三稿_含自绘插图.docx"
    figures = [
        base / "self_drawn_figures" / "fig1-system-architecture.png",
        base / "self_drawn_figures" / "fig2-data-control-flow.png",
    ]
    patch_docx(input_docx, output_docx, figures)
    print(output_docx)


if __name__ == "__main__":
    main()

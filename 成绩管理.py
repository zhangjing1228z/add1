#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
班级成绩管理表（命令行版）
==========================

功能：
  1. 录入 / 修改学生基本信息与各科成绩
  2. 删除学生记录
  3. 查询单个学生成绩详情
  4. 按科目排名、按总分排名
  5. 统计分析：平均分、最高分、最低分、及格率、优秀率
  6. 数据持久化到 JSON 文件（data.json），可一键导出 Excel（成绩表.xlsx）

使用方法：
  python3 成绩管理.py            # 交互式菜单
  python3 成绩管理.py demo       # 自动生成演示数据并打印成绩单

依赖：标准库即可运行；导出 Excel 需要 openpyxl（可选）。
"""

import json
import os
import sys
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")
SUBJECTS = ["语文", "数学", "英语"]  # 可按需增删科目


# ---------------------------- 数据结构 ----------------------------

def load_data():
    """从 JSON 文件读取数据，返回 {学号: 学生字典}"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                raw = json.load(f)
            return {sid: normalize_student(s) for sid, s in raw.items()}
        except (json.JSONDecodeError, OSError):
            print("⚠ 数据文件损坏，已重新开始。")
    return {}


def save_data(students):
    """把数据写回 JSON 文件"""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(students, f, ensure_ascii=False, indent=2)
    print(f"✔ 数据已保存到 {DATA_FILE}")


def normalize_student(s):
    """兼容旧数据：补全缺失字段"""
    s.setdefault("姓名", "")
    s.setdefault("性别", "")
    scores = s.setdefault("成绩", {})
    for sub in SUBJECTS:
        scores.setdefault(sub, None)
    return s


# ---------------------------- 工具函数 ----------------------------

def total_of(student):
    vals = [v for v in student["成绩"].values() if v is not None]
    return sum(vals) if vals else None


def avg_of(student):
    vals = [v for v in student["成绩"].values() if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


def parse_score(text):
    """把字符串解析为 0~100 的分数，非法返回 None"""
    try:
        score = float(text)
    except ValueError:
        return None
    return score if 0 <= score <= 100 else None


def ask_score(prompt):
    """反复提示直到输入合法分数（或回车表示不录入）"""
    while True:
        text = input(prompt).strip()
        if text == "":
            return None
        score = parse_score(text)
        if score is not None:
            return score
        print("✖ 分数必须是 0~100 之间的数字，请重新输入。")


def fmt(v, width=8):
    s = "-" if v is None else str(v)
    # 中文字符占两列，简单对齐处理
    pad = width - sum(2 if ord(c) > 127 else 1 for c in s)
    return s + " " * max(pad, 1)


# ---------------------------- 表格打印 ----------------------------

def print_table(students, title="班级成绩总表"):
    print("\n" + "=" * 72)
    print(f"  {title}    （共 {len(students)} 人，生成时间：{datetime.now():%Y-%m-%d %H:%M}）")
    print("=" * 72)
    header = fmt("学号", 14) + fmt("姓名", 10) + "".join(fmt(s, 8) for s in SUBJECTS) \
             + fmt("总分", 8) + fmt("平均分", 8) + fmt("名次", 6)
    print(header)
    print("-" * 72)

    ranked = sorted(
        students.values(),
        key=lambda x: (total_of(x) is None, -(total_of(x) or 0)),
    )
    rank = {id(x): i + 1 for i, x in enumerate(ranked)}

    for sid in sorted(students.keys()):
        s = students[sid]
        row = fmt(sid, 14) + fmt(s["姓名"], 10)
        row += "".join(fmt(s["成绩"].get(sub), 8) for sub in SUBJECTS)
        row += fmt(total_of(s), 8) + fmt(avg_of(s), 8) + fmt(rank[id(s)], 6)
        print(row)
    print("=" * 72)


def print_stats(students):
    """统计每门科目的平均分/最高/最低/及格率/优秀率"""
    print("\n" + "=" * 72)
    print("  各科统计分析")
    print("=" * 72)
    print(fmt("科目", 10) + fmt("人数", 6) + fmt("平均分", 8) + fmt("最高分", 8)
          + fmt("最低分", 8) + fmt("及格率", 8) + fmt("优秀率", 8))
    print("-" * 72)
    for sub in SUBJECTS:
        vals = [s["成绩"][sub] for s in students.values() if s["成绩"].get(sub) is not None]
        if not vals:
            continue
        n = len(vals)
        pass_rate = f"{sum(1 for v in vals if v >= 60) / n:.1%}"
        excel_rate = f"{sum(1 for v in vals if v >= 90) / n:.1%}"
        print(fmt(sub, 10) + fmt(n, 6) + fmt(round(sum(vals) / n, 2), 8)
              + fmt(max(vals), 8) + fmt(min(vals), 8) + fmt(pass_rate, 8) + fmt(excel_rate, 8))
    print("=" * 72)


# ---------------------------- 业务操作 ----------------------------

def add_or_update(students):
    sid = input("请输入学号（如 20250101）：").strip()
    if not sid:
        print("✖ 学号不能为空。")
        return
    existed = sid in students
    s = students.get(sid, {"姓名": "", "性别": "", "成绩": {}})

    name = input(f"姓名[{s['姓名'] or '未填写'}]：").strip() or s["姓名"]
    gender = input(f"性别[{s['性别'] or '未填写'}]：").strip() or s["性别"]
    scores = {}
    for sub in SUBJECTS:
        old = s["成绩"].get(sub)
        tip = f"[上次：{old}，回车保持不变]" if existed and old is not None else "[回车表示不录入]"
        text = input(f"{sub}成绩{tip}：").strip()
        if text == "":
            # 回车：已有记录保持原值，新记录则留空
            scores[sub] = old if existed else None
        else:
            score = parse_score(text)
            if score is None:
                print(f"✖ {sub}成绩无效（须为 0~100 的数字），请重新录入该生信息。")
                return
            scores[sub] = score

    students[sid] = normalize_student({"姓名": name, "性别": gender, "成绩": scores})
    save_data(students)
    print(f"✔ 已{'更新' if existed else '添加'}学生：{sid} {name}")


def delete_student(students):
    sid = input("请输入要删除的学号：").strip()
    if sid in students:
        name = students.pop(sid)["姓名"]
        save_data(students)
        print(f"✔ 已删除 {sid} {name}")
    else:
        print("✖ 未找到该学号。")


def query_student(students):
    key = input("请输入学号或姓名进行查询：").strip()
    found = []
    for sid, s in students.items():
        if sid == key or s["姓名"] == key:
            found.append((sid, s))
    if not found:
        print("✖ 未找到匹配的学生。")
        return
    for sid, s in found:
        print(f"\n【{s['姓名']}】 学号：{sid}  性别：{s['性别'] or '-'}")
        for sub in SUBJECTS:
            print(f"   {sub}：{s['成绩'].get(sub, '-')}")
        print(f"   总分：{total_of(s)}   平均分：{avg_of(s)}")


def rank_by_subject(students):
    sub = input(f"按哪科排名 {'/'.join(SUBJECTS)} ：").strip()
    if sub not in SUBJECTS:
        print("✖ 科目不存在。")
        return
    lst = [(sid, s) for sid, s in students.items() if s["成绩"].get(sub) is not None]
    lst.sort(key=lambda x: -x[1]["成绩"][sub])
    print(f"\n—— {sub} 单科排名 ——")
    for i, (sid, s) in enumerate(lst, 1):
        print(f"{i:>3}. {fmt(sid, 14)}{fmt(s['姓名'], 10)}{s['成绩'][sub]}")


def export_excel(students):
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        print("✖ 未安装 openpyxl，无法导出 Excel。可执行：pip install openpyxl")
        return
    wb = Workbook()
    ws = wb.active
    ws.title = "班级成绩表"

    headers = ["学号", "姓名", "性别"] + SUBJECTS + ["总分", "平均分", "名次"]
    ws.append(headers)
    fill = PatternFill("solid", fgColor="4F81BD")
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = fill
        c.alignment = Alignment(horizontal="center")

    ranked = sorted(students.values(), key=lambda x: -(total_of(x) or 0))
    rank_map = {id(x): i + 1 for i, x in enumerate(ranked)}

    for sid in sorted(students):
        s = students[sid]
        ws.append([sid, s["姓名"], s["性别"]]
                  + [s["成绩"].get(sub) for sub in SUBJECTS]
                  + [total_of(s), avg_of(s), rank_map[id(s)]])

    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = 12

    path = os.path.join(os.path.dirname(DATA_FILE), "成绩表.xlsx")
    wb.save(path)
    print(f"✔ 已导出 Excel：{path}")


def make_demo_data():
    demo = {
        "20250101": {"姓名": "张伟",  "性别": "男", "成绩": {"语文": 88, "数学": 95, "英语": 82}},
        "20250102": {"姓名": "李娜",  "性别": "女", "成绩": {"语文": 92, "数学": 78, "英语": 96}},
        "20250103": {"姓名": "王强",  "性别": "男", "成绩": {"语文": 65, "数学": 59, "英语": 70}},
        "20250104": {"姓名": "刘洋",  "性别": "男", "成绩": {"语文": 78, "数学": 88, "英语": 75}},
        "20250105": {"姓名": "陈静",  "性别": "女", "成绩": {"语文": 95, "数学": 92, "英语": 90}},
        "20250106": {"姓名": "杨帆",  "性别": "男", "成绩": {"语文": 55, "数学": 61, "英语": 48}},
    }
    return {k: normalize_student(v) for k, v in demo.items()}


# ---------------------------- 主菜单 ----------------------------

MENU = """
┌──────────── 班级成绩管理系统 ────────────┐
│  1. 录入 / 修改学生成绩                  │
│  2. 删除学生                             │
│  3. 查询学生                             │
│  4. 显示成绩总表（含总分/平均分/名次）    │
│  5. 单科排名                             │
│  6. 统计分析（平均分/及格率/优秀率）      │
│  7. 导出 Excel 成绩表                    │
│  8. 载入演示数据                         │
│  0. 退出                                 │
└──────────────────────────────────────────┘
"""


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        students = make_demo_data()
        print_table(students, "班级成绩总表（演示数据）")
        print_stats(students)
        return

    students = load_data()
    print(f"已加载 {len(students)} 条学生记录。")
    while True:
        print(MENU)
        choice = input("请选择操作：").strip()
        if choice == "1":
            add_or_update(students)
        elif choice == "2":
            delete_student(students)
        elif choice == "3":
            query_student(students)
        elif choice == "4":
            print_table(students)
        elif choice == "5":
            rank_by_subject(students)
        elif choice == "6":
            print_stats(students)
        elif choice == "7":
            export_excel(students)
        elif choice == "8":
            students.update(make_demo_data())
            save_data(students)
        elif choice == "0":
            save_data(students)
            print("再见！")
            break
        else:
            print("✖ 无效选择，请重新输入。")


if __name__ == "__main__":
    main()

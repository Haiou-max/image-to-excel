import { NextRequest, NextResponse } from "next/server";
import { generateExcel, ExcelRow } from "@/lib/excel";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body as { rows: ExcelRow[] };

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "没有数据" }, { status: 400 });
    }

    const buffer = await generateExcel(rows);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product_list.xlsx"',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "生成失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

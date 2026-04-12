import ExcelJS from "exceljs";

export interface ExcelRow {
  货号: string;
  内装: string;
  单价: string;
  尺寸: string;
  imageBase64?: string;
  imageMediaType?: string;
}

export async function generateExcel(rows: ExcelRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("数据");

  // Column definitions
  const columns = [
    { header: "图片", key: "图片", width: 55 },
    { header: "货号", key: "货号", width: 15 },
    { header: "内装", key: "内装", width: 15 },
    { header: "单价", key: "单价", width: 15 },
    { header: "尺寸", key: "尺寸", width: 18 },
  ];
  sheet.columns = columns;

  // Header style
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const excelRow = sheet.getRow(rowNum);
    excelRow.height = 190;

    // Image embedding
    if (row.imageBase64) {
      const ext = row.imageMediaType?.includes("png") ? "png" : "jpeg";
      const imageId = workbook.addImage({
        base64: row.imageBase64,
        extension: ext,
      });
      sheet.addImage(imageId, {
        tl: { col: 0, row: rowNum - 1 },
        ext: { width: 320, height: 240 },
      });
    }

    // Data cells
    excelRow.getCell("B").value = row.货号;
    excelRow.getCell("C").value = row.内装;
    excelRow.getCell("D").value = row.单价;
    excelRow.getCell("E").value = row.尺寸;

    // Style data cells
    ["A", "B", "C", "D", "E"].forEach((col) => {
      const cell = excelRow.getCell(col);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

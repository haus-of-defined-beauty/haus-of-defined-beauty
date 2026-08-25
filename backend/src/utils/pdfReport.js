const PDFDocument = require('pdfkit');

// Renders a simple label/value report as a PDF and streams it straight to
// the response. `rows` is [{ label, value }, ...].
function renderReportPdf(res, filename, title, rows) {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(18).text('Haus of Defined Beauty', { align: 'center' });
  doc.fontSize(12).fillColor('#888').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#aaa').text(`Generated ${new Date().toLocaleString('en-ZA')}`, { align: 'center' });
  doc.moveDown(2);

  doc.fillColor('#000');
  rows.forEach(({ label, value }) => {
    doc.fontSize(11)
      .text(label, doc.page.margins.left, doc.y, { continued: true, width: 300 })
      .text(String(value), { align: 'right' });
    doc.moveDown(0.5);
  });

  if (!rows.length) {
    doc.fontSize(11).fillColor('#888').text('No data available for this report.');
  }

  doc.end();
}

module.exports = renderReportPdf;

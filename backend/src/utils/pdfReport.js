const PDFDocument = require('pdfkit');

// Renders a label/value report as a PDF and streams it straight to the
// response. `input` is either a flat [{ label, value }, ...] (legacy,
// wrapped as one unnamed section) or a list of sections
// [{ heading, rows: [{ label, value }] }, ...] for reports that now break
// down into several charts (e.g. Peak Booking Times' time-slot, day, and
// weekday views).
function renderReportPdf(res, filename, title, input) {
  const sections = Array.isArray(input) && input.length && input[0] && Array.isArray(input[0].rows)
    ? input
    : [{ heading: null, rows: input }];

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(18).text('Haus of Defined Beauty', { align: 'center' });
  doc.fontSize(12).fillColor('#888').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#aaa').text(`Generated ${new Date().toLocaleString('en-ZA')}`, { align: 'center' });
  doc.moveDown(2);

  const hasAnyRows = sections.some(s => s.rows && s.rows.length);
  if (!hasAnyRows) {
    doc.fontSize(11).fillColor('#888').text('No data available for this report.');
  }

  sections.forEach(({ heading, rows }) => {
    if (!rows || !rows.length) return;
    if (heading) {
      doc.fontSize(13).fillColor('#1c1c1c').text(heading);
      doc.moveDown(0.4);
    }
    doc.fillColor('#000');
    rows.forEach(({ label, value }) => {
      doc.fontSize(11)
        .text(label, doc.page.margins.left, doc.y, { continued: true, width: 300 })
        .text(String(value), { align: 'right' });
      doc.moveDown(0.5);
    });
    doc.moveDown(1);
  });

  doc.end();
}

module.exports = renderReportPdf;

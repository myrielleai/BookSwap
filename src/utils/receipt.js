// Builds and downloads a PDF receipt for a completed exchange.
// jsPDF is loaded only when a receipt is requested, so it stays out of the main bundle.
// The built-in PDF font has no arrows or en dashes, so the text sticks to plain ASCII.

const CARAMEL = [149, 101, 54];
const MOSS = [59, 93, 54];
const INK = [56, 32, 17];
const MUTED = [122, 80, 43];
const PARCHMENT = [250, 245, 236];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });
};

const hhmm = (time) => (time ? String(time).slice(0, 5) : '');

export const receiptNumber = (tx) => `BSX-${String(tx.id).padStart(6, '0')}`;

export const downloadReceipt = async (tx) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Parchment page with a stitched border
  doc.setFillColor(...PARCHMENT);
  doc.rect(0, 0, width, height, 'F');
  doc.setDrawColor(...CARAMEL);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([1.6, 1.2], 0);
  doc.roundedRect(5, 5, width - 10, height - 10, 3, 3, 'S');
  doc.setLineDashPattern([], 0);

  // Header: the two-books mark, wordmark, and receipt title
  doc.setFillColor(...CARAMEL);
  doc.roundedRect(margin, 13, 7, 11, 1, 1, 'F');
  doc.setFillColor(...MOSS);
  doc.roundedRect(margin + 8.5, 13, 7, 11, 1, 1, 'F');
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BookSwap', margin + 19, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Peer-to-peer book exchange', margin + 19, 24.5);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EXCHANGE RECEIPT', width - margin, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(receiptNumber(tx), width - margin, 23, { align: 'right' });

  // Completed stamp
  let y = 34;
  doc.setFillColor(226, 236, 221);
  doc.setDrawColor(...MOSS);
  doc.roundedRect(margin, y, width - margin * 2, 12, 2, 2, 'FD');
  doc.setTextColor(...MOSS);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EXCHANGE COMPLETED', margin + 4, y + 5.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(formatDateTime(tx.completed_at), margin + 4, y + 9.6);

  // Detail rows
  const row = (label, value) => {
    const lines = doc.splitTextToSize(String(value || '-'), width - margin * 2 - 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(lines, margin + 38, y);
    y += 5.2 * lines.length + 1.8;
  };
  const section = (title) => {
    y += 2;
    doc.setDrawColor(...CARAMEL);
    doc.setLineWidth(0.2);
    doc.line(margin, y, width - margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...CARAMEL);
    doc.text(title, margin, y);
    y += 6;
  };

  y = 54;
  row('Transaction', `#${tx.id}${tx.exchange_request_id ? ` (request #${tx.exchange_request_id})` : ''}`);

  section('Books exchanged');
  row('Book given by owner', `"${tx.target_title}"`);
  row('Owner', tx.owner_name);
  row('Book given in return', `"${tx.offered_title}"`);
  row('Requester', tx.requester_name);

  section('Handover');
  row('Date and time', tx.slot_date ? `${tx.slot_date}, ${hhmm(tx.start_time)} to ${hhmm(tx.end_time)}` : '-');
  row('Venue', [tx.location_name, tx.location_city].filter(Boolean).join(', ') || '-');
  row('Receipt confirmed', 'Owner and requester both confirmed receiving their books');
  row('Recorded by', tx.handler_name ? `Moderator ${tx.handler_name}` : 'BookSwap moderator');

  // Footer
  doc.setDrawColor(...CARAMEL);
  doc.line(margin, height - 24, width - margin, height - 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    doc.splitTextToSize(
      'This receipt confirms a supervised BookSwap exchange. Both listings were archived and both members\' completed-exchange counts were updated.',
      width - margin * 2
    ),
    margin,
    height - 19
  );
  doc.text(`Generated ${formatDateTime(new Date().toISOString())}`, margin, height - 10);
  doc.text('bookswap-eta.vercel.app', width - margin, height - 10, { align: 'right' });

  doc.save(`BookSwap-Receipt-${receiptNumber(tx)}.pdf`);
};

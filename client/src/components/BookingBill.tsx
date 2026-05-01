import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import { fmtINR, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface BookingBillProps {
  booking: {
    booking_id?: string;
    customer_name?: string;
    phone?: string;
    address?: string;
    booking_date?: string;
    items?: any[];
    pricing?: {
      subtotal?: number;
      deliveryCharge?: number;
      discount?: number;
      totalAmount?: number;
    };
  };
  onClose?: () => void;
}

export const BookingBill: React.FC<BookingBillProps> = ({ booking, onClose }) => {
  const billRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = billRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${booking.booking_id || 'Booking'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;700&display=swap');
            body { font-family: 'Noto Sans Kannada', sans-serif; padding: 20px; }
            .bill-container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            .header { text-align: center; position: relative; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .deity-img { position: absolute; left: 0; top: 0; width: 60px; height: 60px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 10px; }
            .phones { position: absolute; right: 0; top: 0; text-align: right; font-size: 12px; font-weight: bold; }
            .biz-name { font-size: 28px; font-weight: bold; margin: 10px 0; }
            .biz-desc { font-size: 12px; }
            .info-row { display: flex; justify-content: space-between; margin: 15px 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .footer { display: flex; justify-content: space-between; margin-top: 50px; font-weight: bold; }
            .total-row { font-weight: bold; font-size: 18px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              .bill-container { border: none; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    const content = billRef.current;
    if (!content) return;

    try {
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bill-${booking.booking_id || 'booking'}.pdf`);
      toast.success("PDF Downloaded");
    } catch (error) {
      console.error("PDF generation failed", error);
      toast.error("Failed to generate PDF");
    }
  };

  const items = booking.items || [];
  // Ensure at least 10 rows for layout consistency as requested
  const displayItems = [...items];
  while (displayItems.length < 10) {
    displayItems.push({ name: "", quantity: "", price: "" });
  }

  return (
    <div className="flex flex-col h-full bg-white text-black font-kannada p-4 md:p-8">
      {/* Controls */}
      <div className="flex justify-between items-center mb-6 no-print bg-muted/30 p-2 rounded-lg">
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> Print Bill
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Bill Content */}
      <div ref={billRef} className="bill-container border-2 border-black p-6 bg-white shadow-lg mx-auto w-full max-w-[800px]">
        {/* Header */}
        <div className="header relative border-b-2 border-black pb-4 text-center">
          <div className="deity-img absolute left-0 top-0 w-16 h-16 border border-black flex items-center justify-center bg-gray-100 text-[8px]">
             {/* Small Square for Deity image */}
             <img src="/placeholder-deity.png" alt="Deity" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://api.iconify.design/mdi:om.svg')} />
          </div>
          
          <div className="phones absolute right-0 top-0 text-right text-xs">
            <div>9590374559</div>
            <div>7019901151</div>
            <div>9845684474</div>
          </div>

          <div className="text-sm font-bold mt-2">|| ಶ್ರೀ ಜಗದಂಬಾ ಪ್ರಸನ್ನ ||</div>
          <div className="text-4xl font-black my-2">ಶಿವಶಕ್ತಿ ಶಾಮಿಯಾನ</div>
          <div className="text-[10px] leading-tight max-w-[500px] mx-auto">
            ಮದುವೆ, ಮುಂಜಿ, ಗೃಹಪ್ರವೇಶ ಮತ್ತು ಎಲ್ಲಾ ತರಹದ ಶುಭ ಸಮಾರಂಭಗಳಿಗೆ 
            ಶಾಮಿಯಾನ, ಕುರ್ಚಿ, ಟೇಬಲ್ ಹಾಗೂ ಅಡುಗೆ ಪಾತ್ರೆಗಳು ಬಾಡಿಗೆಗೆ ದೊರೆಯುತ್ತವೆ.
          </div>
        </div>

        {/* Info Row */}
        <div className="grid grid-cols-3 border-b border-black py-2 mt-4 font-bold text-sm">
          <div>ಬಿಲ್ ಸಂಖ್ಯೆ (Bill No): <span className="font-mono">{booking.booking_id || "____"}</span></div>
          <div className="text-center">ದಿನಾಂಕ (Date): <span>{fmtDate(booking.booking_date) || "____/____/____"}</span></div>
          <div className="text-right">ಶ್ರೀಮತಿ/ಶ್ರೀ: <span className="underline decoration-dotted">{booking.customer_name || "__________________"}</span></div>
        </div>

        {/* Table */}
        <table className="w-full mt-4 border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-center w-12">ಕ್ರಮ ಸಂಖ್ಯೆ</th>
              <th className="border border-black px-2 py-1 text-left">ಸಾಮಗ್ರಿಗಳ ವಿವರ</th>
              <th className="border border-black px-2 py-1 text-center w-20">ಸಂಖ್ಯೆ</th>
              <th className="border border-black px-2 py-1 text-right w-32">ದರ</th>
            </tr>
            <tr className="bg-gray-50 text-[10px] text-muted-foreground uppercase tracking-tighter">
              <th className="border border-black text-center">SL. NO.</th>
              <th className="border border-black text-left pl-2">ITEM DESCRIPTION</th>
              <th className="border border-black text-center">QTY</th>
              <th className="border border-black text-right pr-2">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((it, idx) => (
              <tr key={idx} className="h-8">
                <td className="border border-black text-center px-2">{idx + 1}</td>
                <td className="border border-black px-2">{it.name}</td>
                <td className="border border-black text-center px-2">{it.quantity}</td>
                <td className="border border-black text-right px-2">{it.price ? fmtINR(it.price) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {booking.pricing?.deliveryCharge && Number(booking.pricing.deliveryCharge) > 0 && (
              <>
                <tr className="font-bold text-sm">
                  <td colSpan={3} className="border border-black text-right px-4 py-1 uppercase tracking-tight opacity-70">ಉಪಮೊತ್ತ (Subtotal)</td>
                  <td className="border border-black text-right px-2 py-1">{fmtINR(booking.pricing?.subtotal || 0)}</td>
                </tr>
                <tr className="font-bold text-sm">
                  <td colSpan={3} className="border border-black text-right px-4 py-1 uppercase tracking-tight opacity-70">ಡೆಲಿವರಿ ಶುಲ್ಕ (Delivery Charge)</td>
                  <td className="border border-black text-right px-2 py-1">{fmtINR(booking.pricing.deliveryCharge)}</td>
                </tr>
              </>
            )}
            <tr className="font-bold text-lg">
              <td colSpan={3} className="border border-black text-right px-4 py-2 uppercase tracking-widest">ಒಟ್ಟು ಮೊತ್ತ (Total Amount)</td>
              <td className="border border-black text-right px-2 py-2">{fmtINR(booking.pricing?.totalAmount || 0)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="flex justify-between mt-16 px-4">
          <div className="text-center">
            <div className="w-32 border-b border-black mb-1"></div>
            <div className="text-xs font-bold uppercase tracking-widest">ಗ್ರಾಹಕರ ಸಹಿ<br/>(Customer Signature)</div>
          </div>
          <div className="text-center">
            <div className="w-32 border-b border-black mb-1"></div>
            <div className="text-xs font-bold uppercase tracking-widest">ಹಸ್ತಾಕ್ಷರ<br/>(Owner Signature)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

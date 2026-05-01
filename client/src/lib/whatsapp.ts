import { fmtINR, fmtDate } from "@/lib/format";

const cleanPhone = (raw?: string) => {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // Default to India country code if a 10-digit number is entered.
  if (digits.length === 10) return "91" + digits;
  return digits;
};

const open = (phone: string, text: string) => {
  const url = `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export const sendWhatsappConfirmation = (b: any, businessName?: string) => {
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Your booking is *CONFIRMED* with ${businessName || "ShivaShakti Shamiyana Studio"}.`,
    "",
    `📋 Booking ID: ${b.booking_id}`,
    `📅 Event: ${fmtDate(b.booking_date || b.start_date)}`,
    `💰 Total: ${fmtINR(b.pricing?.totalAmount || 0)}`,
    `✅ Paid: ${fmtINR(b.total_paid || b.pricing?.advance || 0)}`,
    `🧾 Balance: ${fmtINR(b.remaining_amount || 0)}`,
    "",
    "Thank you for choosing us!",
  ];
  open(b.phone, lines.join("\n"));
};

export const sendWhatsappDelivered = (b: any, businessName?: string) => {
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Your items for Booking *${b.booking_id}* have been *DELIVERED* successfully.`,
    "",
    "Please check all items and let us know if everything is in order.",
    `🧾 Pending Balance: ${fmtINR(b.remaining_amount || 0)}`,
    "",
    `Thank you,`,
    `${businessName || "ShivaShakti Shamiyana Studio"}`
  ];
  open(b.phone, lines.join("\n"));
};

export const sendWhatsappCompletion = (b: any, businessName?: string) => {
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Your order *${b.booking_id}* is now *COMPLETED*.`,
    "",
    "Thank you for your business! We hope to serve you again soon.",
    "",
    `Best regards,`,
    `${businessName || "ShivaShakti Shamiyana Studio"}`
  ];
  open(b.phone, lines.join("\n"));
};

export const sendWhatsappPendingItems = (b: any, missingItems: any[], businessName?: string) => {
  const itemList = missingItems.map(i => `• ${i.itemName} (Qty: ${i.missingQty || 1})`).join("\n");
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Items return update for Booking *${b.booking_id}*.`,
    "",
    `⚠️ *PENDING ITEMS LIST:*`,
    itemList,
    "",
    `Please return these items at your earliest convenience.`,
    "",
    `${businessName || "ShivaShakti Shamiyana Studio"}`
  ];
  open(b.phone, lines.join("\n"));
};

export const sendWhatsappPendingAmount = (b: any, businessName?: string) => {
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Payment reminder for Booking *${b.booking_id}*.`,
    "",
    `🧾 *PENDING BALANCE: ${fmtINR(b.remaining_amount || 0)}*`,
    "",
    "Kindly clear the balance at your earliest convenience.",
    "",
    `${businessName || "ShivaShakti Shamiyana Studio"}`
  ];
  open(b.phone, lines.join("\n"));
};

export const sendWhatsappPendingAll = (b: any, missingItems: any[], businessName?: string) => {
  const itemList = missingItems.map(i => `• ${i.itemName} (Qty: ${i.missingQty || 1})`).join("\n");
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Update for Booking *${b.booking_id}*.`,
    "",
    `⚠️ *PENDING ITEMS:*`,
    itemList,
    "",
    `🧾 *PENDING BALANCE: ${fmtINR(b.remaining_amount || 0)}*`,
    "",
    "Please clear both items and balance at your earliest convenience.",
    "",
    `${businessName || "ShivaShakti Shamiyana Studio"}`
  ];
  open(b.phone, lines.join("\n"));
};

export const sendWhatsappBalance = (b: any, businessName?: string) => {
  sendWhatsappPendingAmount(b, businessName);
};

export const sendWhatsappStatus = (b: any, businessName?: string) => {
  const lines = [
    `Hello ${b.customer_name || "Customer"},`,
    "",
    `Update for your booking *${b.booking_id}* with ${businessName || "ShivaShakti Shamiyana Studio"}:`,
    "",
    `📦 Current Status: *${b.status}*`,
    "",
    "Please reach out if you have any questions.",
  ];
  open(b.phone, lines.join("\n"));
};

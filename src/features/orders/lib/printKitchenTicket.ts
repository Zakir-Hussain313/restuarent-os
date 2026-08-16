import type { Order, OrderType } from "@/types";
import type { CartItem } from "@/store/usePosStore";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

const TICKET_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #000;
    background: #fff;
    padding: 16px;
    width: 300px;
  }
  .ticket-header { text-align: center; margin-bottom: 12px; }
  .ticket-header h1 { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
  .ticket-header p { font-size: 11px; margin-top: 2px; }
  .offline-banner {
    text-align: center;
    font-weight: 700;
    font-size: 12px;
    border: 2px dashed #000;
    padding: 4px;
    margin-bottom: 10px;
    letter-spacing: 1px;
  }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
  .meta-label { font-weight: 600; }
  .items-header { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .item { margin-bottom: 10px; }
  .item-main { display: flex; gap: 8px; font-weight: 700; font-size: 14px; }
  .item-qty { min-width: 24px; }
  .item-modifier { font-size: 11px; padding-left: 32px; color: #333; margin-top: 2px; }
  .item-notes { font-size: 11px; padding-left: 32px; font-style: italic; color: #555; margin-top: 2px; }
  .footer { text-align: center; font-size: 10px; margin-top: 12px; color: #555; }
  .page-break { page-break-before: always; break-before: page; }
`;

// Shared print mechanism — renders HTML into a hidden iframe and prints
// it directly, no popup/tab. Used by both the confirmed-order ticket and
// the offline-queued ticket.
// Returns a promise that resolves once this print job's dialog has closed
// (via the 'afterprint' event), so callers that need to print more than one
// document in sequence — e.g. an offline kitchen ticket followed immediately
// by an offline bill — can wait for one dialog to close before opening the
// next. Chrome only allows one print dialog open at a time system-wide;
// firing a second window.print() while the first is still open is silently
// ignored, with no error, which is why sequencing (not just delaying) matters.
// Falls back to a fixed timeout if 'afterprint' never fires, so a single
// print job can never hang the caller indefinitely.
function printHtmlDocument(title: string, bodyHtml: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      resolve();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>${TICKET_STYLES}</style>
        </head>
        <body>${bodyHtml}</body>
      </html>
    `);
    doc.close();

    let settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      if (iframe.parentNode) document.body.removeChild(iframe);
      resolve();
    }

    setTimeout(() => {
      iframe.contentWindow?.addEventListener("afterprint", finish);
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Safety net — if afterprint never fires (some browsers/print-to-PDF
      // flows are inconsistent about it), don't leave the caller waiting
      // forever.
      setTimeout(finish, 5000);
    }, 250);
  });
}

// Derives a short, human-readable offline reference from an idempotency
// key — e.g. "OFF-3D81974B". Same key is stored on the order row itself,
// so this reference stays traceable after sync (paper ticket ↔ DB order).
export function getOfflineRef(idempotencyKey: string): string {
  return `OFF-${idempotencyKey.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(RESTAURANT_CONFIG.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(RESTAURANT_CONFIG.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Builds the same ticket markup KitchenTicketModal renders on screen,
// as a plain HTML string — used both for the modal's print button and
// for headless auto-print (no modal shown at all).
export function buildKitchenTicketHtml(order: Order): string {
  const itemsHtml = order.items
    .filter((item) => item.status !== "cancelled")
    .map((item) => {
      const variantHtml = item.selectedVariant
        ? `<p class="item-modifier">› ${item.selectedVariant.variantName}</p>`
        : "";
      const modifiersHtml = item.selectedModifiers
        .map((mod) => `<p class="item-modifier">+ ${mod.optionName}</p>`)
        .join("");
      const notesHtml = item.notes
        ? `<p class="item-notes">✎ ${item.notes}</p>`
        : "";

      return `
        <div class="item">
          <div class="item-main">
            <span class="item-qty">${item.quantity}x</span>
            <span>${item.menuItemName}</span>
          </div>
          ${variantHtml}
          ${modifiersHtml}
          ${notesHtml}
        </div>
      `;
    })
    .join("");

  const notesSectionHtml = order.notes
    ? `
      <div class="divider"></div>
      <div>
        <p class="items-header">Order Notes</p>
        <p style="font-size: 12px; font-style: italic; color: #555;">${order.notes}</p>
      </div>
    `
    : "";

  const tableRowHtml = order.tableNumber
    ? `<div class="meta-row"><span class="meta-label">Table</span><span>${order.tableNumber}</span></div>`
    : "";

  return `
    <div class="ticket-header">
      <h1>Kitchen Ticket</h1>
      <p>${RESTAURANT_CONFIG.name}</p>
    </div>
    <div class="divider"></div>
    <div class="meta-row"><span class="meta-label">Order</span><span>${order.orderNumber}</span></div>
    <div class="meta-row"><span class="meta-label">Type</span><span>${ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span></div>
    ${tableRowHtml}
    <div class="meta-row"><span class="meta-label">Date</span><span>${formatDate(order.createdAt)}</span></div>
    <div class="meta-row"><span class="meta-label">Time</span><span>${formatTime(order.createdAt)}</span></div>
    <div class="divider"></div>
    <p class="items-header">Items</p>
    ${itemsHtml}
    ${notesSectionHtml}
    <div class="divider"></div>
    <p class="footer">${formatDate(order.createdAt)} · ${formatTime(order.createdAt)}</p>
  `;
}

// Prints the ticket for a confirmed order (has a real DB order number).
export function printKitchenTicket(order: Order): Promise<void> {
  const ticketHtml = buildKitchenTicketHtml(order);
  return printHtmlDocument(`Kitchen Ticket - ${order.orderNumber}`, ticketHtml);
}

// â”€â”€â”€ Offline ticket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Prints immediately at the moment an order is queued offline — before
// any DB row or real order number exists. Built directly from cart state
// instead of a server Order. Clearly marked with a temporary offline
// reference so kitchen staff and the DB record can be matched up later.
interface OfflineKitchenTicketParams {
  cartItems: CartItem[];
  orderType: OrderType;
  tableNumber?: string;
  notes?: string;
  offlineRef: string;
  queuedAt: Date;
}

function buildOfflineKitchenTicketHtml(params: OfflineKitchenTicketParams): string {
  const { cartItems, orderType, tableNumber, notes, offlineRef, queuedAt } = params;

  const itemsHtml = cartItems
    .map((ci) => {
      const variantHtml = ci.selectedVariant
        ? `<p class="item-modifier">&rsaquo; ${ci.selectedVariant.variantName}</p>`
        : "";
      const modifiersHtml = ci.selectedModifiers
        .map((mod) => `<p class="item-modifier">+ ${mod.optionName}</p>`)
        .join("");
      const notesHtml = ci.notes
        ? `<p class="item-notes">&#9998; ${ci.notes}</p>`
        : "";

      return `
        <div class="item">
          <div class="item-main">
            <span class="item-qty">${ci.quantity}x</span>
            <span>${ci.menuItem.name}</span>
          </div>
          ${variantHtml}
          ${modifiersHtml}
          ${notesHtml}
        </div>
      `;
    })
    .join("");

  const notesSectionHtml = notes
    ? `
      <div class="divider"></div>
      <div>
        <p class="items-header">Order Notes</p>
        <p style="font-size: 12px; font-style: italic; color: #555;">${notes}</p>
      </div>
    `
    : "";

  const tableRowHtml = tableNumber
    ? `<div class="meta-row"><span class="meta-label">Table</span><span>${tableNumber}</span></div>`
    : "";

  const ticketHtml = `
    <div class="ticket-header">
      <h1>Kitchen Ticket</h1>
      <p>${RESTAURANT_CONFIG.name}</p>
    </div>
    <div class="offline-banner">&#9888; OFFLINE ORDER &mdash; ${offlineRef}</div>
    <div class="divider"></div>
    <div class="meta-row"><span class="meta-label">Ref</span><span>${offlineRef}</span></div>
    <div class="meta-row"><span class="meta-label">Type</span><span>${ORDER_TYPE_LABELS[orderType] ?? orderType}</span></div>
    ${tableRowHtml}
    <div class="meta-row"><span class="meta-label">Date</span><span>${formatDate(queuedAt.toISOString())}</span></div>
    <div class="meta-row"><span class="meta-label">Time</span><span>${formatTime(queuedAt.toISOString())}</span></div>
    <div class="divider"></div>
    <p class="items-header">Items</p>
    ${itemsHtml}
    ${notesSectionHtml}
    <div class="divider"></div>
    <p class="footer">Will sync automatically once back online</p>
  `;

  return ticketHtml;
}

export function printOfflineKitchenTicket(params: OfflineKitchenTicketParams): Promise<void> {
  const ticketHtml = buildOfflineKitchenTicketHtml(params);
  return printHtmlDocument(`Offline Ticket - ${params.offlineRef}`, ticketHtml);
}

// ─── Offline bill ─────────────────────────────────────────────────────

// Prints a customer-facing bill at the moment an offline order is placed —
// same trigger point as printOfflineKitchenTicket, using live cart totals.
// No payment method is shown: offline payment methods can't be verified
// (JazzCash/Easypaisa/card all need connectivity to actually process), so
// the real payment method is recorded later via the normal "Complete Bill"
// flow once this order has synced. This is a receipt of the total only.
interface OfflineBillParams {
  cartItems: CartItem[];
  orderType: OrderType;
  tableNumber?: string;
  offlineRef: string;
  queuedAt: Date;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
}

function buildOfflineBillHtml(params: OfflineBillParams): string {
  const {
    cartItems,
    orderType,
    tableNumber,
    offlineRef,
    queuedAt,
    subtotal,
    discountAmount,
    deliveryFee,
    total,
  } = params;

  const itemsHtml = cartItems
    .map((ci) => {
      const variantHtml = ci.selectedVariant
        ? `<p class="item-modifier">&rsaquo; ${ci.selectedVariant.variantName}</p>`
        : "";
      const modifiersHtml = ci.selectedModifiers
        .map((mod) => `<p class="item-modifier">+ ${mod.optionName}</p>`)
        .join("");

      return `
        <div class="item">
          <div class="item-main">
            <span class="item-qty">${ci.quantity}x</span>
            <span>${ci.menuItem.name}</span>
            <span style="margin-left: auto;">Rs. ${ci.itemTotal.toLocaleString()}</span>
          </div>
          ${variantHtml}
          ${modifiersHtml}
        </div>
      `;
    })
    .join("");

  const tableRowHtml = tableNumber
    ? `<div class="meta-row"><span class="meta-label">Table</span><span>${tableNumber}</span></div>`
    : "";

  const discountRowHtml = discountAmount > 0
    ? `<div class="meta-row"><span class="meta-label">Discount</span><span>&minus; Rs. ${discountAmount.toLocaleString()}</span></div>`
    : "";

  const deliveryFeeRowHtml = deliveryFee > 0
    ? `<div class="meta-row"><span class="meta-label">Delivery Fee</span><span>Rs. ${deliveryFee.toLocaleString()}</span></div>`
    : "";

  const billHtml = `
    <div class="ticket-header">
      <h1>Bill</h1>
      <p>${RESTAURANT_CONFIG.name}</p>
    </div>
    <div class="offline-banner">&#9888; OFFLINE ORDER &mdash; ${offlineRef}</div>
    <div class="divider"></div>
    <div class="meta-row"><span class="meta-label">Ref</span><span>${offlineRef}</span></div>
    <div class="meta-row"><span class="meta-label">Type</span><span>${ORDER_TYPE_LABELS[orderType] ?? orderType}</span></div>
    ${tableRowHtml}
    <div class="meta-row"><span class="meta-label">Date</span><span>${formatDate(queuedAt.toISOString())}</span></div>
    <div class="meta-row"><span class="meta-label">Time</span><span>${formatTime(queuedAt.toISOString())}</span></div>
    <div class="divider"></div>
    <p class="items-header">Items</p>
    ${itemsHtml}
    <div class="divider"></div>
    <div class="meta-row"><span class="meta-label">Subtotal</span><span>Rs. ${subtotal.toLocaleString()}</span></div>
    ${discountRowHtml}
    ${deliveryFeeRowHtml}
    <div class="meta-row" style="font-weight: 700; font-size: 14px; margin-top: 4px;"><span>TOTAL</span><span>Rs. ${total.toLocaleString()}</span></div>
    <div class="divider"></div>
    <p class="footer">Payment to be confirmed once back online</p>
  `;

  return billHtml;
}

export function printOfflineBill(params: OfflineBillParams): Promise<void> {
  const billHtml = buildOfflineBillHtml(params);
  return printHtmlDocument(`Offline Bill - ${params.offlineRef}`, billHtml);
}

// Combines the offline kitchen ticket and the offline bill into a single
// print job (two pages, separated by a CSS page break) instead of two
// separate window.print() calls. Chrome only honors an automated print
// dialog while riding on a recent user gesture (the "Place Order" click);
// a second, separate print() call fired afterward — even after the first
// dialog closes — is silently dropped with no error. One combined job
// avoids that entirely.
export function printOfflineTicketAndBill(
  ticketParams: OfflineKitchenTicketParams,
  billParams: OfflineBillParams
): Promise<void> {
  const ticketHtml = buildOfflineKitchenTicketHtml(ticketParams);
  const billHtml = buildOfflineBillHtml(billParams);
  const combinedHtml = `${ticketHtml}<div class="page-break"></div>${billHtml}`;
  return printHtmlDocument(`Offline Order - ${ticketParams.offlineRef}`, combinedHtml);
}
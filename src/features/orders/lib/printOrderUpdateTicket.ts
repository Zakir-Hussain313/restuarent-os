import type { Order } from "@/types";
import type { OrderRevisionLine } from "@/db/schema";
import type { OrderRevisionDTO } from "@/features/orders/lib/orderEditing";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import {
  ORDER_TYPE_LABELS,
  formatDate,
  formatTime,
  printHtmlDocument,
} from "@/features/orders/lib/printKitchenTicket";

// Extra styles for the update ticket only — the base ticket styles live in
// printKitchenTicket.ts. Black-and-white safe: thermal printers drop
// backgrounds, so emphasis is done with borders, weight and strike-through.
const UPDATE_TICKET_STYLES = `
  .update-banner {
    text-align: center;
    font-weight: 700;
    font-size: 15px;
    border: 3px solid #000;
    padding: 6px 4px;
    margin-bottom: 10px;
    letter-spacing: 1px;
  }
  .section-title {
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    border: 1px solid #000;
    padding: 2px 6px;
    margin: 10px 0 6px;
  }
  .struck { text-decoration: line-through; }
`;

// Order data comes from staff/admin input (item names, notes) — escape it
// before it goes into the print document.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detailsHtml(line: OrderRevisionLine): string {
  const variant = line.variantName
    ? `<p class="item-modifier">&rsaquo; ${esc(line.variantName)}</p>`
    : "";
  const modifiers = line.modifiers
    .map((m) => `<p class="item-modifier">+ ${esc(m)}</p>`)
    .join("");
  const notes = line.notes ? `<p class="item-notes">&#9998; ${esc(line.notes)}</p>` : "";
  return `${variant}${modifiers}${notes}`;
}

function lineHtml(line: OrderRevisionLine, struck: boolean): string {
  return `
    <div class="item">
      <div class="item-main">
        <span class="item-qty">${line.quantity}x</span>
        <span${struck ? ' class="struck"' : ""}>${esc(line.menuItemName)}</span>
      </div>
      ${detailsHtml(line)}
    </div>
  `;
}

function quantityChangeHtml(line: OrderRevisionLine & { fromQuantity: number }): string {
  return `
    <div class="item">
      <div class="item-main">
        <span>${esc(line.menuItemName)}</span>
        <span style="margin-left: auto; white-space: nowrap;">${line.fromQuantity} &rarr; ${line.quantity}</span>
      </div>
      ${detailsHtml(line)}
    </div>
  `;
}

function section(title: string, bodyHtml: string): string {
  return bodyHtml ? `<div class="section-title">${title}</div>${bodyHtml}` : "";
}

export interface OrderUpdateTicketParams {
  // The order as it stands after the edit (cancelled lines are filtered here).
  order: Order;
  revision: OrderRevisionDTO;
}

// The kitchen already has the original ticket — this one only says what
// changed, and carries enough of the original's reference (order number,
// type, table, customer phone, original time) to match it to that ticket.
export function buildOrderUpdateTicketHtml({ order, revision }: OrderUpdateTicketParams): string {
  const { added, cancelled, quantityChanged } = revision.changes;

  const tableRow = order.tableNumber
    ? `<div class="meta-row"><span class="meta-label">Table</span><span>${esc(order.tableNumber)}</span></div>`
    : "";
  const customerRow = order.customerPhone
    ? `<div class="meta-row"><span class="meta-label">Customer</span><span>${esc(order.customerPhone)}</span></div>`
    : "";
  const editorRow = revision.editedByName
    ? `<div class="meta-row"><span class="meta-label">By</span><span>${esc(revision.editedByName)}</span></div>`
    : "";

  const reasonHtml = revision.reason
    ? `
      <div class="divider"></div>
      <p class="items-header">Reason</p>
      <p style="font-size: 12px; font-style: italic; color: #555;">${esc(revision.reason)}</p>
    `
    : "";

  // "Now in order" is only accurate for the newest revision — a reprint of
  // an older update must not show today's items as if they were its result.
  const isLatest = revision.revision === order.revision;
  const nowInOrderHtml = isLatest
    ? `
      <div class="divider"></div>
      <p class="items-header">Now in order</p>
      ${order.items
        .filter((item) => item.status !== "cancelled")
        .map((item) => {
          const variant = item.selectedVariant ? ` (${esc(item.selectedVariant.variantName)})` : "";
          const mods = item.selectedModifiers.length
            ? `<p class="item-modifier">+ ${item.selectedModifiers.map((m) => esc(m.optionName)).join(", ")}</p>`
            : "";
          const notes = item.notes ? `<p class="item-notes">&#9998; ${esc(item.notes)}</p>` : "";
          return `
            <div class="item" style="margin-bottom: 6px;">
              <div class="item-main" style="font-size: 12px;">
                <span class="item-qty">${item.quantity}x</span>
                <span>${esc(item.menuItemName)}${variant}</span>
              </div>
              ${mods}${notes}
            </div>
          `;
        })
        .join("")}
    `
    : "";

  return `
    <style>${UPDATE_TICKET_STYLES}</style>
    <div class="ticket-header">
      <h1>Order Update</h1>
      <p>${esc(RESTAURANT_CONFIG.name ?? "")}</p>
    </div>
    <div class="update-banner">${esc(order.orderNumber)} &middot; UPDATE #${revision.revision}</div>
    <div class="meta-row"><span class="meta-label">Order</span><span>${esc(order.orderNumber)}</span></div>
    <div class="meta-row"><span class="meta-label">Type</span><span>${ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span></div>
    ${tableRow}
    ${customerRow}
    <div class="meta-row"><span class="meta-label">Placed</span><span>${formatDate(order.createdAt)} ${formatTime(order.createdAt)}</span></div>
    <div class="meta-row"><span class="meta-label">Updated</span><span>${formatDate(revision.createdAt)} ${formatTime(revision.createdAt)}</span></div>
    ${editorRow}
    ${section("+ Added", added.map((l) => lineHtml(l, false)).join(""))}
    ${section("- Cancelled", cancelled.map((l) => lineHtml(l, true)).join(""))}
    ${section("~ Quantity changed", quantityChanged.map(quantityChangeHtml).join(""))}
    ${reasonHtml}
    ${nowInOrderHtml}
    <div class="divider"></div>
    <p class="footer">${esc(order.orderNumber)} &middot; Update #${revision.revision} &middot; ${formatTime(revision.createdAt)}</p>
  `;
}

export function printOrderUpdateTicket(params: OrderUpdateTicketParams): Promise<void> {
  return printHtmlDocument(
    `Order Update - ${params.order.orderNumber} #${params.revision.revision}`,
    buildOrderUpdateTicketHtml(params)
  );
}
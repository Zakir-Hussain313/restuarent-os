import { NextRequest } from "next/server";

// This is where our checkoutForm.url points during initiate(). The real
// PayFast would show its own payment page here; we show a fake one with
// two buttons so you can simulate either outcome.
export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return new Response("Not available in production", { status: 404 });
    }

    const formData = await request.formData();
    const amount = formData.get("TXNAMT");
    const currency = formData.get("CURRENCY_CODE");
    const basketId = String(formData.get("BASKET_ID") ?? "");
    const successUrl = String(formData.get("SUCCESS_URL") ?? "");
    const failureUrl = String(formData.get("FAILURE_URL") ?? "");

    const payLink = `/api/dev/fake-payfast/simulate?basketId=${encodeURIComponent(basketId)}&outcome=paid&redirectTo=${encodeURIComponent(successUrl)}`;
    const failLink = `/api/dev/fake-payfast/simulate?basketId=${encodeURIComponent(basketId)}&outcome=failed&redirectTo=${encodeURIComponent(failureUrl)}`;

    const html = `<!DOCTYPE html>
<html>
<head><title>Fake PayFast Checkout (dev only)</title>
<style>
  body { font-family: sans-serif; background: #f4f2ef; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { background: white; border-radius: 16px; padding: 32px; width: 360px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; }
  h1 { font-size: 16px; margin: 0 0 4px; color: #1a1815; }
  p { color: #8a8680; font-size: 12px; margin: 0 0 20px; }
  .amount { font-size: 26px; font-weight: 700; margin-bottom: 24px; color: #1a1815; }
  a.btn { display: block; width: 100%; padding: 14px; border-radius: 10px; font-size: 14px; font-weight: 600; margin-bottom: 10px; text-decoration: none; box-sizing: border-box; }
  .pay { background: #16a34a; color: white; }
  .fail { background: #f1f1f1; color: #444; }
</style>
</head>
<body>
  <div class="card">
    <h1>Fake PayFast (dev only)</h1>
    <p>Basket ${basketId}</p>
    <div class="amount">${currency} ${amount}</div>
    <a class="btn pay" href="${payLink}">Simulate Successful Payment</a>
    <a class="btn fail" href="${failLink}">Simulate Failed Payment</a>
  </div>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
}
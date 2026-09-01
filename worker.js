export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const order = await request.json();
        if (!order?.customer?.name || !order?.customer?.phone || !Array.isArray(order.items) || !order.items.length) return json({ error: "Invalid order" }, 400, cors);
        const id = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const now = new Date().toISOString();
        if (env.DB) {
          await env.DB.prepare("INSERT INTO orders (id, customer_name, phone, email, address, city, postal, payment_method, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, order.customer.name, order.customer.phone, order.customer.email || "", order.customer.address || "", order.customer.city || "", order.customer.postal || "", order.payment || "cod", Number(order.total) || 0, "PENDING", now).run();
          for (const item of order.items) await env.DB.prepare("INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)").bind(id, item.id, item.name, item.qty, item.price).run();
        }
        if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
          const lines = order.items.map(i => `• ${i.name} × ${i.qty} — ৳${Number(i.price * i.qty).toLocaleString("en-BD")}`).join("\n");
          const text = `🛍️ NEW ORDER\n\nOrder: ${id}\nStatus: PENDING\n\n👤 ${order.customer.name}\n📞 ${order.customer.phone}\n✉️ ${order.customer.email || "-"}\n📍 ${order.customer.address || "-"}, ${order.customer.city || "-"} ${order.customer.postal || ""}\n💳 ${order.payment || "cod"}\n\n${lines}\n\n💰 Total: ৳${Number(order.total || 0).toLocaleString("en-BD")}`;
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }) });
        }
        return json({ ok: true, orderId: id, status: "PENDING" }, 201, cors);
      } catch (e) { return json({ error: "Unable to create order" }, 500, cors); }
    }
    if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true }, 200, cors);
    return json({ error: "Not found" }, 404, cors);
  }
};
function json(data, status, headers) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } }); }

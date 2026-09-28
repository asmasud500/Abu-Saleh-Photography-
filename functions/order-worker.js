// Cloudflare Worker: ecommerce order API + Telegram admin bot.
// Secrets (never commit): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// Optional vars: STORE_URL, ADMIN_URL, SUPPORT_URL, ALLOWED_ORIGIN.
// Optional D1 binding: DB. If DB is configured, Telegram status buttons also update the order row.

const json=(body,status=200,origin="*")=>new Response(JSON.stringify(body),{
  status,
  headers:{
    "content-type":"application/json",
    "cache-control":"no-store",
    "access-control-allow-origin":origin,
    "access-control-allow-methods":"GET, POST, OPTIONS",
    "access-control-allow-headers":"Content-Type, Authorization"
  }
});

const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const money=n=>`৳${Number(n||0).toLocaleString("en-BD")}`;
const orderId=()=>`ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

async function tg(env,method,body){
  if(!env.TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot is not configured");
  const r=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok || !data.ok) throw new Error(data.description||`Telegram ${method} failed`);
  return data.result;
}

async function saveOrder(env,id,o,status="PENDING"){
  if(!env.DB)return;
  await env.DB.prepare(
    "INSERT INTO orders (id, customer_name, phone, email, address, city, postal, payment_method, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,o.customer.name,o.customer.phone,o.customer.email||"",o.customer.address||"",
    o.customer.city||"",o.customer.postal||"",o.payment||"cod",Number(o.total)||0,status,
    o.createdAt||new Date().toISOString()
  ).run();
  for(const item of o.items){
    await env.DB.prepare(
      "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)"
    ).bind(id,item.id,item.name,Number(item.qty)||0,Number(item.price)||0).run();
  }
}

async function updateOrderStatus(env,id,status){
  if(!env.DB)return;
  await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(status,id).run();
}

function orderMessage(id,o,status="PENDING"){
  const c=o.customer||{};
  const lines=(o.items||[]).map(i=>`• ${esc(i.name)} × ${Number(i.qty)||0} — ${money(Number(i.price||0)*Number(i.qty||0))}`).join("\n");
  return `🛍️ <b>NEW NOVA ORDER</b>\n\n<b>Order:</b> <code>${esc(id)}</code>\n<b>Status:</b> ${esc(status)}\n\n<b>Customer</b>\nName: ${esc(c.name)}\nPhone: ${esc(c.phone)}\nEmail: ${esc(c.email)}\nAddress: ${esc(c.address)}, ${esc(c.city)} ${esc(c.postal)}\n\n<b>Items</b>\n${lines}\n\n<b>Total:</b> ${money(o.total)}\n<b>Payment:</b> ${esc(o.payment||"cod")}\n<b>Time:</b> ${esc(o.createdAt||new Date().toISOString())}`;
}

function statusKeyboard(id,env){
  const rows=[
    [{text:"✅ Confirm",callback_data:`order:${id}:CONFIRMED`},{text:"⚙️ Processing",callback_data:`order:${id}:PROCESSING`}],
    [{text:"🚚 Shipped",callback_data:`order:${id}:SHIPPED`},{text:"📦 Delivered",callback_data:`order:${id}:DELIVERED`}],
    [{text:"❌ Cancel",callback_data:`order:${id}:CANCELLED`}]
  ];
  if(env.ADMIN_URL)rows.push([{text:"🛠️ Admin Dashboard",url:env.ADMIN_URL}]);
  return {inline_keyboard:rows};
}

async function notifyNewOrder(env,id,o){
  const body={
    chat_id:env.TELEGRAM_CHAT_ID,
    text:orderMessage(id,o),
    parse_mode:"HTML",
    disable_web_page_preview:true,
    reply_markup:statusKeyboard(id,env)
  };
  if(env.ADMIN_URL)body.reply_markup=statusKeyboard(id,env);
  return tg(env,"sendMessage",body);
}

async function handleCallback(env,q){
  const data=String(q.data||"");
  const m=data.match(/^order:([A-Z0-9-]+):(CONFIRMED|PROCESSING|SHIPPED|DELIVERED|CANCELLED)$/);
  if(!m){
    await tg(env,"answerCallbackQuery",{callback_query_id:q.id,text:"Unknown action",show_alert:false});
    return;
  }
  const [,id,status]=m;
  const adminId=String(env.TELEGRAM_CHAT_ID||"");
  if(adminId && String(q.message?.chat?.id)!==adminId){
    await tg(env,"answerCallbackQuery",{callback_query_id:q.id,text:"Not authorized",show_alert:true});
    return;
  }
  await updateOrderStatus(env,id,status);
  await tg(env,"answerCallbackQuery",{callback_query_id:q.id,text:`Order ${status.toLowerCase()}`,show_alert:false});
  if(q.message){
    const old=q.message.text||"";
    const newText=old.replace(/<b>Status:<\/b> [^\n]+/, `<b>Status:</b> ${esc(status)}`);
    await tg(env,"editMessageText",{
      chat_id:q.message.chat.id,
      message_id:q.message.message_id,
      text:newText,
      parse_mode:"HTML",
      disable_web_page_preview:true,
      reply_markup:statusKeyboard(id,env)
    });
  }
}

async function handleBotMessage(env,msg){
  if(!msg?.text)return;
  const chatId=String(msg.chat?.id||"");
  const adminId=String(env.TELEGRAM_CHAT_ID||"");
  const text=msg.text.trim();

  if(text==="/start" || text==="/help"){
    const buttons=[
      [{text:"🛍️ Open Store",url:env.STORE_URL||"https://github.com/asmasud500/Abu-Saleh-Photography-"}],
      [{text:"📦 Check Order Status",callback_data:"status_help"}]
    ];
    if(env.ADMIN_URL)buttons.push([{text:"🛠️ Admin Dashboard",url:env.ADMIN_URL}]);
    if(env.SUPPORT_URL)buttons.push([{text:"🆘 Support",url:env.SUPPORT_URL}]);
    await tg(env,"sendMessage",{
      chat_id:chatId,
      text:"<b>NOVA Store Bot</b>\n\nUse the buttons below. Admins can manage order status directly from new-order notifications.",
      parse_mode:"HTML",
      reply_markup:{inline_keyboard:buttons}
    });
    return;
  }

  if(text.toLowerCase()==="/status" || text.toLowerCase()==="status"){
    await tg(env,"sendMessage",{chat_id:chatId,text:"Send your order ID like: <code>ORD-ABC123</code>",parse_mode:"HTML"});
    return;
  }

  const idMatch=text.match(/^\/?status\s+([A-Z0-9-]{6,40})$/i);
  if(idMatch){
    const id=idMatch[1].toUpperCase();
    if(!env.DB){
      await tg(env,"sendMessage",{chat_id:chatId,text:"Order status lookup needs the D1 database to be connected."});
      return;
    }
    const row=await env.DB.prepare("SELECT id, customer_name, total, status, created_at FROM orders WHERE id=?").bind(id).first();
    if(!row){
      await tg(env,"sendMessage",{chat_id:chatId,text:`❌ Order <code>${esc(id)}</code> was not found.`,parse_mode:"HTML"});
      return;
    }
    await tg(env,"sendMessage",{
      chat_id:chatId,
      text:`📦 <b>Order Status</b>\n\nOrder: <code>${esc(row.id)}</code>\nCustomer: ${esc(row.customer_name)}\nStatus: <b>${esc(row.status)}</b>\nTotal: <b>${money(row.total)}</b>\nCreated: ${esc(row.created_at)}`,
      parse_mode:"HTML"
    });
    return;
  }

  if(chatId===adminId && text.toLowerCase()==="/orders"){
    if(!env.DB){
      await tg(env,"sendMessage",{chat_id:chatId,text:"D1 database is not connected."});
      return;
    }
    const rows=await env.DB.prepare("SELECT id, customer_name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10").all();
    const lines=(rows.results||[]).map(r=>`• <code>${esc(r.id)}</code> — ${esc(r.customer_name)} — ${money(r.total)} — <b>${esc(r.status)}</b>`).join("\n");
    await tg(env,"sendMessage",{chat_id:chatId,text:`📋 <b>Latest Orders</b>\n\n${lines||"No orders yet."}`,parse_mode:"HTML"});
    return;
  }

  await tg(env,"sendMessage",{chat_id:chatId,text:"Use /start for the bot menu or /status ORDER-ID to check an order."});
}

export default {
  async fetch(req,env){
    const origin=env.ALLOWED_ORIGIN||"*";
    if(req.method==="OPTIONS")return new Response(null,{headers:{
      "access-control-allow-origin":origin,
      "access-control-allow-methods":"GET, POST, OPTIONS",
      "access-control-allow-headers":"Content-Type, Authorization"
    }});

    const url=new URL(req.url);

    // Telegram webhook endpoint.
    if(url.pathname==="/telegram/webhook" && req.method==="POST"){
      try{
        const update=await req.json();
        if(update.callback_query)await handleCallback(env,update.callback_query);
        else if(update.message)await handleBotMessage(env,update.message);
        return json({ok:true},200,origin);
      }catch(e){
        return json({error:"Telegram handler failed"},500,origin);
      }
    }

    // Optional health check.
    if(url.pathname==="/api/health" && req.method==="GET")return json({
      ok:true,
      telegramConfigured:Boolean(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID),
      databaseConfigured:Boolean(env.DB)
    },200,origin);

    if(url.pathname!=="/api/orders" || req.method!=="POST")return json({error:"Not found"},404,origin);
    if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return json({error:"Server notification is not configured"},503,origin);

    let o;
    try{o=await req.json()}catch{return json({error:"Invalid JSON"},400,origin)}
    const c=o.customer||{};
    if(!c.name||!c.phone||!c.email||!c.address||!Array.isArray(o.items)||!o.items.length)return json({error:"Missing required order data"},400,origin);
    if(String(c.name).length>80||String(c.phone).length>20||String(c.email).length>120||String(c.address).length>500||o.items.length>50)return json({error:"Invalid order data"},400,origin);

    const id=orderId();
    const status="PENDING";
    try{
      await saveOrder(env,id,o,status);
      await notifyNewOrder(env,id,o);
      return json({ok:true,orderId:id,status},201,origin);
    }catch(e){
      return json({error:"Unable to create order"},500,origin);
    }
  }
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Недозволене джерело запиту." }, 403);
  if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "Очікується JSON." }, 415);

  let payload;
  try { payload = await request.json(); } catch { return json({ error: "Некоректне звернення." }, 400); }

  const threadName = typeof payload?.thread_name === "string" ? payload.thread_name.trim() : "";
  const content = typeof payload?.content === "string" ? payload.content.trim() : "";
  if (!threadName || threadName.length > 100 || !content || content.length > 2000) return json({ error: "Перевірте тему й текст звернення." }, 400);

  const webhookId = env.DISCORD_WEBHOOK_ID;
  const webhookToken = env.DISCORD_WEBHOOK_TOKEN;
  if (!webhookId || !webhookToken) return json({ error: "Сервіс надсилання тимчасово недоступний." }, 503);

  const webhookUrl = "https://discord.com/api/webhooks/" + encodeURIComponent(webhookId) + "/" + encodeURIComponent(webhookToken) + "?wait=true";
  let discordResponse;
  try {
    discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_name: threadName, content, allowed_mentions: { parse: [] } })
    });
  } catch { return json({ error: "Не вдалося надіслати звернення." }, 502); }

  if (!discordResponse.ok) return json({ error: "Discord не прийняв звернення." }, 502);
  return json({ ok: true });
}

/* Production contact endpoint hook.
   The static site currently uses a mailto fallback from script.js.
   For Cloudflare deployment, connect this form to a Worker endpoint and
   keep email/API secrets in Worker environment variables, never in the client.
*/
export async function handleContact(request, env) {
  if (request.method !== 'POST') return new Response('Method Not Allowed',{status:405});
  const data=await request.json();
  const name=String(data.name||'').trim(), email=String(data.email||'').trim(), message=String(data.message||'').trim();
  if(name.length<2||message.length<10||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({error:'Invalid form data'},{status:400});
  // Add your trusted email provider here. Store credentials in env bindings.
  return Response.json({ok:true,message:'Inquiry validated'});
}

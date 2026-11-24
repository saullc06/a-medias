export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      url.protocol='https:';
      return Response.redirect(url.href,308);
    }
    const headers={
      'Strict-Transport-Security':'max-age=31536000',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Cache-Control':'private, no-store',
      'X-Frame-Options':'DENY'
    };
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
    const asset=routes.get(url.pathname);
    headers['Content-Type']=asset?.[0] || 'text/plain; charset=utf-8';
    return new Response(request.method==='HEAD'?null:(asset?.[0] === 'image/png' ? Uint8Array.from(atob(asset[1]), ch => ch.charCodeAt(0)) : asset?.[1]??'Página no encontrada'),{status:asset?200:404,headers});
  }
};

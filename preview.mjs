import http from 'node:http';
import './build.mjs';
const { default: worker } = await import('./dist/server/index.js');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';

http.createServer(async (req, res) => {
  try {
    const result = await worker.fetch(new Request('https://localhost' + req.url, {method:req.method}));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    res.writeHead(400);
    res.end('Solicitud incorrecta');
  }
}).listen(port, host, () => console.log('A Medias disponible en http://' + host + ':' + port));

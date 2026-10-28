import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if(relative!=='index.html'&&!relative.startsWith('src/')){res.writeHead(404);res.end('Not found');return;}
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!types[path.extname(file)]){res.writeHead(403);res.end('Forbidden');return;}
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT||4190);
server.listen(port,'127.0.0.1',()=>console.log(`PipeGuide-Next: http://127.0.0.1:${port}`));

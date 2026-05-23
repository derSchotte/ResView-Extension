import * as http from "http";
import * as https from "https";
import * as net from "net";
import * as url from "url";

const INSPECTOR_SCRIPT = `(function(){
  'use strict';
  var hl=null;
  function getHl(){
    if(!hl){
      hl=document.createElement('div');
      hl.id='__rv_hl__';
      hl.style.cssText='position:fixed;pointer-events:none;background:rgba(124,106,246,0.12);outline:2px solid rgba(124,106,246,0.85);outline-offset:-2px;z-index:2147483646;box-sizing:border-box;';
      document.documentElement.appendChild(hl);
    }
    return hl;
  }
  function getSources(el){
    var found=[];
    var sheets=document.styleSheets;
    for(var i=0;i<sheets.length;i++){
      try{
        var rules=sheets[i].cssRules;
        if(!rules)continue;
        for(var j=0;j<rules.length;j++){
          var rule=rules[j];
          if(!rule.selectorText)continue;
          try{
            if(el.matches(rule.selectorText)){
              var href=sheets[i].href;
              var name=href?href.split('/').pop().split('?')[0]:'<style>';
              if(found.indexOf(name)<0)found.push(name);
            }
          }catch(e){}
        }
      }catch(e){}
    }
    return found;
  }
  document.addEventListener('mouseover',function(e){
    var el=e.target;
    if(!el||el.nodeType!==1||el===hl)return;
    var r=el.getBoundingClientRect();
    var h=getHl();
    h.style.left=r.left+'px';h.style.top=r.top+'px';
    h.style.width=r.width+'px';h.style.height=r.height+'px';
    h.style.display='block';
    var cs=window.getComputedStyle(el);
    var tag=el.tagName.toLowerCase();
    var id=el.id?'#'+el.id:'';
    var cls=Array.from(el.classList).slice(0,3).map(function(c){return'.'+c;}).join('');
    window.parent.postMessage({
      type:'__resview_inspector_hover__',
      selector:tag+id+cls,
      sources:getSources(el),
      box:{
        width:Math.round(r.width),height:Math.round(r.height),
        marginTop:cs.marginTop,marginRight:cs.marginRight,
        marginBottom:cs.marginBottom,marginLeft:cs.marginLeft,
        paddingTop:cs.paddingTop,paddingRight:cs.paddingRight,
        paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft,
        borderTop:cs.borderTopWidth,borderRight:cs.borderRightWidth,
        borderBottom:cs.borderBottomWidth,borderLeft:cs.borderLeftWidth
      },
      styles:{
        color:cs.color,backgroundColor:cs.backgroundColor,
        fontSize:cs.fontSize,
        fontFamily:cs.fontFamily.split(',')[0].replace(/['"]/g,'').trim(),
        fontWeight:cs.fontWeight,lineHeight:cs.lineHeight,
        display:cs.display,
        position:cs.position!=='static'?cs.position:'',
        flexDirection:cs.flexDirection!=='row'?cs.flexDirection:'',
        gap:cs.gap!=='normal'?cs.gap:'',
        borderRadius:cs.borderRadius!=='0px'?cs.borderRadius:'',
        opacity:cs.opacity!=='1'?cs.opacity:'',
        zIndex:cs.zIndex!=='auto'?cs.zIndex:'',
        overflow:cs.overflow!=='visible'?cs.overflow:''
      }
    },'*');
  },true);
  document.addEventListener('mouseleave',function(){
    if(hl)hl.style.display='none';
    window.parent.postMessage({type:'__resview_inspector_clear__'},'*');
  });
})();`;

export class InspectorProxy {
  private _server: http.Server | null = null;
  private _port = 0;
  private _targetBase = "";

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this._server = http.createServer((req, res) => this._handle(req, res));
      this._server.listen(0, "127.0.0.1", () => {
        this._port = (this._server!.address() as net.AddressInfo).port;
        resolve(this._port);
      });
      this._server.on("error", reject);
    });
  }

  get port(): number {
    return this._port;
  }

  setTarget(targetUrl: string): void {
    const parsed = url.parse(targetUrl);
    this._targetBase = `${parsed.protocol}//${parsed.host}`;
  }

  proxyUrlFor(originalUrl: string): string {
    const parsed = url.parse(originalUrl);
    return `http://127.0.0.1:${this._port}${parsed.path || "/"}`;
  }

  stop(): void {
    this._server?.close();
    this._server = null;
  }

  private _handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this._targetBase) {
      res.writeHead(502);
      res.end("No proxy target configured");
      return;
    }

    const targetUrl = this._targetBase + (req.url || "/");
    const parsed = url.parse(targetUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    headers["host"] = parsed.host!;
    headers["accept-encoding"] = "identity";

    const options: http.RequestOptions = {
      hostname: parsed.hostname!,
      port: parsed.port
        ? parseInt(parsed.port)
        : parsed.protocol === "https:"
        ? 443
        : 80,
      path: parsed.path || "/",
      method: req.method || "GET",
      headers,
    };

    const proxyReq = lib.request(options, (proxyRes) => {
      const ct = proxyRes.headers["content-type"] || "";
      const isHtml = ct.includes("text/html");
      const statusCode = proxyRes.statusCode || 200;
      const respHeaders: http.OutgoingHttpHeaders = { ...proxyRes.headers };

      delete respHeaders["x-frame-options"];
      delete respHeaders["content-security-policy"];

      if (respHeaders["location"]) {
        const loc = respHeaders["location"] as string;
        const base = `http://127.0.0.1:${this._port}`;
        if (loc.startsWith(this._targetBase)) {
          respHeaders["location"] = base + loc.slice(this._targetBase.length);
        } else if (loc.startsWith("/")) {
          respHeaders["location"] = base + loc;
        }
      }

      if (isHtml) {
        delete respHeaders["content-length"];
      }

      res.writeHead(statusCode, respHeaders);

      if (!isHtml) {
        proxyRes.pipe(res);
        return;
      }

      const chunks: Buffer[] = [];
      proxyRes.on("data", (c: Buffer) => chunks.push(c));
      proxyRes.on("end", () => {
        let html = Buffer.concat(chunks).toString("utf-8");
        html = this._inject(html);
        res.end(html);
      });
    });

    proxyReq.on("error", (err) => {
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end(`Proxy error: ${err.message}`);
    });

    req.pipe(proxyReq);
  }

  private _inject(html: string): string {
    const tag = `<script id="__rv_inspector__">${INSPECTOR_SCRIPT}<\/script>`;
    if (/<\/body>/i.test(html)) {
      return html.replace(/<\/body>/i, `${tag}</body>`);
    }
    if (/<\/html>/i.test(html)) {
      return html.replace(/<\/html>/i, `${tag}</html>`);
    }
    return html + tag;
  }
}

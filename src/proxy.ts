import * as http from "http";
import * as https from "https";
import * as net from "net";

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
    var pageName=window.location.href.split('/').pop().split('?')[0]||'index.html';
    function sheetName(sheet){
      var href=sheet.href;
      if(href)return href.split('/').pop().split('?')[0];
      var node=sheet.ownerNode;
      var viteId=node&&node.getAttribute&&node.getAttribute('data-vite-dev-id');
      if(viteId)return viteId.split('/').pop().split('?')[0];
      return pageName;
    }
    function scanRules(rules,name){
      for(var j=0;j<rules.length;j++){
        var rule=rules[j];
        try{
          if(rule.selectorText){
            if(el.matches(rule.selectorText)&&found.indexOf(name)<0)found.push(name);
          } else if(rule.cssRules){
            scanRules(rule.cssRules,name);
          }
        }catch(e){}
      }
    }
    for(var i=0;i<sheets.length;i++){
      try{
        var rules=sheets[i].cssRules;
        if(!rules)continue;
        scanRules(rules,sheetName(sheets[i]));
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
  function _rvCollectCss(){
    var rules=[];
    var sheets=document.styleSheets;
    var pageName=window.location.href.split('/').pop().split('?')[0]||'index';
    function sName(s){
      if(s.href)return s.href.split('/').pop().split('?')[0];
      var n=s.ownerNode;
      var v=n&&n.getAttribute&&n.getAttribute('data-vite-dev-id');
      return v?v.split('/').pop().split('?')[0]:pageName;
    }
    function scan(cssRules,file,media){
      for(var j=0;j<cssRules.length;j++){
        var r=cssRules[j];
        try{
          if(r.selectorText){
            var props=[];
            for(var k=0;k<r.style.length;k++)props.push({n:r.style[k],v:r.style.getPropertyValue(r.style[k])});
            rules.push({sel:r.selectorText,props:props,file:file,media:media});
          }else if(r.cssRules){
            scan(r.cssRules,file,r.conditionText||'');
          }
        }catch(e){}
      }
    }
    for(var i=0;i<sheets.length;i++){
      try{if(sheets[i].cssRules)scan(sheets[i].cssRules,sName(sheets[i]),'');}catch(e){}
    }
    return rules;
  }
  var _rvHlSt=null;
  function _rvSetHl(sel){
    if(!_rvHlSt){_rvHlSt=document.createElement('style');_rvHlSt.id='__rv_css_hl__';document.head.appendChild(_rvHlSt);}
    try{_rvHlSt.textContent=sel?sel+'{background-color:rgba(220,50,50,0.15)!important;}':'';}catch(e){_rvHlSt.textContent='';}
  }
  window.addEventListener('message',function(e){
    if(!e.data)return;
    var t=e.data.type;
    if(t==='__resview_get_css_rules__'){window.parent.postMessage({type:'__resview_css_rules__',rules:_rvCollectCss()},'*');}
    else if(t==='__resview_highlight_selector__'){_rvSetHl(e.data.selector||'');}
    else if(t==='__resview_clear_highlight__'){_rvSetHl('');}
  });
})();`;

export class InspectorProxy {
  private server: http.Server | null = null;
  private port = 0;
  private targetBase = "";

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.on("upgrade", (req, socket, head) =>
        this.handleUpgrade(req, socket as net.Socket, head)
      );
      this.server.listen(0, "127.0.0.1", () => {
        this.port = (this.server!.address() as net.AddressInfo).port;
        resolve(this.port);
      });
      this.server.on("error", reject);
    });
  }

  get proxyPort(): number {
    return this.port;
  }

  setTarget(targetUrl: string): void {
    const parsed = new URL(targetUrl);
    this.targetBase = `${parsed.protocol}//${parsed.host}`;
  }

  proxyUrlFor(originalUrl: string): string {
    const parsed = new URL(originalUrl);
    return `http://127.0.0.1:${this.port}${parsed.pathname}${parsed.search}`;
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private handleUpgrade(req: http.IncomingMessage, socket: net.Socket, head: Buffer): void {
    if (!this.targetBase) {
      socket.destroy();
      return;
    }

    const target = new URL(this.targetBase);
    const targetPort = target.port ? parseInt(target.port, 10) : 80;

    const upstream = net.connect(targetPort, target.hostname, () => {
      const lines = [
        `GET ${req.url} HTTP/1.1`,
        ...Object.entries(req.headers).map(([k, v]) =>
          `${k}: ${k === "host" ? target.host : (Array.isArray(v) ? v.join(", ") : v)}`
        ),
        "",
        "",
      ];
      upstream.write(lines.join("\r\n"));
      if (head?.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });

    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.targetBase) {
      res.writeHead(502);
      res.end("No proxy target configured");
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL((req.url ?? "/"), this.targetBase);
    } catch {
      res.writeHead(400);
      res.end("Invalid request path");
      return;
    }

    const lib = targetUrl.protocol === "https:" ? https : http;
    const defaultPort = targetUrl.protocol === "https:" ? 443 : 80;

    const requestHeaders: http.OutgoingHttpHeaders = { ...req.headers };
    requestHeaders["host"] = targetUrl.host;
    requestHeaders["accept-encoding"] = "identity";

    const options: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? parseInt(targetUrl.port, 10) : defaultPort,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method ?? "GET",
      headers: requestHeaders,
    };

    const proxyReq = lib.request(options, (proxyRes) =>
      this.handleProxyResponse(proxyRes, res)
    );

    proxyReq.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end("Upstream connection failed");
    });

    req.pipe(proxyReq);
  }

  private handleProxyResponse(
    proxyRes: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    const contentType = proxyRes.headers["content-type"] ?? "";
    const isHtml = contentType.includes("text/html");
    const statusCode = proxyRes.statusCode ?? 200;
    const responseHeaders = this.buildResponseHeaders(proxyRes.headers, isHtml);

    res.writeHead(statusCode, responseHeaders);

    if (!isHtml) {
      proxyRes.pipe(res);
      return;
    }

    const chunks: Buffer[] = [];
    proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
    proxyRes.on("end", () => {
      const html = Buffer.concat(chunks).toString("utf-8");
      res.end(this.injectInspectorScript(html));
    });
  }

  private buildResponseHeaders(
    incoming: http.IncomingHttpHeaders,
    isHtml: boolean
  ): http.OutgoingHttpHeaders {
    const headers: http.OutgoingHttpHeaders = { ...incoming };

    // Remove headers that would block iframe embedding
    delete headers["x-frame-options"];
    delete headers["content-security-policy"];

    if (headers["location"]) {
      headers["location"] = this.rewriteLocation(headers["location"] as string);
    }

    // Content-length is invalid after script injection
    if (isHtml) delete headers["content-length"];

    return headers;
  }

  private rewriteLocation(location: string): string {
    const base = `http://127.0.0.1:${this.port}`;
    if (location.startsWith(this.targetBase)) {
      return base + location.slice(this.targetBase.length);
    }
    if (location.startsWith("/")) {
      return base + location;
    }
    return location;
  }

  private injectInspectorScript(html: string): string {
    const tag = `<script id="__rv_inspector__">${INSPECTOR_SCRIPT}<\/script>`;
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}</body>`);
    if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${tag}</html>`);
    return html + tag;
  }
}

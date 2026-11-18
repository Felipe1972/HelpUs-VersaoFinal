// Distância estimada em linha reta. A API continua responsável pela autorização.
function point(p){return p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180}
function recentPosition(p,now=Date.now()) {const age=now-p?.timestamp;return !!(point(p)&&Number.isFinite(age)&&age>=0&&age<=120000&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=100)}
function kilometers(a,b){if(!point(a)||!point(b))return null;const rad=n=>n*Math.PI/180;const dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)))}
function nearby(items,position,radius=null,sort=false,now=Date.now()){
 const valid=recentPosition(position,now);
 const result=items.map(p=>({...p,distancia_km:valid?kilometers(position,p):null})).filter(p=>!valid||radius===null||p.meu_pedido||p.assumido||p.distancia_km!==null&&p.distancia_km<=radius);
 return valid&&sort?result.sort((a,b)=>(a.distancia_km??Infinity)-(b.distancia_km??Infinity)):result;
}
module.exports={recentPosition,kilometers,nearby};

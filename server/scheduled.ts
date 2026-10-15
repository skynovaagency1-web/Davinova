import { getCJOrderDetails, isCJDryRun } from './cj';
import type { CJEnv } from './cj';
import { sendTransactionalEmail } from './email';
interface Env extends CJEnv { RESEND_API_KEY?:string; EMAIL_FROM?:string }
interface ScheduledEvent {cron:string;scheduledTime:number}
interface TrackRow {
  supplier_order_row_id:string;order_id:string;order_number:string;customer_email:string;
  cj_order_id:string|null;tracking_number:string|null;tracking_email_sent_at:string|null;
}
function escapeHtml(value:string):string {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
export async function scheduled(_event:ScheduledEvent,env:Env,_ctx:ExecutionContext):Promise<void>{
  if(isCJDryRun(env)) return;
  const rows=await env.DB.prepare("SELECT so.id AS supplier_order_row_id,so.order_id,o.order_number,o.email AS customer_email,so.cj_order_id,so.tracking_number,so.tracking_email_sent_at FROM supplier_orders so JOIN orders o ON o.id=so.order_id WHERE so.supplier='cj' AND so.status IN ('ordered','shipped') AND (so.next_retry_at IS NULL OR julianday(so.next_retry_at)<=julianday('now')) ORDER BY so.updated_at ASC LIMIT 20")
    .all<TrackRow>();
  for(const row of rows.results || []){
    try{
      if(!row.cj_order_id) continue;
      const detail=await getCJOrderDetails(env,row.cj_order_id);
      const tracking=(detail.trackNumber || '').trim();
      if(!tracking){
        await env.DB.prepare("UPDATE supplier_orders SET last_synced_at=datetime('now'),next_retry_at=datetime('now','+1 hour'),updated_at=datetime('now') WHERE id=?")
          .bind(row.supplier_order_row_id).run();
        continue;
      }
      const trackingUrl=(detail.trackingUrl || '').trim() || 'https://www.17track.net/en?nums='+encodeURIComponent(tracking);
      await env.DB.prepare("UPDATE supplier_orders SET status='shipped',tracking_number=?,tracking_url=?,last_synced_at=datetime('now'),next_retry_at=NULL,error_message=NULL,updated_at=datetime('now') WHERE id=?")
        .bind(tracking,trackingUrl,row.supplier_order_row_id).run();
      await env.DB.prepare("UPDATE orders SET status='shipped',tracking_number=?,tracking_url=?,updated_at=datetime('now') WHERE id=?")
        .bind(tracking,trackingUrl,row.order_id).run();
      if((!row.tracking_email_sent_at || row.tracking_number!==tracking) && row.customer_email){
        await sendTransactionalEmail({
          to:row.customer_email,subject:'Your Davinova order '+row.order_number+' is on its way',
          html:'<div style="font-family:Arial,sans-serif;color:#262321;max-width:560px;margin:auto"><p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA</p><h1 style="font-family:Georgia,serif;font-weight:normal">Your order is on its way.</h1><p>Order <strong>'+escapeHtml(row.order_number)+'</strong> has shipped.</p><p>Tracking number: <strong>'+escapeHtml(tracking)+'</strong></p><p><a href="'+trackingUrl+'" style="display:inline-block;background:#262321;color:#fffaf5;text-decoration:none;padding:13px 18px">Track your delivery</a></p><p style="font-size:12px;color:#817872">Carrier updates can take a little time to appear.</p></div>',
        },env.RESEND_API_KEY,env.EMAIL_FROM);
        await env.DB.prepare("UPDATE supplier_orders SET tracking_email_sent_at=datetime('now'),updated_at=datetime('now') WHERE id=?")
          .bind(row.supplier_order_row_id).run();
      }
    }catch(error){
      const message=error instanceof Error?error.message.slice(0,400):'Tracking/email sync failed';
      await env.DB.prepare("UPDATE supplier_orders SET attempts=attempts+1,error_message=?,last_synced_at=datetime('now'),next_retry_at=datetime('now','+1 hour'),updated_at=datetime('now') WHERE id=?")
        .bind(message,row.supplier_order_row_id).run();
    }
  }
}

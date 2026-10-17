import { consumeApprovalToken, getApprovalTokenOrderId } from '../../../server/auth';
import { createCJOrder, isCJDryRun, queryCJVariantStock } from '../../../server/cj';
import type { CJEnv, CJOrderInput, CJOrderLine, CJShippingAddress } from '../../../server/cj';

type Env = CJEnv;
interface StoreOrder {
  id: string; order_number: string; email: string; payment_status: string; status: string;
  total_cents: number; currency: string; shipping_address_json: string;
}
interface StoreOrderLine {
  order_item_id: string; product_title: string; size: string; color: string; quantity: number;
  product_id: string | null; variant_id: string | null; supplier: string | null; supplier_verified: number | null; product_active: number | null; cost_cents: number | null; variant_active: number | null;
  cj_product_id: string | null; cj_variant_id: string | null; cj_sku: string | null; available_stock: number | null;
  stock_checked_at: string | null; image_url: string | null;
}
interface SupplierOrder { id: string; status: string; supplier_order_id: string | null }
function json(data: unknown, status=200): Response {
  return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
function sameOrigin(request: Request): boolean {
  const origin=request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}
function asRecord(value: string): Record<string,unknown> {
  try { const parsed: unknown=JSON.parse(value); return parsed && typeof parsed==='object' && !Array.isArray(parsed) ? parsed as Record<string,unknown> : {}; }
  catch { return {}; }
}
function field(source: Record<string,unknown>,...names:string[]): string {
  for(const name of names) if(typeof source[name]==='string' && (source[name] as string).trim()) return (source[name] as string).trim();
  return '';
}
function shippingAddress(order: StoreOrder): CJShippingAddress {
  const v=asRecord(order.shipping_address_json);
  const name=field(v,'name','fullName','shippingCustomerName') || [field(v,'firstName','first_name'),field(v,'lastName','last_name')].filter(Boolean).join(' ');
  return {
    name, address1:field(v,'address1','address','street','shippingAddress'), address2:field(v,'address2','apartment','shippingAddress2') || undefined,
    city:field(v,'city','shippingCity'), province:field(v,'province','state','region','shippingProvince'),
    country:field(v,'country','countryName','shippingCountry'), countryCode:field(v,'countryCode','country_code','shippingCountryCode').toUpperCase(),
    postalCode:field(v,'postalCode','postal_code','zip','shippingZip') || undefined, phone:field(v,'phone','shippingPhone') || undefined,
    email:order.email, county:field(v,'county') || undefined,
  };
}
async function getOrder(env: Env,id: string): Promise<StoreOrder | null> {
  return env.DB.prepare('SELECT id,order_number,email,payment_status,status,total_cents,currency,shipping_address_json FROM orders WHERE id=?')
    .bind(id).first<StoreOrder>();
}
async function getLines(env: Env,id: string): Promise<StoreOrderLine[]> {
  const result=await env.DB.prepare(`SELECT oi.id AS order_item_id,oi.product_title,oi.size,oi.color,oi.quantity,oi.product_id,oi.variant_id,
    p.supplier,p.supplier_verified,p.active AS product_active,p.cost_cents,p.cj_product_id,pv.active AS variant_active,pv.cj_variant_id,pv.cj_sku,pv.available_stock,pv.stock_checked_at,
    (SELECT i.url FROM product_images i WHERE i.product_id=p.id ORDER BY i.is_primary DESC,i.position LIMIT 1) AS image_url
    FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN product_variants pv ON pv.id=oi.variant_id
    WHERE oi.order_id=? ORDER BY oi.id`).bind(id).all<StoreOrderLine>();
  return result.results ?? [];
}
function mappingProblem(lines: StoreOrderLine[]): string | null {
  if(!lines.length) return 'This order has no line items.';
  if(lines.some((line)=>line.supplier!=='cj' || line.supplier_verified!==1 || line.product_active!==1 || line.variant_active!==1 || !line.cj_product_id || !line.cj_variant_id)) {
    return 'At least one item is not an active, verified CJ product/variant. No supplier purchase is allowed.';
  }
  if(lines.some((line)=>!Number.isSafeInteger(line.cost_cents) || (line.cost_cents ?? 0)<=0)) {
    return 'CJ item cost has not been recorded. Confirm the current supplier price before approving any purchase.';
  }
  if(lines.some((line)=>!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>10)) return 'An order line has an invalid quantity.';
  return null;
}
function toCJInput(order: StoreOrder,lines: StoreOrderLine[]): CJOrderInput {
  const products: CJOrderLine[]=lines.map((line)=>({
    orderItemId:line.order_item_id,cjProductId:line.cj_product_id!,cjVariantId:line.cj_variant_id!,quantity:line.quantity,
    variantOptions:[line.color,line.size].filter(Boolean).join('-'),storeProductId:line.product_id || '',
    storeProductImg:line.image_url || undefined,storeProductName:line.product_title,
  }));
  return {orderNumber:order.order_number,shipping:shippingAddress(order),products};
}
async function resolveToken(request: Request,env: Env): Promise<{token:string;orderId:string}|Response> {
  if(!sameOrigin(request)) return json({error:'Cross-origin approval requests are not allowed.'},403);
  let body:{token?:unknown};
  try {body=await request.json() as {token?:unknown};} catch {return json({error:'Invalid JSON request.'},400);}
  const token=typeof body.token==='string'?body.token.trim():'';
  const orderId=await getApprovalTokenOrderId(token,env.DB);
  if(!orderId) return json({error:'This approval link is invalid, expired or already used.'},401);
  return {token,orderId};
}
export async function onRequestGet({request,env}:{request:Request;env:Env}):Promise<Response> {
  const token=new URL(request.url).searchParams.get('token') || '';
  const id=await getApprovalTokenOrderId(token,env.DB);
  if(!id) return json({error:'This approval link is invalid, expired or already used.'},401);
  const order=await getOrder(env,id);
  if(!order || order.payment_status!=='paid' || order.status!=='pending_approval') return json({error:'This order is not awaiting owner approval.'},409);
  const lines=await getLines(env,id);
  const problem=mappingProblem(lines);
  const total=new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency || 'USD'}).format(order.total_cents/100);
  return json({
    orderNumber:order.order_number,total:total,status:order.status,
    items:lines.map((line)=>({title:line.product_title,size:line.size,color:line.color,quantity:line.quantity})),
    readyToApprove:!problem,readinessMessage:problem || (isCJDryRun(env)
      ? 'Ready for a safe dry-run. No CJ request or supplier charge will occur.'
      : 'CJ stock and logistics must be rechecked immediately before submission.'),
    dryRun:isCJDryRun(env),
  });
}
export async function onRequestPost({request,env}:{request:Request;env:Env}):Promise<Response> {
  const maybeToken=await resolveToken(request,env);
  if(maybeToken instanceof Response) return maybeToken;
  const token=maybeToken.token;
  const order=await getOrder(env,maybeToken.orderId);
  if(!order || order.payment_status!=='paid' || order.status!=='pending_approval') return json({error:'Only an order with a verified payment awaiting approval can proceed.'},409);
  const lines=await getLines(env,order.id);
  const problem=mappingProblem(lines);
  if(problem) return json({error:problem},409);
  const current=await env.DB.prepare("SELECT id,status,supplier_order_id FROM supplier_orders WHERE order_id=? AND supplier='cj'")
    .bind(order.id).first<SupplierOrder>();
  if(current && current.status!=='dry_run') return json({error:'A CJ order record already exists. Check CJ and the supplier audit before any further action.'},409);

  const required=new Map<string,number>();
  for(const line of lines) required.set(line.cj_variant_id!, (required.get(line.cj_variant_id!) || 0)+line.quantity);
  if(!isCJDryRun(env)) {
    try {
      for(const [variantId,qty] of required) {
        const rows=await queryCJVariantStock(env,variantId);
        const available=rows.reduce((sum,row)=>sum+Math.max(0,Number(row.totalInventoryNum ?? row.cjInventoryNum ?? 0)),0);
        if(!rows.length || available<qty) return json({error:'CJ inventory could not confirm the requested size/quantity. No supplier order was submitted.'},409);
        await env.DB.prepare("UPDATE product_variants SET available_stock=?,stock_checked_at=datetime('now') WHERE cj_variant_id=?")
          .bind(available,variantId).run();
      }
    } catch {
      return json({error:'CJ inventory check failed. No purchase was attempted; check API access and try again only after reviewing the CJ account.'},502);
    }
  }
  const consumed=await consumeApprovalToken(token,env.DB);
  if(consumed!==order.id) return json({error:'This approval link was already used or expired.'},401);
  const supplierRowId=current?.id || crypto.randomUUID();
  try {
    if(isCJDryRun(env)) {
      if(current) await env.DB.prepare("UPDATE supplier_orders SET status='dry_run',error_message=NULL,last_synced_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(supplierRowId).run();
      else await env.DB.prepare("INSERT INTO supplier_orders (id,order_id,supplier,status,created_at,updated_at,last_synced_at) VALUES (?,?,'cj','dry_run',datetime('now'),datetime('now'),datetime('now'))").bind(supplierRowId,order.id).run();
      return json({ok:true,mode:'dry_run',message:'Dry-run recorded. No request was sent to CJ and no supplier funds were spent.'});
    }
    if(current) await env.DB.prepare("UPDATE supplier_orders SET status='processing',error_message=NULL,approved_at=datetime('now'),attempts=attempts+1,updated_at=datetime('now') WHERE id=?").bind(supplierRowId).run();
    else await env.DB.prepare("INSERT INTO supplier_orders (id,order_id,supplier,status,approved_at,created_at,updated_at) VALUES (?,?,'cj','processing',datetime('now'),datetime('now'),datetime('now'))").bind(supplierRowId,order.id).run();

    const result=await createCJOrder(env,toCJInput(order,lines),true,async(progress)=>{
      const statusMap:{[key:string]:string}={created:'created',cart_added:'cart_added',confirmed:'confirmed',parent_generated:'parent_generated',paid:'ordered'};
      await env.DB.prepare("UPDATE supplier_orders SET status=?,cj_order_id=COALESCE(?,cj_order_id),shipment_order_id=COALESCE(?,shipment_order_id),supplier_order_id=COALESCE(?,supplier_order_id),cj_pay_id=COALESCE(?,cj_pay_id),last_synced_at=datetime('now'),updated_at=datetime('now') WHERE id=?")
        .bind(statusMap[progress.step],progress.cjOrderId || null,progress.shipmentOrderId || null,progress.shipmentOrderId || null,progress.payId || null,supplierRowId).run();
    });
    if(result.mode==='sandbox') {
      await env.DB.prepare("UPDATE supplier_orders SET status='sandbox_order',supplier_order_id=?,cj_order_id=?,shipment_order_id=?,cj_pay_id=?,last_synced_at=datetime('now'),updated_at=datetime('now') WHERE id=?")
        .bind(result.shipmentOrderId || null,result.cjOrderId || null,result.shipmentOrderId || null,result.payId || null,supplierRowId).run();
      return json({ok:true,mode:'sandbox',message:'CJ sandbox order flow completed. It does not fulfil or ship a real customer order.'});
    }
    await env.DB.prepare("UPDATE supplier_orders SET status='ordered',supplier_order_id=?,cj_order_id=?,shipment_order_id=?,cj_pay_id=?,error_message=NULL,updated_at=datetime('now') WHERE id=?")
      .bind(result.shipmentOrderId || null,result.cjOrderId || null,result.shipmentOrderId || null,result.payId || null,supplierRowId).run();
    await env.DB.prepare("UPDATE orders SET status='ordered',updated_at=datetime('now') WHERE id=?").bind(order.id).run();
    await env.DB.prepare("INSERT INTO order_events (id,order_id,event_type,from_status,to_status,message,metadata_json) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),order.id,'cj_supplier_order_paid','pending_approval','ordered','CJ supplier order placed after one-time owner approval.',JSON.stringify({supplierRowId: supplierRowId,cjOrderId:result.cjOrderId,shipmentOrderId:result.shipmentOrderId})).run();
    return json({ok:true,mode:'live',message:'CJ supplier order placed and balance payment completed; tracking will be checked by scheduled sync.'});
  } catch(error) {
    const detail=error instanceof Error?error.message.slice(0,400):'Unknown CJ supplier error';
    await env.DB.prepare("UPDATE supplier_orders SET status='needs_attention',error_message=?,updated_at=datetime('now') WHERE id=?").bind(detail,supplierRowId).run();
    await env.DB.prepare("UPDATE orders SET status='needs_attention',updated_at=datetime('now') WHERE id=?").bind(order.id).run();
    await env.DB.prepare("INSERT INTO order_events (id,order_id,event_type,from_status,to_status,message,metadata_json) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),order.id,'cj_supplier_order_needs_attention','pending_approval','needs_attention','CJ order flow failed or was interrupted; reconcile CJ state before any retry.',JSON.stringify({supplierRowId:supplierRowId})).run();
    return json({error:'CJ order flow failed or was interrupted. The order is flagged for manual reconciliation; do not retry blindly.'},502);
  }
}

/**
 * FondMart is a style-discovery catalog for Davinova, not an automatic fulfilment API.
 * Preferred path: send a FondMart listing URL to CJ as a sourcing request and sell only
 * when CJ confirms the exact match and variant. Any FondMart exception is placed manually
 * by the owner outside this adapter; this module must never submit a live FondMart order.
 */
export interface FondMartOrderLine { sourceProductId:string; quantity:number }
export interface FondMartManualOrderNote {
  orderNumber:string;
  sourceUrl:string;
  items:FondMartOrderLine[];
  note:string;
}
/** Dry-run marker for a manually handled fallback; never contacts FondMart. */
export async function prepareManualFondMartFallback(input:FondMartManualOrderNote,dryRun=true):Promise<{status:'dry_run';orderNumber:string;manualActionRequired:true}> {
  if(!input.orderNumber.trim()||!input.sourceUrl.startsWith('https://fondmart.com/')) throw new Error('A store order number and FondMart source URL are required.');
  if(!input.items.length||input.items.some((item)=>!item.sourceProductId.trim()||!Number.isSafeInteger(item.quantity)||item.quantity<1)) {
    throw new Error('Each manual fallback line needs a source listing ID and positive integer quantity.');
  }
  if(!dryRun) throw new Error('FondMart fallback is manual only. Place the order in FondMart yourself and record the supplier result; no API order was submitted.');
  return {status:'dry_run',orderNumber:input.orderNumber,manualActionRequired:true};
}

import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
interface Preview {
  orderNumber:string; total:string; status:string;
  items:{title:string;size:string;color:string;quantity:number}[];
  readyToApprove:boolean;readinessMessage:string;dryRun:boolean;
}
interface ApiError {error?:string}
export function ApprovalPage() {
  const [token,setToken]=useState(()=>new URLSearchParams(window.location.search).get('token') || '');
  const [preview,setPreview]=useState<Preview|null>(null);
  const [error,setError]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [done,setDone]=useState('');
  useEffect(()=>{
    if(!token){setError('This approval link is missing its token. Open the original email link again.');return;}
    window.history.replaceState({},document.title,window.location.pathname);
    let cancelled=false;
    fetch('/api/admin/cj-approve?token='+encodeURIComponent(token),{headers:{Accept:'application/json'}})
      .then(async(response)=>{
        const payload=await response.json() as Preview|ApiError;
        if(!response.ok) throw new Error(('error' in payload && payload.error) || 'This approval link is invalid or expired.');
        if(!cancelled) setPreview(payload as Preview);
      })
      .catch((reason:unknown)=>{if(!cancelled)setError(reason instanceof Error?reason.message:'Unable to load order review.');});
    return ()=>{cancelled=true;};
  },[token]);
  async function approve(){
    if(!token || !preview?.readyToApprove || submitting)return;
    setSubmitting(true);setError('');
    try{
      const response=await fetch('/api/admin/cj-approve',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({token})});
      const payload=await response.json() as {message?:string;error?:string};
      if(!response.ok)throw new Error(payload.error || 'Could not process supplier approval.');
      setDone(payload.message || 'Approval request completed.');
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not process supplier approval.');}
    finally{setSubmitting(false);}
  }
  return <section className="section approval-page">
    <p className="eyebrow">Davinova · Owner review</p><h1>Supplier <em>purchase review.</em></h1>
    <p className="approval-intro">Review the paid customer order before allowing a supplier purchase. The approval link expires after 24 hours and can be used once.</p>
    {error && <p className="approval-message approval-message--error" role="alert">{error}</p>}
    {!preview && !error && <p className="approval-loading"><LoaderCircle className="viewer-spinner" size={18}/> Loading order details…</p>}
    {preview && !done && <>
      <div className="approval-order"><div><span>Customer order</span><strong>{preview.orderNumber}</strong></div><div><span>Customer payment total</span><strong>{preview.total}</strong></div><div><span>Order status</span><strong>{preview.status.replaceAll('_',' ')}</strong></div></div>
      <div className="approval-items"><h2>Items to review</h2>{preview.items.map((item,index)=><div className="approval-item" key={item.title+'-'+item.size+'-'+index}><div><strong>{item.title}</strong><span>{item.color} · Size {item.size} · Qty {item.quantity}</span></div></div>)}</div>
      <p className={preview.readyToApprove?'approval-message':'approval-message approval-message--error'}>{preview.readinessMessage}</p>
      <p className="approval-warning"><ShieldCheck size={16}/> Before live approval, check the exact CJ variant, stock, logistics choice and final supplier payable amount. A live order may spend funds from your CJ balance.</p>
      <button className="button button--dark" type="button" disabled={!preview.readyToApprove||submitting} onClick={approve}>{submitting?<><LoaderCircle size={16} className="viewer-spinner"/> Processing…</>:preview.dryRun?'Run safe dry-run':'Approve supplier purchase'}</button>
    </>}
    {done && <div className="approval-complete" role="status"><CheckCircle2 size={24}/><p>{done}</p></div>}
  </section>;
}

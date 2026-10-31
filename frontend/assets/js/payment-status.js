/* Stripe redirect is NOT proof of payment. Read only the database status verified by Stripe webhook. */
const api = new URL('../../../backend/public/api/payments/status', import.meta.url);
const params=new URLSearchParams(location.search);
const session=params.get('session_id');
const title=document.getElementById('payment-heading');
const status=document.getElementById('payment-status');
const order=document.getElementById('payment-order');
function render(heading,message,state){title.textContent=heading;status.textContent=message;status.dataset.state=state}
async function checkStatus(){
  const url=new URL(api);url.searchParams.set('session_id',session);
  const res=await fetch(url,{credentials:'same-origin',headers:{'Accept':'application/json'},cache:'no-store'});
  const body=await res.json().catch(()=>({}));
  if(!res.ok||body.success!==true)throw new Error(body.message||'Payment status is temporarily unavailable.');
  return body.data||{};
}
async function verify(){
  if(!session||!/^cs_[A-Za-z0-9_]+$/.test(session)){
    render('Checkout reference missing','We could not identify this checkout. Open My orders to view your recent purchases.','error');return;
  }
  for(let attempt=0;attempt<12;attempt++){
    try{
      const p=await checkStatus();
      if(p.order_number){order.hidden=false;order.textContent=`Order: ${p.order_number}`}
      if(p.payment_status==='succeeded'&&p.order_status==='confirmed'){
        render('Payment confirmed!','Thanks for shopping with DONO. Your payment is verified and your order is confirmed.','success');return;
      }
      if(p.payment_status==='failed'||p.payment_status==='refunded'){
        render('Payment not confirmed','This payment was not completed successfully. Check My orders for details.','error');return;
      }
      render('Payment processing','Stripe checkout finished, but we are waiting for secure payment verification. Please keep this page open.','pending');
    }catch(err){
      render('Verifying your order',err.message||'Unable to check payment status.','pending');
    }
    await new Promise(resolve=>setTimeout(resolve,2500));
  }
  render('Payment confirmation pending','We still have not received verification. Please check My orders in a moment. If it stays pending, verify the Stripe webhook listener.','pending');
}
verify();

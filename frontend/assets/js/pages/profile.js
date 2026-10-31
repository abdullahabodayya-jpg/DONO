import { api } from '../services/api.js';
const $=id=>document.getElementById(id);
const note=$('profile-message');
const notify=(text,error=false)=>{note.textContent=text;note.classList.toggle('error',error);note.scrollIntoView({block:'nearest',behavior:'smooth'});};
const fields={name:$('profile-name'),email:$('profile-email'),phone:$('profile-phone'),address:$('profile-address')};
try{const res=await api.get('/profile');const user=res.data?.user;if(!user)throw new Error('Profile is unavailable.');
 for(const [key,el] of Object.entries(fields))el.value=user[key]??'';
 $('profile-avatar').textContent=String(user.name||'D').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
}catch(err){if(err.status===401)location.replace('login.html');else notify(err.message,true);}
$('profile-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const body=Object.fromEntries(Object.entries(fields).map(([key,el])=>[key,el.value.trim()]));body.current_password=$('profile-current-password').value;const res=await api.put('/profile',body);$('profile-current-password').value='';$('profile-avatar').textContent=String(res.data.user.name).split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();notify('Details saved. Looking good! ✳');}catch(err){notify(err.message,true);}finally{btn.disabled=false;}});
$('password-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{await api.post('/profile/password',{current_password:$('security-old').value,new_password:$('security-new').value});e.currentTarget.reset();notify('Password updated securely. ♡');}catch(err){notify(err.message,true);}finally{btn.disabled=false;}});

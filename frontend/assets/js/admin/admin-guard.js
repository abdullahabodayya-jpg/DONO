/* User experience guard only. Sensitive data remains protected by PHP middleware. */
(async()=>{
 const url=new URL('../../../../backend/public/api/auth/me',import.meta.url).pathname;
 try{
  const response=await fetch(url,{credentials:'same-origin'});
  const result=await response.json();
  if(!response.ok||result.data?.user?.role!=='admin')location.replace(new URL('../../../login.html',import.meta.url).pathname);
 }catch{location.replace(new URL('../../../login.html',import.meta.url).pathname);}
})();

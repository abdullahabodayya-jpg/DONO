/* A signed-in user enters their workspace; landing is public only. */
(async () => {
  try {
    const response = await fetch(new URL('../backend/public/api/auth/me',document.baseURI),{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)return;
    const result=await response.json();
    const user=result?.data?.user;
    if(user?.role==='admin')location.replace('admin/index.html');
    else if(user)location.replace('products.html');
  }catch{/* Keep landing public if backend is temporarily unavailable. */}
})();

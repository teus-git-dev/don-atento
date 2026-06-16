async function run() {
  const loginRes = await fetch("https://don-atento-api.onrender.com/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://don-atento.vercel.app"
    },
    body: JSON.stringify({ email: "gerenciacomercial@incasainmobiliaria.com", password: "IncasaAdmin2026!" })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  // Now hit the VERCEL PROXY directly, just like the browser does
  const usersRes = await fetch("https://don-atento.vercel.app/api/users/tenants?page=1&limit=500", {
    headers: {
      "Authorization": "Bearer " + token,
      "Origin": "https://don-atento.vercel.app"
    }
  });
  console.log("Vercel Proxy Status:", usersRes.status);
  
  if (!usersRes.ok) {
     console.log("Error body:", await usersRes.text());
     return;
  }
  const usersData = await usersRes.json();
  console.log("Keys:", Object.keys(usersData));
  console.log("Length:", usersData.data ? usersData.data.length : "NO DATA ARRAY");
}
run();

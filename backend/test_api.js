async function run() {
  const loginRes = await fetch("https://don-atento-api.onrender.com/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://don-atento.vercel.app"
    },
    body: JSON.stringify({ email: "admin@incasa.com", password: "IncasaAdmin2026!" })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log("Token:", token ? "OK" : "MISSING");

  const usersRes = await fetch("https://don-atento-api.onrender.com/users/owners?page=1&limit=500", {
    headers: {
      "Authorization": "Bearer " + token,
      "Origin": "https://don-atento.vercel.app"
    }
  });
  console.log("Status:", usersRes.status);
  const usersData = await usersRes.json();
  console.log("Users:", usersData);
}
run();

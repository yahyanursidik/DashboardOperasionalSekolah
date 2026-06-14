const url = "https://ebdkupeqmpqrdfketgab.supabase.co/auth/v1/token?grant_type=password";
const apikey = "sb_publishable_AcgH3c3pH9EH2N7XT06YGQ_FRae_uUG";

async function run() {
  const loginRes = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": apikey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: "ustadz.ahmad@alfatih.demo", password: "password123" })
  });
  
  const authData = await loginRes.json();
  const token = authData.access_token;
  
  if (!token) {
    console.log("Login failed", authData);
    return;
  }
  
  const res = await fetch("https://ebdkupeqmpqrdfketgab.supabase.co/rest/v1/students", {
    headers: {
      "apikey": apikey,
      "Authorization": "Bearer " + token
    }
  });
  
  const students = await res.json();
  console.log("Total students:", students.length);
  console.log(students);
}

run();

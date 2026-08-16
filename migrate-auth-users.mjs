import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const MUMBAI_URL = "https://povrvnewdnyizlbrayiq.supabase.co";
const MUMBAI_SERVICE_KEY = process.env.MUMBAI_SERVICE_ROLE_KEY;

const mumbai = createClient(MUMBAI_URL, MUMBAI_SERVICE_KEY);

const staff = [
  { id: "c456dddf-0250-4c19-a554-3d060bd6dfd4", email: "regalt0s375@gmail.com" },
  { id: "455115d3-34c8-4500-a4c0-cfcddbf82d13", email: "gguy82819@gmail.com" },
  { id: "3affb547-8b91-4eed-9e01-704d9939013b", email: "khnzakir297@gmail.com" },
  { id: "88859f00-e7bd-403e-9714-fb622454359c", email: "armnmlk88@gmail.com" },
  { id: "e366acc9-328c-4e45-8c01-f65fb798a776", email: "hellomister341@gmail.com" },
];

const TEMP_PASSWORD = process.env.MIGRATION_TEMP_PASSWORD ?? "ChangeMe123!";

for (const user of staff) {
  const { data, error } = await mumbai.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: TEMP_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error(`FAILED: ${user.email} — ${error.message}`);
  } else {
    console.log(`OK: ${user.email} → auth id ${data.user.id}`);
  }
}

console.log("Done.");
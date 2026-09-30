const SUPABASE_URL = "https://erjaclzktdkshxltxzpl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyamFjbHprdGRrc2h4bHR4enBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDAzMTUsImV4cCI6MjA4ODMxNjMxNX0.DV-qAztwHYHc1cJETGQDRHIBBzRNTjuXk2-NFsaH82U";

const AVENUE_POSITIONS = [
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    quantity: 14.082900,
    average_price: 319.69,
    current_price: 380.12,
    applied_amount: 4502.18,
    current_value: 5353.19,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 27473.65,
    applied_amount_brl: 23106.09,
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc",
    quantity: 2.969900,
    average_price: 210.52,
    current_price: 744.10,
    applied_amount: 625.22,
    current_value: 2209.90,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 11341.66,
    applied_amount_brl: 3208.75,
  },
  {
    symbol: "USDT",
    name: "Tether USDt USD",
    quantity: 1542.910000,
    average_price: 1.00,
    current_price: 1.00,
    applied_amount: 1542.72,
    current_value: 1542.72,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 7917.57,
    applied_amount_brl: 7917.57,
  },
  {
    symbol: "BRK.B",
    name: "Berkshire Hathaway Inc Class B",
    quantity: 2.597600,
    average_price: 229.16,
    current_price: 507.17,
    applied_amount: 595.27,
    current_value: 1317.42,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 6761.29,
    applied_amount_brl: 3055.04,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc Class A",
    quantity: 2.958000,
    average_price: 94.84,
    current_price: 337.83,
    applied_amount: 280.54,
    current_value: 999.30,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 5128.61,
    applied_amount_brl: 1439.79,
  },
  {
    symbol: "IONQ",
    name: "IonQ Inc",
    quantity: 5.082210,
    average_price: 66.90,
    current_price: 42.54,
    applied_amount: 340.00,
    current_value: 216.20,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 1109.57,
    applied_amount_brl: 1744.95,
  },
  {
    symbol: "RGTI",
    name: "Rigetti Computing Inc",
    quantity: 8.000000,
    average_price: 48.87,
    current_price: 16.01,
    applied_amount: 390.96,
    current_value: 128.04,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 657.13,
    applied_amount_brl: 2006.49,
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices Inc",
    quantity: 0.194700,
    average_price: 196.89,
    current_price: 614.61,
    applied_amount: 38.33,
    current_value: 119.66,
    currency: "USD",
    fx_rate: 5.1322,
    current_value_brl: 614.14,
    applied_amount_brl: 196.72,
  },
];

async function main() {
  console.log("Fetching investments from Supabase REST API...");
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/investments?select=*`, { headers });
  if (!res.ok) {
    console.error("Failed to fetch investments:", res.statusText);
    return;
  }
  const invs = await res.json();
  const avenueInvs = invs.filter(i => (i.name || "").toLowerCase().includes("avenue") || (i.name || "").toLowerCase().includes("dólar"));
  console.log(`Found ${avenueInvs.length} Avenue investments.`);

  for (const inv of avenueInvs) {
    console.log(`Updating Avenue investment ID: ${inv.id}`);
    
    // Update investment
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/investments?id=eq.${inv.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        mode: "DETAILED",
        currency: "USD",
        value: 11886.43,
        applied: 8315.22,
        value_brl: 61003.54,
        applied_brl: 42675.39,
      })
    });
    console.log(`Updated investment ${inv.id}: status ${patchRes.status}`);

    // Delete existing positions
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/investment_positions?investment_id=eq.${inv.id}`, {
      method: "DELETE",
      headers
    });
    console.log(`Deleted old positions for ${inv.id}: status ${delRes.status}`);

    // Insert new positions
    const posToInsert = AVENUE_POSITIONS.map(p => ({
      ...p,
      investment_id: inv.id,
    }));

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/investment_positions`, {
      method: "POST",
      headers,
      body: JSON.stringify(posToInsert)
    });
    console.log(`Inserted 8 positions for ${inv.id}: status ${insRes.status}`);
  }

  console.log("ALL AVENUE POSITIONS SUCCESSFULLY UPDATED IN SUPABASE DATABASE!");
}

main().catch(console.error);

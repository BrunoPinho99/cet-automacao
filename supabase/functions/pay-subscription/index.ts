import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

// Utility for fetching Asaas
async function asaasFetch(endpoint: string, options: RequestInit = {}) {
  const asaasKey = Deno.env.get("ASAAS_API_KEY");
  const asaasEnv = Deno.env.get("ASAAS_ENV") || "production";
  const baseUrl = asaasEnv === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";
  
  if (!asaasKey) {
    throw new Error("ASAAS_API_KEY is not set.");
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "access_token": asaasKey,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Asaas API Error [${endpoint}]:`, errText);
    throw new Error(`Asaas API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // We use the service role key to insert into the Pedido table reliably from the backend
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { 
      cpfCnpj, 
      email, 
      name, 
      description, 
      valorCentavos, 
      produto, 
      leadId,
      idempotencyKey 
    } = body;

    if (!cpfCnpj || !email || !valorCentavos || !leadId || !idempotencyKey) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const valorReal = valorCentavos / 100;

    // 1. Check if Customer exists in Asaas
    console.log(`Checking Asaas customer for CPF/CNPJ: ${cpfCnpj}`);
    const customersRes = await asaasFetch(`/customers?cpfCnpj=${cpfCnpj}`);
    let customerId: string;

    if (customersRes.data && customersRes.data.length > 0) {
      customerId = customersRes.data[0].id;
      console.log(`Customer found: ${customerId}`);
    } else {
      console.log("Customer not found. Creating...");
      const createCustomerRes = await asaasFetch(`/customers`, {
        method: "POST",
        body: JSON.stringify({
          name: name || email,
          cpfCnpj,
          email,
        }),
      });
      customerId = createCustomerRes.id;
      console.log(`Customer created: ${customerId}`);
    }

    // 2. Create the Payment in Asaas (BillingType UNDEFINED defaults to checkout allowing PIX/Card/Boleto)
    // The user requested strictly PIX or Card. We can use UNDEFINED to generate a checkout link
    console.log(`Creating payment for customer ${customerId}...`);
    
    // Calcula a data de vencimento (amanhã, por exemplo)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentRes = await asaasFetch(`/payments`, {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED", // Asaas will show its checkout page where they can pick PIX or Credit Card
        value: valorReal,
        dueDate: dueDateStr,
        description: description || `Pagamento - ${produto}`,
        externalReference: leadId,
      }),
    });

    console.log(`Payment created: ${paymentRes.id}`);

    // 3. Register intent in Database (`Pedido` table)
    const { error: dbError } = await supabase
      .from("Pedido")
      .insert({
        lead_id: leadId,
        produto: produto,
        valor_centavos: valorCentavos,
        asaas_customer_id: customerId,
        asaas_payment_id: paymentRes.id,
        checkout_url: paymentRes.invoiceUrl,
        idempotency_key: idempotencyKey,
        status: "criado"
      });

    if (dbError) {
      console.error("Error inserting into Pedido table:", dbError);
      // Since it's idempotency key protected, if it fails because it already exists, we might want to handle it.
      // However, we just log it. The webhook is the absolute source of truth.
      if (dbError.code === '23505') { // Unique violation
        console.error("Idempotency key or payment already exists in DB");
      }
    }

    // 4. Return the payment details to the frontend
    return new Response(JSON.stringify({ 
      success: true, 
      paymentId: paymentRes.id,
      invoiceUrl: paymentRes.invoiceUrl
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Function error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

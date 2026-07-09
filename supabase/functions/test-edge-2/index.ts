import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Test Edge Function Loaded!");

serve(async (req) => {
  const { name } = await req.json();

  return new Response(
    JSON.stringify({
      message: `Hiiiiii ${name}!`,
      source: "Self Hosted EC2",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});

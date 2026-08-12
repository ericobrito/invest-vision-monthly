import { supabase } from "@/integrations/supabase/client";

export interface IncidentPayload {
  title: string;
  errorMessage?: string;
  stackTrace?: string;
  componentStack?: string;
  route?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  userContext?: Record<string, any>;
}

export async function reportIncident(payload: IncidentPayload) {
  try {
    const route = payload.route || (typeof window !== "undefined" ? window.location.pathname : undefined);
    
    const { data, error } = await supabase.from("system_incidents").insert({
      title: payload.title,
      error_message: payload.errorMessage || null,
      stack_trace: payload.stackTrace || null,
      component_stack: payload.componentStack || null,
      route: route || null,
      severity: payload.severity || "MEDIUM",
      user_context: payload.userContext || null,
      status: "OPEN",
    }).select().single();

    if (error) {
      console.error("[IncidentLogger] Failed to send incident report to Supabase:", error);
    } else {
      console.info("[IncidentLogger] Incident successfully reported:", data?.id);
    }
    return data;
  } catch (err) {
    console.error("[IncidentLogger] Error reporting incident:", err);
    return null;
  }
}

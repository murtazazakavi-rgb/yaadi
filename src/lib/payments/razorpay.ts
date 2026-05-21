export type CreateWorkspaceSubscriptionInput = {
  workspaceId: string;
  planId: string;
  customerEmail: string;
};

export type RazorpaySubscriptionResult = {
  razorpayCustomerId: string;
  razorpaySubscriptionId: string;
};

export async function createWorkspaceSubscription(
  _input: CreateWorkspaceSubscriptionInput
): Promise<RazorpaySubscriptionResult> {
  throw new Error("Razorpay integration belongs in a Supabase Edge Function with server-side credentials.");
}

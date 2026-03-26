"use client";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../lib/api";
import { useAuthStore } from "../stores/auth";

export function useSubscription() {
  const { user } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: () => paymentsApi.status(),
    enabled: !!user,
    staleTime: 60_000, // 1 minute
  });

  return {
    isPaid: user?.is_paid ?? false,
    status: data?.subscription_status ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    isPastDue: data?.subscription_status === "past_due",
    isLoading,
    refetch,
  };
}

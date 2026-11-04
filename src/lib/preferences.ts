export type BusinessRole = "freelancer" | "small_business" | "agency" | "other";
export type Preferences = { role?: BusinessRole | null; currency?: "PHP" | "USD"; displayName?: string; profilePromptDismissed?: boolean };

export const ROLE_LABEL: Record<BusinessRole, string> = {
  freelancer: "Freelancer / Independent contractor",
  small_business: "Small business owner",
  agency: "Agency / Service provider",
  other: "Other",
};

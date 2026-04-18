export interface PrepareRoundPayload {
  triggerReason?: "boot" | "after_crash" | "manual";
}

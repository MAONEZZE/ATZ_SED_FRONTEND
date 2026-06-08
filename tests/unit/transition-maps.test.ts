import { describe, expect, it } from "vitest";
import {
  canTransitionEvent,
  canTransitionFunnel,
  eventStatusTransitions,
  funnelStatusTransitions,
} from "@/lib/utils/transition-maps";

describe("eventStatusTransitions", () => {
  it("draft pode publicar ou cancelar", () => {
    expect(canTransitionEvent("draft", "published")).toBe(true);
    expect(canTransitionEvent("draft", "cancelled")).toBe(true);
    expect(canTransitionEvent("draft", "ended")).toBe(false);
  });

  it("published pode cancelar ou encerrar", () => {
    expect(canTransitionEvent("published", "cancelled")).toBe(true);
    expect(canTransitionEvent("published", "ended")).toBe(true);
    expect(canTransitionEvent("published", "draft")).toBe(false);
  });

  it("cancelled e ended são terminais", () => {
    expect(eventStatusTransitions.cancelled).toHaveLength(0);
    expect(eventStatusTransitions.ended).toHaveLength(0);
  });
});

describe("funnelStatusTransitions", () => {
  it("pending segue o contrato", () => {
    expect(funnelStatusTransitions.pending).toEqual([
      "screening",
      "approved",
      "rejected",
      "waitlist",
    ]);
  });

  it("waitlist pode aprovar ou rejeitar (contrato)", () => {
    expect(canTransitionFunnel("waitlist", "approved")).toBe(true);
    expect(canTransitionFunnel("waitlist", "rejected")).toBe(true);
    expect(canTransitionFunnel("waitlist", "screening")).toBe(false);
  });

  it("approved e rejected são terminais", () => {
    expect(funnelStatusTransitions.approved).toHaveLength(0);
    expect(funnelStatusTransitions.rejected).toHaveLength(0);
  });
});

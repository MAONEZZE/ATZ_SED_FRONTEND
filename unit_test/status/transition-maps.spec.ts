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
  it("pending pode aprovar ou rejeitar", () => {
    expect(canTransitionFunnel("pending", "approved")).toBe(true);
    expect(canTransitionFunnel("pending", "rejected")).toBe(true);
  });

  it("approved pode voltar a pending ou rejeitar", () => {
    expect(canTransitionFunnel("approved", "pending")).toBe(true);
    expect(canTransitionFunnel("approved", "rejected")).toBe(true);
  });

  it("rejected pode voltar a pending ou aprovar", () => {
    expect(canTransitionFunnel("rejected", "pending")).toBe(true);
    expect(canTransitionFunnel("rejected", "approved")).toBe(true);
  });

  it("todos os status têm transições disponíveis", () => {
    expect(funnelStatusTransitions.pending.length).toBeGreaterThan(0);
    expect(funnelStatusTransitions.approved.length).toBeGreaterThan(0);
    expect(funnelStatusTransitions.rejected.length).toBeGreaterThan(0);
  });
});

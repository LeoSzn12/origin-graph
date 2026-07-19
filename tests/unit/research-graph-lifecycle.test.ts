import { describe, expect, it, vi } from "vitest";
import { createGraphLifecycle, graphLayoutOptions } from "@/components/research-graph";

describe("research graph lifecycle",()=>{
  it("immediately tears down a graph that resolves after effect cleanup",()=>{
    const lifecycle=createGraphLifecycle();
    const teardown=vi.fn();
    lifecycle.dispose();

    expect(lifecycle.register(teardown)).toBe(false);
    expect(teardown).toHaveBeenCalledOnce();
  });

  it("runs registered teardown exactly once",()=>{
    const lifecycle=createGraphLifecycle();
    const teardown=vi.fn();
    expect(lifecycle.register(teardown)).toBe(true);

    lifecycle.dispose();
    lifecycle.dispose();

    expect(teardown).toHaveBeenCalledOnce();
  });

  it("uses a synchronous layout so disposal cannot race an animation frame",()=>{
    expect(graphLayoutOptions("cose")).toEqual({
      name:"cose",
      animate:false,
      padding:70
    });
  });
});

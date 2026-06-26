import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarketDataService } from "../services/MarketDataService";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("MarketDataService", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should retrieve USD-BRL exchange rate and log details", async () => {
    // Mock fetch for AwesomeAPI
    const mockResponse = {
      USDBRL: {
        bid: "5.4321",
        ask: "5.4330",
      },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const rate = await MarketDataService.getUsdBrl();

    expect(rate).toBe(5.4321);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        usdbrl: 5.4321,
        source: "AwesomeAPI",
      })
    );
  });

  it("should retrieve Yahoo stock quote using fallback and log details", async () => {
    // Mock fetch to fail to force fallback
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    // Mock supabase function invoke for yahoo quote
    const mockInvokeResponse = {
      data: {
        result: {
          price: 175.50,
          symbol: "AAPL",
          provider: "yahoo",
        },
      },
      error: null,
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue(mockInvokeResponse as any);

    const price = await MarketDataService.getQuote("AAPL");

    expect(price).toBe(175.50);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        marketPrice: 175.50,
        source: "Yahoo Finance",
      })
    );
  });

  it("should retrieve multiple quotes and compile them into a dictionary", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({
        data: { result: { price: 175.50, symbol: "AAPL", provider: "yahoo" } },
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: { result: { price: 150.25, symbol: "GOOGL", provider: "yahoo" } },
        error: null,
      } as any);

    const quotes = await MarketDataService.getMultipleQuotes(["AAPL", "GOOGL"]);

    expect(quotes).toEqual({
      AAPL: 175.50,
      GOOGL: 150.25,
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        marketPrice: 175.50,
        source: "Yahoo Finance",
      })
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "GOOGL",
        marketPrice: 150.25,
        source: "Yahoo Finance",
      })
    );
  });
});

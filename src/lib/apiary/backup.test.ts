import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBackup, parseBackup } from "./backup";
import { APP_ID, DATA_VERSION, EMPTY_STATE } from "./types";

describe("parseBackup", () => {
  it("accepts a notebook exported by the previous app", () => {
    const raw = JSON.stringify({
      app: "mi-apiario",
      version: 1,
      exportedAt: "2026-09-01T00:00:00.000Z",
      data: {
        apiaries: [
          {
            id: "a1",
            name: "La Dehesa",
            location: "Loja",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
        colonies: [],
        queens: [],
        actions: [],
        production: [],
      },
    });
    const state = parseBackup(raw);
    assert.equal(state.apiaries[0]?.name, "La Dehesa");
    assert.deepEqual(state.health, []);
    assert.deepEqual(state.yearCloses, []);
  });

  it("keeps optional holding, treatment and lot fields", () => {
    const raw = JSON.stringify({
      app: "apiario",
      version: 2,
      exportedAt: "2026-10-03T00:00:00.000Z",
      data: {
        ...EMPTY_STATE,
        holding: { rega: "ES123", mode: "stationary" },
        health: [
          {
            id: "h1",
            colonyId: "c1",
            topic: "varroa",
            kind: "treatment",
            date: "2026-09-01",
            endDate: "2026-09-15",
            product: "Amitraz (tiras)",
            dose: "1 tira",
            withdrawalDays: 0,
            createdAt: "2026-09-01T00:00:00.000Z",
          },
        ],
        production: [
          {
            id: "p1",
            product: "honey",
            date: "2026-08-01",
            quantity: 12,
            lot: "M-1",
            apiaryId: "a1",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        ],
      },
    });
    const state = parseBackup(raw);
    assert.equal(state.holding?.rega, "ES123");
    assert.equal(state.health[0]?.withdrawalDays, 0);
    assert.equal(state.production[0]?.apiaryId, "a1");
  });

  it("exports with the compatible app id", () => {
    const file = buildBackup(EMPTY_STATE);
    assert.equal(file.app, APP_ID);
    assert.equal(file.version, DATA_VERSION);
  });

  it("rejects a foreign file", () => {
    assert.throws(
      () =>
        parseBackup(
          JSON.stringify({
            app: "otro",
            version: 1,
            exportedAt: "2026-01-01",
            data: EMPTY_STATE,
          }),
        ),
      /Apiario/,
    );
  });
});

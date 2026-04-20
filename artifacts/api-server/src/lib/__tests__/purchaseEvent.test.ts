import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildVerifyDirectSessionPurchaseEvent,
  buildWebhookPurchaseEvent,
} from "../purchaseEvent.js";
import { purchaseEventId } from "../fbCapi.js";

function makeFakeSession(overrides: Record<string, any> = {}) {
  return {
    id: "cs_test_abc123",
    payment_status: "paid",
    amount_total: 9990,
    currency: "brl",
    customer: { id: "cus_xyz", email: "buyer@example.com", phone: "+5511999999999" },
    customer_details: { email: "buyer@example.com", phone: "+5511999999999" },
    metadata: { userId: "42", source: "pdvd" },
    subscription: {
      id: "sub_1",
      items: {
        data: [
          {
            price: {
              id: "price_1",
              unit_amount: 9990,
              currency: "brl",
              product: { name: "Plano PDVD" },
            },
          },
        ],
      },
    },
    ...overrides,
  };
}

describe("purchaseEventId helper", () => {
  it("is deterministic for the same session id", () => {
    assert.equal(purchaseEventId("cs_test_abc123"), "purchase_cs_test_abc123");
    assert.equal(purchaseEventId("cs_test_abc123"), purchaseEventId("cs_test_abc123"));
  });
});

describe("Purchase event_id dedup between webhook and verify-direct-session", () => {
  it("webhook handler builds event_id = purchase_<sessionId> (case: only webhook fires)", () => {
    const session = makeFakeSession();
    const event = buildWebhookPurchaseEvent(session);
    assert.ok(event, "webhook event should be built for paid session");
    assert.equal(event!.eventId, `purchase_${session.id}`);
    assert.equal(event!.eventName, "Purchase");
  });

  it("verify-direct-session builds event_id = purchase_<sessionId> when client passes no eventId", () => {
    const session = makeFakeSession();
    const event = buildVerifyDirectSessionPurchaseEvent(session, {
      user: { id: 42, email: "buyer@example.com", telefone: "+5511999999999" },
    });
    assert.equal(event.eventId, `purchase_${session.id}`);
    assert.equal(event.eventName, "Purchase");
  });

  it("both paths produce the SAME event_id for the same session (case: both fire — must dedup)", () => {
    const session = makeFakeSession();
    const webhookEvent = buildWebhookPurchaseEvent(session);
    const verifyEvent = buildVerifyDirectSessionPurchaseEvent(session, {
      user: { id: 42, email: "buyer@example.com", telefone: null },
    });
    assert.ok(webhookEvent);
    assert.equal(webhookEvent!.eventId, verifyEvent.eventId);
    assert.equal(webhookEvent!.eventId, purchaseEventId(session.id));
  });

  it("verify-direct-session honors a client-provided eventId (browser pixel <-> CAPI dedup)", () => {
    const session = makeFakeSession();
    const clientEventId = `purchase_${session.id}`;
    const event = buildVerifyDirectSessionPurchaseEvent(session, {
      user: { id: 42, email: "buyer@example.com" },
      clientEventId,
    });
    assert.equal(event.eventId, clientEventId);
    const webhookEvent = buildWebhookPurchaseEvent(session);
    assert.equal(event.eventId, webhookEvent!.eventId);
  });

  it("webhook handler returns null when payment is not paid (no Purchase reported)", () => {
    const session = makeFakeSession({ payment_status: "unpaid" });
    const event = buildWebhookPurchaseEvent(session);
    assert.equal(event, null);
  });

  it("event_id stays stable across multiple invocations for the same session", () => {
    const session = makeFakeSession();
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const w = buildWebhookPurchaseEvent(session)!;
      const v = buildVerifyDirectSessionPurchaseEvent(session, {
        user: { id: 42, email: "buyer@example.com" },
      });
      ids.add(w.eventId!);
      ids.add(v.eventId!);
    }
    assert.equal(ids.size, 1, `expected 1 unique event_id, got ${[...ids].join(", ")}`);
  });
});

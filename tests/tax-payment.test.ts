import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, uintCV } from "@stacks/transactions";
const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROPERTY_ID = 101;
const ERR_INVALID_AMOUNT = 102;
const ERR_INVALID_CURRENCY = 110;
const ERR_PAYMENT_ALREADY_EXISTS = 104;
const ERR_PAYMENT_WINDOW_CLOSED = 109;
interface Payment {
  propertyId: string;
  payer: string;
  amount: number;
  timestamp: number;
  currency: string;
  dueDate: number;
  status: boolean;
}
interface PropertyPayments {
  totalPaid: number;
  lastPayment: number;
  paymentCount: number;
  isCompliant: boolean;
}
interface PaymentFees {
  feePaid: number;
  feeTimestamp: number;
}
interface Result<T> {
  ok: boolean;
  value: T;
}
class TaxPaymentMock {
  state: {
    paymentCounter: number;
    paymentFee: number;
    authorityContract: string | null;
    payments: Map<number, Payment>;
    propertyPayments: Map<string, PropertyPayments>;
    paymentFees: Map<string, PaymentFees>;
  } = {
    paymentCounter: 0,
    paymentFee: 50,
    authorityContract: null,
    payments: new Map(),
    propertyPayments: new Map(),
    paymentFees: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  constructor() {
    this.reset();
  }
  reset() {
    this.state = {
      paymentCounter: 0,
      paymentFee: 50,
      authorityContract: null,
      payments: new Map(),
      propertyPayments: new Map(),
      paymentFees: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }
  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }
  setPaymentFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newFee < 0) return { ok: false, value: false };
    this.state.paymentFee = newFee;
    return { ok: true, value: true };
  }
  propertyExists(propertyId: string): Result<boolean> {
    return { ok: true, value: true };
  }
  logPaymentHistory(propertyId: string, payId: number, amt: number, ts: number): Result<boolean> {
    return { ok: true, value: true };
  }
  updateCompliance(propertyId: string): Result<boolean> {
    return { ok: true, value: true };
  }
  recordPayment(
    propertyId: string,
    amount: number,
    currency: string,
    dueDate: number
  ): Result<number> {
    if (propertyId.length === 0 || propertyId.length > 34) return { ok: false, value: ERR_INVALID_PROPERTY_ID };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (this.blockHeight > dueDate) return { ok: false, value: ERR_PAYMENT_WINDOW_CLOSED };
    if (!this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const paymentId = this.state.paymentCounter;
    if (this.state.payments.has(paymentId)) return { ok: false, value: ERR_PAYMENT_ALREADY_EXISTS };
    let propPayments = this.state.propertyPayments.get(propertyId);
    if (propPayments) {
      this.state.propertyPayments.set(propertyId, {
        totalPaid: propPayments.totalPaid + amount,
        lastPayment: this.blockHeight,
        paymentCount: propPayments.paymentCount + 1,
        isCompliant: true
      });
    } else {
      this.state.propertyPayments.set(propertyId, {
        totalPaid: amount,
        lastPayment: this.blockHeight,
        paymentCount: 1,
        isCompliant: true
      });
    }
    this.state.payments.set(paymentId, {
      propertyId,
      payer: this.caller,
      amount,
      timestamp: this.blockHeight,
      currency,
      dueDate,
      status: true
    });
    this.state.paymentFees.set(propertyId, {
      feePaid: this.state.paymentFee,
      feeTimestamp: this.blockHeight
    });
    this.stxTransfers.push({ amount: this.state.paymentFee, from: this.caller, to: this.state.authorityContract });
    this.state.paymentCounter++;
    return { ok: true, value: paymentId };
  }
  refundPayment(paymentId: number): Result<boolean> {
    const payment = this.state.payments.get(paymentId);
    if (!payment) return { ok: false, value: false };
    if (payment.payer !== this.caller) return { ok: false, value: false };
    if (!payment.status) return { ok: false, value: false };
    const propId = payment.propertyId;
    const propPayments = this.state.propertyPayments.get(propId);
    if (propPayments) {
      if (propPayments.totalPaid > payment.amount) {
        this.state.propertyPayments.set(propId, {
          totalPaid: propPayments.totalPaid - payment.amount,
          lastPayment: propPayments.lastPayment,
          paymentCount: propPayments.paymentCount - 1,
          isCompliant: propPayments.totalPaid - payment.amount > 0
        });
      } else {
        this.state.propertyPayments.delete(propId);
      }
    }
    payment.status = false;
    this.stxTransfers.push({ amount: payment.amount, from: "SP000000000000000000002Q6VF78", to: this.caller });
    return { ok: true, value: true };
  }
  getPayment(paymentId: number): Payment | null {
    return this.state.payments.get(paymentId) || null;
  }
  getPropertyPayments(propertyId: string): PropertyPayments | null {
    return this.state.propertyPayments.get(propertyId) || null;
  }
  getPaymentFees(propertyId: string): PaymentFees | null {
    return this.state.paymentFees.get(propertyId) || null;
  }
  getPaymentCount(): Result<number> {
    return { ok: true, value: this.state.paymentCounter };
  }
}
describe("TaxPayment", () => {
  let contract: TaxPaymentMock;
  beforeEach(() => {
    contract = new TaxPaymentMock();
    contract.reset();
  });
  it("rejects invalid property ID", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.recordPayment("", 5000, "STX", contract.blockHeight + 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROPERTY_ID);
  });
  it("rejects invalid amount", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.recordPayment("PROP001", 0, "STX", contract.blockHeight + 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });
  it("rejects invalid currency", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.recordPayment("PROP001", 5000, "INVALID", contract.blockHeight + 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CURRENCY);
  });
  it("rejects payment window closed", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.blockHeight = 20;
    const result = contract.recordPayment("PROP001", 5000, "STX", 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PAYMENT_WINDOW_CLOSED);
  });
  it("rejects without authority contract", () => {
    const result = contract.recordPayment("PROP001", 5000, "STX", contract.blockHeight + 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });
  it("rejects refund for non-payer", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.recordPayment("PROP001", 5000, "STX", contract.blockHeight + 10);
    contract.caller = "ST3FAKE";
    const result = contract.refundPayment(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
  it("parses parameters with Clarity types", () => {
    const propId = stringAsciiCV("PROP001");
    const amount = uintCV(5000);
    const dueDate = uintCV(10);
    expect(propId.value).toBe("PROP001");
    expect(amount.value).toEqual(BigInt(5000));
    expect(dueDate.value).toEqual(BigInt(10));
  });
});
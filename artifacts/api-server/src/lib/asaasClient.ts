export type AsaasAmbiente = "sandbox" | "producao";

const BASE_URLS: Record<AsaasAmbiente, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  producao: "https://api.asaas.com/v3",
};

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
}

export interface AsaasCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}

export interface AsaasPaymentInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  postalService?: boolean;
  split?: AsaasSplit[];
  callback?: { successUrl?: string; autoRedirect?: boolean };
}

export interface AsaasSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "BIWEEKLY" | "QUARTERLY" | "SEMIANNUALLY";
  description?: string;
  externalReference?: string;
  endDate?: string;
}

export interface AsaasWebhookInput {
  url: string;
  email?: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion: 3;
  authToken?: string;
  events: string[];
}

export class AsaasError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface AsaasClientOpts {
  apiKey: string;
  ambiente?: AsaasAmbiente;
  userAgent?: string;
}

export function createAsaasClient({ apiKey, ambiente = "sandbox", userAgent = "GlowUpi/1.0" }: AsaasClientOpts) {
  const baseUrl = BASE_URLS[ambiente];

  async function request<T>(method: string, path: string, body?: any, query?: Record<string, any>): Promise<T> {
    let url = `${baseUrl}${path}`;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
      }
      const qstr = qs.toString();
      if (qstr) url += `?${qstr}`;
    }
    const headers: Record<string, string> = {
      "access_token": apiKey,
      "User-Agent": userAgent,
      "Accept": "application/json",
    };
    let bodyStr: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyStr = JSON.stringify(body);
    }
    const res = await fetch(url, { method, headers, body: bodyStr });
    let json: any = null;
    const text = await res.text();
    if (text) {
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
    }
    if (!res.ok) {
      const msg = json?.errors?.[0]?.description || json?.message || `Asaas ${res.status}`;
      throw new AsaasError(msg, res.status, json);
    }
    return json as T;
  }

  return {
    async getMyAccount() {
      return request<any>("GET", "/myAccount");
    },
    async getWallet() {
      return request<any>("GET", "/wallets");
    },
    async findCustomerByExternalRef(externalReference: string) {
      const data = await request<any>("GET", "/customers", undefined, { externalReference, limit: 1 });
      return data?.data?.[0] || null;
    },
    async createCustomer(input: AsaasCustomerInput) {
      return request<any>("POST", "/customers", input);
    },
    async upsertCustomer(input: AsaasCustomerInput): Promise<any> {
      if (input.externalReference) {
        const existing = await this.findCustomerByExternalRef(input.externalReference);
        if (existing?.id) return existing;
      }
      return this.createCustomer(input);
    },
    async createPayment(input: AsaasPaymentInput) {
      return request<any>("POST", "/payments", input);
    },
    async getPayment(id: string) {
      return request<any>("GET", `/payments/${id}`);
    },
    async getPixQrCode(id: string) {
      return request<any>("GET", `/payments/${id}/pixQrCode`);
    },
    async getIdentificationField(id: string) {
      return request<any>("GET", `/payments/${id}/identificationField`);
    },
    async deletePayment(id: string) {
      return request<any>("DELETE", `/payments/${id}`);
    },
    async createSubscription(input: AsaasSubscriptionInput) {
      return request<any>("POST", "/subscriptions", input);
    },
    async getSubscription(id: string) {
      return request<any>("GET", `/subscriptions/${id}`);
    },
    async cancelSubscription(id: string) {
      return request<any>("DELETE", `/subscriptions/${id}`);
    },
    async listWebhooks() {
      return request<any>("GET", "/webhooks");
    },
    async createWebhook(input: AsaasWebhookInput) {
      return request<any>("POST", "/webhooks", input);
    },
    async deleteWebhook(id: string) {
      return request<any>("DELETE", `/webhooks/${id}`);
    },
    raw: { request },
  };
}

export type AsaasClient = ReturnType<typeof createAsaasClient>;

export function platformAsaasClient(): AsaasClient {
  const apiKey = process.env.ASAAS_API_KEY || process.env.ASAAS_PLATFORM_API_KEY || process.env.ASAAS_SANDBOX_API_KEY || "";
  const isProd = !!(process.env.ASAAS_API_KEY || process.env.ASAAS_PLATFORM_API_KEY);
  const ambiente: AsaasAmbiente = isProd ? "producao" : "sandbox";
  if (!apiKey) throw new Error("ASAAS_API_KEY (ou ASAAS_SANDBOX_API_KEY) não configurado");
  return createAsaasClient({ apiKey, ambiente });
}

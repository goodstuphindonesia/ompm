"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { signIn, signOut as signOutWithAuth, useSession } from "next-auth/react";

type Role = "user" | "admin" | "reviewer";
type View = "register" | "login" | "vendors" | "estimates" | "payments";

type Session = {
  name: string;
  role: Role;
};

type Vendor = {
  id: string;
  createdAt: string;
  vendorName: string;
  picName: string;
  picContactNumber: string;
  email: string;
  bankAccountName: string;
  bankAccountAddress: string;
  bankName: string;
  bankAccountNumber: string;
  bankAddress: string;
  swiftCode: string;
  npwpNumber: string;
  ktpUpload: null | {
    name: string;
    size: number;
    type: string;
  };
};

type VendorDraft = Omit<Vendor, "id" | "createdAt">;

type ExternalLine = {
  id: string;
  item: string;
  description: string;
  supplierName: string;
  invoiceNumber: string;
  estimatedCost: string;
  billedAmount: string;
  actualCost: string;
  remarks: string;
};

type InternalLine = {
  id: string;
  item: string;
  description: string;
  cost: string;
  units: string;
};

type EstimateStatus = "Draft" | "Submitted for Approval" | "Approved" | "Rejected";

type Estimate = {
  id: string;
  clientName: string;
  clientAddress: string;
  attentionName: string;
  contactNumber: string;
  jobNumber: string;
  estimateNumber: string;
  campaignPeriod: string;
  estimateDate: string;
  currency: string;
  version: string;
  projectTitle: string;
  paymentTerms: string;
  preparedBy: string;
  externalLines: ExternalLine[];
  internalLines: InternalLine[];
  status: EstimateStatus;
  xeroStatus: string;
  createdAt: string;
  updatedAt: string;
};

type PaymentStatus = "Submitted" | "Approved" | "Rejected";

type PaymentRequest = {
  id: string;
  vendorId: string;
  vendorName: string;
  estimateId: string;
  estimateLabel: string;
  jobNumber: string;
  projectTitle: string;
  currency: string;
  subtotal: string;
  pph: string;
  ppn: string;
  dueDate: string;
  invoiceNumber: string;
  attributionLineId: string;
  reviewerNote: string;
  amount: number;
  status: PaymentStatus;
  submittedBy: string;
  reviewedBy: string;
  adminEmailPreview: string;
  createdAt: string;
  updatedAt: string;
};

const storageKeys = {
  vendors: "finance-platform-vendors",
  estimates: "finance-platform-estimates",
  payments: "finance-platform-payment-requests"
};

const currencyOptions = ["SGD", "IDR", "USD"];
const allowedEmailDomain = "goodstuph.org";
const adminEmails = parseEmailList(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "");
const reviewerEmails = parseEmailList(process.env.NEXT_PUBLIC_REVIEWER_EMAILS || "");

const emptyVendor: VendorDraft = {
  vendorName: "",
  picName: "",
  picContactNumber: "",
  email: "",
  bankAccountName: "",
  bankAccountAddress: "",
  bankName: "",
  bankAccountNumber: "",
  bankAddress: "",
  swiftCode: "",
  npwpNumber: "",
  ktpUpload: null
};

function id() {
  return crypto.randomUUID();
}

function parseEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedEmail(email: string) {
  return email.toLowerCase().endsWith(`@${allowedEmailDomain}`);
}

function roleForEmail(email: string): Role {
  const normalized = email.toLowerCase();

  if (adminEmails.includes(normalized)) {
    return "admin";
  }

  if (reviewerEmails.includes(normalized)) {
    return "reviewer";
  }

  return "user";
}

function sessionFromUser(user: { email?: string | null; name?: string | null }): Session | null {
  const email = user.email;

  if (!email || !isAllowedEmail(email)) {
    return null;
  }

  return {
    name: user.name || email,
    role: roleForEmail(email)
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number, currency = "SGD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency
  }).format(numberValue(value));
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "N.A.";
  return new Intl.NumberFormat("en", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function externalProfit(line: ExternalLine) {
  return numberValue(line.billedAmount) - numberValue(line.estimatedCost);
}

function externalMargin(line: ExternalLine) {
  const billed = numberValue(line.billedAmount);
  return billed > 0 ? externalProfit(line) / billed : Number.NaN;
}

function internalBilled(line: InternalLine) {
  return numberValue(line.cost) * numberValue(line.units);
}

function estimateLabel(estimate: Estimate) {
  return `${estimate.jobNumber || "No job number"} - ${estimate.projectTitle || "Untitled"}`;
}

function newExternalLine(): ExternalLine {
  return {
    id: id(),
    item: "",
    description: "",
    supplierName: "",
    invoiceNumber: "",
    estimatedCost: "",
    billedAmount: "",
    actualCost: "",
    remarks: ""
  };
}

function newInternalLine(): InternalLine {
  return {
    id: id(),
    item: "",
    description: "",
    cost: "",
    units: ""
  };
}

function blankEstimate(session?: Session | null): Estimate {
  const now = new Date().toISOString();
  return {
    id: "",
    clientName: "",
    clientAddress: "",
    attentionName: "",
    contactNumber: "",
    jobNumber: "",
    estimateNumber: "",
    campaignPeriod: "",
    estimateDate: today(),
    currency: "SGD",
    version: "1",
    projectTitle: "",
    paymentTerms: "",
    preparedBy: session?.name || "",
    externalLines: [newExternalLine()],
    internalLines: [newInternalLine()],
    status: "Draft",
    xeroStatus: "Not ready",
    createdAt: now,
    updatedAt: now
  };
}

function blankPayment(): PaymentRequest {
  const now = new Date().toISOString();
  return {
    id: "",
    vendorId: "",
    vendorName: "",
    estimateId: "",
    estimateLabel: "",
    jobNumber: "",
    projectTitle: "",
    currency: "SGD",
    subtotal: "",
    pph: "0",
    ppn: "0",
    dueDate: "",
    invoiceNumber: "",
    attributionLineId: "",
    reviewerNote: "",
    amount: 0,
    status: "Submitted",
    submittedBy: "",
    reviewedBy: "",
    adminEmailPreview: "",
    createdAt: now,
    updatedAt: now
  };
}

function useLocalStorageState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
    } finally {
      setHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(key, JSON.stringify(value));
  }, [hydrated, key, value]);

  return [value, setValue, hydrated] as const;
}

function estimateTotals(estimate: Estimate) {
  const external = estimate.externalLines.reduce(
    (totals, line) => {
      totals.estimatedCost += numberValue(line.estimatedCost);
      totals.billed += numberValue(line.billedAmount);
      totals.actualCost += numberValue(line.actualCost);
      totals.profit += externalProfit(line);
      return totals;
    },
    { estimatedCost: 0, billed: 0, actualCost: 0, profit: 0 }
  );

  const internal = estimate.internalLines.reduce(
    (totals, line) => {
      totals.billed += internalBilled(line);
      return totals;
    },
    { billed: 0 }
  );

  const amountToBeBilled = external.billed + internal.billed;
  const totalProfit = external.profit + internal.billed;

  return {
    external,
    internal,
    amountToBeBilled,
    totalProfit,
    grossMargin: amountToBeBilled > 0 ? totalProfit / amountToBeBilled : Number.NaN
  };
}

function paymentAmount(payment: PaymentRequest) {
  return numberValue(payment.subtotal) - numberValue(payment.pph) + numberValue(payment.ppn);
}

export default function Home() {
  const pathname = usePathname();
  const isInternalRoute = pathname.startsWith("/internal");
  const [vendors, setVendors] = useLocalStorageState<Vendor[]>(storageKeys.vendors, []);
  const [estimates, setEstimates] = useLocalStorageState<Estimate[]>(storageKeys.estimates, []);
  const [payments, setPayments] = useLocalStorageState<PaymentRequest[]>(storageKeys.payments, []);
  const [session, setSession] = useState<Session | null>(null);
  const { data: authSession, status: authState } = useSession();

  const [view, setView] = useState<View>("register");
  const [vendorForm, setVendorForm] = useState(emptyVendor);
  const [vendorErrors, setVendorErrors] = useState<string[]>([]);
  const [vendorStatus, setVendorStatus] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [estimate, setEstimate] = useState<Estimate>(() => blankEstimate());
  const [estimateStatus, setEstimateStatus] = useState("");
  const [estimateErrors, setEstimateErrors] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentRequest>(() => blankPayment());
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentErrors, setPaymentErrors] = useState<string[]>([]);
  const [emailPreview, setEmailPreview] = useState("No approved payment selected.");

  useEffect(() => {
    setEstimate((current) => (current.preparedBy ? current : { ...current, preparedBy: session?.name || "" }));
  }, [session]);

  useEffect(() => {
    if (!isInternalRoute) return;

    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "AccessDenied") {
      setAuthStatus(`Access is restricted to ${allowedEmailDomain} Google accounts.`);
    }
  }, [isInternalRoute]);

  useEffect(() => {
    if (!isInternalRoute) return;

    if (authState === "loading") {
      return;
    }

    const nextSession = sessionFromUser(authSession?.user || {});

    if (!nextSession) {
      setSession(null);
      setView("login");
      if (authState === "authenticated") {
        setAuthStatus(`Access is restricted to ${allowedEmailDomain} Google accounts.`);
        void signOutWithAuth({ redirect: false });
      }
      return;
    }

    setSession(nextSession);
    setAuthStatus("");
    setEstimate((current) => ({ ...current, preparedBy: current.preparedBy || nextSession.name }));
    if (view === "login" || view === "register") {
      setView("estimates");
    }
  }, [authSession, authState, isInternalRoute, view]);

  const submittedEstimates = useMemo(
    () => estimates.filter((item) => ["Submitted for Approval", "Approved"].includes(item.status)),
    [estimates]
  );

  const clientHistory = useMemo(
    () => estimates.filter((item) => item.status !== "Draft" && item.clientName),
    [estimates]
  );

  const selectedPaymentEstimate = estimates.find((item) => item.id === payment.estimateId);
  const selectedPaymentVendor = vendors.find((item) => item.id === payment.vendorId);
  const selectedAttributionLine = selectedPaymentEstimate?.externalLines.find(
    (line) => line.id === payment.attributionLineId
  );
  const currentEstimateTotals = estimateTotals(estimate);
  const currentPaymentAmount = paymentAmount(payment);

  useEffect(() => {
    if (!isInternalRoute && view !== "register") {
      setView("register");
    }

    if (isInternalRoute && view === "register") {
      setView(session ? "estimates" : "login");
    }
  }, [isInternalRoute, session, view]);

  function go(nextView: View) {
    if (!isInternalRoute && nextView !== "register") {
      return;
    }

    if (["vendors", "estimates", "payments"].includes(nextView) && !session) {
      setView("login");
      return;
    }
    setView(nextView);
  }

  function validateVendor() {
    const errors: string[] = [];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9][0-9\s().-]{6,20}$/;
    const bankAccountPattern = /^[0-9 -]{5,34}$/;
    const swiftPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

    [
      ["Company / individual name", vendorForm.vendorName],
      ["Person in charge name", vendorForm.picName],
      ["PIC contact number", vendorForm.picContactNumber],
      ["Email address", vendorForm.email],
      ["Bank account name", vendorForm.bankAccountName],
      ["Address as per bank account", vendorForm.bankAccountAddress],
      ["Bank name", vendorForm.bankName],
      ["Bank account number", vendorForm.bankAccountNumber],
      ["Bank address", vendorForm.bankAddress],
      ["SWIFT code", vendorForm.swiftCode]
    ].forEach(([label, value]) => {
      if (!String(value).trim()) errors.push(`${label} is required.`);
    });

    if (vendorForm.email && !emailPattern.test(vendorForm.email)) errors.push("Enter a valid email address.");
    if (vendorForm.picContactNumber && !phonePattern.test(vendorForm.picContactNumber)) {
      errors.push("Enter a valid contact number.");
    }
    if (vendorForm.bankAccountNumber && !bankAccountPattern.test(vendorForm.bankAccountNumber)) {
      errors.push("Use 5-34 digits, spaces, or hyphens for the bank account number.");
    }
    if (vendorForm.swiftCode && !swiftPattern.test(vendorForm.swiftCode.toUpperCase())) {
      errors.push("Enter a valid 8 or 11 character SWIFT/BIC code.");
    }
    if (vendorForm.npwpNumber && digits(vendorForm.npwpNumber).length !== 16) {
      errors.push("NPWP must be exactly 16 digits.");
    }
    if (!digits(vendorForm.npwpNumber) && !vendorForm.ktpUpload) {
      errors.push("Upload KTP when NPWP is unavailable.");
    }

    return errors;
  }

  function submitVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateVendor();
    setVendorErrors(errors);
    if (errors.length) {
      setVendorStatus("Please fix the highlighted details.");
      return;
    }

    const confirmed = window.confirm(
      "I confirm that the information submitted is true and correct. Any mistake will result in a delay in the disbursement of payments"
    );

    if (!confirmed) {
      setVendorStatus("Submission cancelled.");
      return;
    }

    const newVendor: Vendor = {
      ...vendorForm,
      id: id(),
      createdAt: new Date().toISOString(),
      email: normalize(vendorForm.email).toLowerCase(),
      swiftCode: normalize(vendorForm.swiftCode).toUpperCase(),
      npwpNumber: digits(vendorForm.npwpNumber)
    };
    setVendors([newVendor, ...vendors]);
    setVendorForm(emptyVendor);
    setVendorStatus("Vendor registration submitted.");
  }

  async function signInWithGoogle() {
    setAuthStatus("");
    await signIn("google", { callbackUrl: "/internal" });
  }

  async function signOut() {
    await signOutWithAuth({ callbackUrl: "/internal" });
    setSession(null);
    setView("login");
  }

  function saveEstimate(status: EstimateStatus, xeroStatus = estimate.xeroStatus) {
    const errors: string[] = [];
    if (status === "Submitted for Approval") {
      if (!estimate.clientName) errors.push("Client is required.");
      if (!estimate.projectTitle) errors.push("Project title is required.");
      if (!estimate.estimateDate) errors.push("Date is required.");
      if (currentEstimateTotals.amountToBeBilled <= 0) errors.push("Amount to be billed must be greater than zero.");
      if (session?.role !== "admin") errors.push("Only admin users can submit for approval.");
    }

    setEstimateErrors(errors);
    if (errors.length) {
      setEstimateStatus("Please fix the estimate before continuing.");
      return;
    }

    const now = new Date().toISOString();
    const nextEstimate: Estimate = {
      ...estimate,
      id: estimate.id || id(),
      status,
      xeroStatus,
      createdAt: estimate.createdAt || now,
      updatedAt: now
    };
    setEstimate(nextEstimate);
    setEstimates((items) => {
      const exists = items.some((item) => item.id === nextEstimate.id);
      return exists ? items.map((item) => (item.id === nextEstimate.id ? nextEstimate : item)) : [nextEstimate, ...items];
    });
    setEstimateStatus(status === "Draft" ? "Draft saved." : `Estimate moved to ${status}.`);
  }

  function loadClientDetails(clientName: string) {
    const found = clientHistory.find((item) => item.clientName.toLowerCase() === clientName.toLowerCase());
    if (!found) return;
    setEstimate((current) => ({
      ...current,
      clientName,
      clientAddress: found.clientAddress,
      attentionName: found.attentionName,
      contactNumber: found.contactNumber,
      paymentTerms: found.paymentTerms
    }));
    setEstimateStatus("Loaded client details from past submitted data.");
  }

  function updateExternalLine(lineId: string, patch: Partial<ExternalLine>) {
    setEstimate((current) => ({
      ...current,
      externalLines: current.externalLines.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    }));
  }

  function updateInternalLine(lineId: string, patch: Partial<InternalLine>) {
    setEstimate((current) => ({
      ...current,
      internalLines: current.internalLines.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    }));
  }

  function buildEmailPreview(nextPayment: PaymentRequest) {
    const vendor = vendors.find((item) => item.id === nextPayment.vendorId);
    const line = selectedPaymentEstimate?.externalLines.find((item) => item.id === nextPayment.attributionLineId);
    return [
      "To: Admin",
      "Subject: Approved vendor payment request",
      "",
      `Vendor: ${vendor?.vendorName || nextPayment.vendorName}`,
      `Bank account: ${vendor?.bankAccountNumber || ""}`,
      `Bank account name: ${vendor?.bankAccountName || ""}`,
      `Amount: ${money(nextPayment.amount, nextPayment.currency)}`,
      `Invoice no.: ${nextPayment.invoiceNumber}`,
      `Due date: ${nextPayment.dueDate}`,
      `Attributed cost line: ${line?.supplierName || line?.item || "Not available"}`
    ].join("\n");
  }

  function validatePayment(forApproval = false, forRejection = false) {
    const errors: string[] = [];
    if (!payment.vendorId) errors.push("Vendor is required.");
    if (!payment.estimateId) errors.push("Job number / estimate is required.");
    if (numberValue(payment.subtotal) <= 0) errors.push("Subtotal must be greater than zero.");
    if (!payment.dueDate) errors.push("Due date is required.");
    if (!payment.invoiceNumber) errors.push("Invoice number is required.");
    if (currentPaymentAmount <= 0) errors.push("Final payable amount must be greater than zero.");
    if (forApproval && !payment.attributionLineId) {
      errors.push("Admin must attribute the payment to an external cost line before approval.");
    }
    if (forRejection && !payment.reviewerNote) errors.push("Add a note before rejecting the request.");
    return errors;
  }

  function savePayment(status: PaymentStatus) {
    const isApproval = status === "Approved";
    const isRejection = status === "Rejected";
    const existing = payments.find((item) => item.id === payment.id);
    const errors = validatePayment(isApproval, isRejection);
    if ((isApproval || isRejection) && session?.role !== "admin") {
      errors.push("Only admin users can approve or reject payment requests.");
    }
    if ((isApproval || isRejection) && existing?.status !== "Submitted") {
      errors.push("Only submitted payment requests can be reviewed.");
    }

    setPaymentErrors(errors);
    if (errors.length) {
      setPaymentStatus("Please fix the payment request before continuing.");
      return;
    }

    const now = new Date().toISOString();
    const estimateForPayment = estimates.find((item) => item.id === payment.estimateId);
    const vendorForPayment = vendors.find((item) => item.id === payment.vendorId);
    const nextPayment: PaymentRequest = {
      ...payment,
      id: payment.id || id(),
      vendorName: vendorForPayment?.vendorName || payment.vendorName,
      estimateLabel: estimateForPayment ? estimateLabel(estimateForPayment) : payment.estimateLabel,
      jobNumber: estimateForPayment?.jobNumber || "",
      projectTitle: estimateForPayment?.projectTitle || "",
      currency: estimateForPayment?.currency || payment.currency,
      amount: currentPaymentAmount,
      status,
      submittedBy: existing?.submittedBy || session?.name || "",
      reviewedBy: isApproval || isRejection ? session?.name || "" : existing?.reviewedBy || "",
      adminEmailPreview: "",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    nextPayment.adminEmailPreview = isApproval ? buildEmailPreview(nextPayment) : existing?.adminEmailPreview || "";

    setPayment(nextPayment);
    setPayments((items) => {
      const exists = items.some((item) => item.id === nextPayment.id);
      return exists ? items.map((item) => (item.id === nextPayment.id ? nextPayment : item)) : [nextPayment, ...items];
    });
    setEmailPreview(nextPayment.adminEmailPreview || "No approved payment selected.");
    setPaymentStatus(status === "Submitted" ? "Payment request submitted for review." : `Payment request ${status.toLowerCase()}.`);
  }

  function protectedButton(target: View, label: string) {
    if (!session) return null;
    if (!isInternalRoute) return null;
    return <NavButton active={view === target} onClick={() => go(target)}>{label}</NavButton>;
  }

  return (
    <main className="relative z-10 min-h-screen overflow-hidden text-stone-100">
      <section className="relative min-h-[92svh] overflow-hidden border-b border-red-300/10 px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="poster-drift absolute inset-x-[-16%] bottom-[-5%] top-[13%] bg-[url('/brand/osp-hero-poster.png')] bg-cover bg-center opacity-80 mix-blend-screen sm:inset-x-[-6%] sm:top-[8%]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(250,220,190,0.16),transparent_22%),linear-gradient(180deg,rgba(14,0,3,0.26)_0%,rgba(7,0,2,0.22)_45%,rgba(7,0,2,0.92)_100%)]" />
        </div>

        <header className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 overflow-hidden rounded-3xl border border-red-100/10 bg-[linear-gradient(135deg,rgba(20,0,5,0.94),rgba(120,9,20,0.82)_48%,rgba(6,0,3,0.92))] px-4 shadow-[0_18px_70px_rgba(40,0,8,0.45)] backdrop-blur-xl sm:px-5">
          <button
            className="group flex items-center gap-3 text-left"
            onClick={() => go(isInternalRoute ? (session ? "estimates" : "login") : "register")}
            type="button"
          >
            <img
              alt="GOODSTUPH Indonesia"
              className="h-11 w-11 shrink-0 rounded-full bg-red-50/95 object-contain p-1 shadow-[0_0_30px_rgba(255,40,52,0.22)] transition group-hover:scale-105"
              src="/brand/gsid-logo.png"
            />
            <span className="min-w-0">
              <span className="block text-xl font-black tracking-[0.28em] text-red-50 transition group-hover:text-red-200">O$P$</span>
              <span className="block truncate text-[10px] uppercase tracking-[0.35em] text-red-100/55">GOODSTUPH Indonesia</span>
            </span>
          </button>
          <nav className="flex min-w-0 max-w-[62vw] flex-nowrap justify-end gap-2 overflow-x-auto py-3 sm:max-w-none">
            {!isInternalRoute && <NavButton active={view === "register"} onClick={() => go("register")}>Register</NavButton>}
            {isInternalRoute && !session && <NavButton active={view === "login"} onClick={() => go("login")}>Login</NavButton>}
            {protectedButton("vendors", "Vendors")}
            {protectedButton("estimates", "Estimates")}
            {protectedButton("payments", "Payments")}
            {isInternalRoute && session && (
              <button
                className="shrink-0 whitespace-nowrap rounded-full border border-red-100/15 px-3 py-2 text-xs uppercase tracking-[0.22em] text-red-50/70 transition hover:border-red-100/40 hover:text-red-50"
                onClick={() => {
                  void signOut();
                }}
                type="button"
              >
                Logout
              </button>
            )}
          </nav>
        </header>

        <div
          className={
            isInternalRoute
              ? "mx-auto grid w-full max-w-none gap-8 pt-8 sm:pt-10"
              : "mx-auto grid max-w-7xl gap-8 pt-16 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-end"
          }
        >
          {!isInternalRoute && (
            <div className="reveal max-w-3xl">
              <p className="text-xs uppercase tracking-[0.5em] text-red-100/70">An internal tool by GOODSTUPH Indonesia</p>
              <h1 className="mt-5 text-6xl font-black tracking-[-0.04em] text-red-50 drop-shadow-[0_18px_35px_rgba(0,0,0,0.9)] sm:text-8xl lg:text-9xl">
                O$P$
              </h1>
              <p className="font-brush -mt-2 text-7xl font-black leading-none text-red-200/90 drop-shadow-[0_10px_30px_rgba(140,0,10,0.7)] sm:text-8xl lg:text-[10rem]">
                追债
              </p>
              <p className="mt-3 max-w-xl text-sm uppercase tracking-[0.35em] text-red-50/68 sm:text-base">
                Vendor Onboarding. Payment Processing.
              </p>
            </div>
          )}

          <div className={`reveal rounded-[2rem] border border-red-100/10 bg-black/38 p-4 shadow-ember backdrop-blur-xl sm:p-5 ${isInternalRoute ? "lg:p-7" : ""}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-red-100/50">current module</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">{viewTitle(view)}</h2>
              </div>
              <p className="rounded-full bg-red-950/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-red-50/70">
                {isInternalRoute ? (session ? `${session.name} / ${session.role}` : "internal") : "public"}
              </p>
            </div>
            {view === "register" && (
              <VendorRegistration
                errors={vendorErrors}
                form={vendorForm}
                onChange={setVendorForm}
                onSubmit={submitVendor}
                status={vendorStatus}
              />
            )}
            {view === "login" && (
              <LoginForm
                authStatus={authStatus}
                onSignIn={() => {
                  void signInWithGoogle();
                }}
              />
            )}
            {view === "vendors" && <VendorList vendors={vendors} />}
            {view === "estimates" && (
              <EstimateBuilder
                clientHistory={clientHistory}
                estimate={estimate}
                errors={estimateErrors}
                onAddExternal={() => setEstimate((current) => ({ ...current, externalLines: [...current.externalLines, newExternalLine()] }))}
                onAddInternal={() => setEstimate((current) => ({ ...current, internalLines: [...current.internalLines, newInternalLine()] }))}
                onChange={setEstimate}
                onLoad={setEstimate}
                onLoadClient={loadClientDetails}
                onSave={saveEstimate}
                onUpdateExternal={updateExternalLine}
                onUpdateInternal={updateInternalLine}
                saved={estimates}
                session={session}
                status={estimateStatus}
                totals={currentEstimateTotals}
              />
            )}
            {view === "payments" && (
              <PaymentRequests
                emailPreview={emailPreview}
                errors={paymentErrors}
                estimate={selectedPaymentEstimate}
                estimates={submittedEstimates}
                onChange={setPayment}
                onLoad={(request) => {
                  setPayment(request);
                  setEmailPreview(request.adminEmailPreview || "No approved payment selected.");
                }}
                onNew={() => {
                  setPayment(blankPayment());
                  setEmailPreview("No approved payment selected.");
                  setPaymentErrors([]);
                  setPaymentStatus("");
                }}
                onSave={savePayment}
                payment={payment}
                payments={payments}
                session={session}
                status={paymentStatus}
                vendor={selectedPaymentVendor}
                vendors={vendors}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function viewTitle(view: View) {
  const titles: Record<View, string> = {
    register: "Vendor Registration",
    login: "Internal Login",
    vendors: "Registered Vendors",
    estimates: "Cost Estimate Generator",
    payments: "Vendor Payment Request"
  };
  return titles[view];
}

function NavButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-xs uppercase tracking-[0.22em] transition ${
        active
          ? "border-red-100/40 bg-red-100/10 text-red-50"
          : "border-red-100/10 bg-black/15 text-red-50/60 hover:border-red-100/35 hover:text-red-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-red-100/10 bg-black/35 px-3 py-3 text-sm text-red-50 outline-none transition placeholder:text-red-100/25 focus:border-red-200/50";
const labelClass = "grid gap-2 text-xs uppercase tracking-[0.22em] text-red-50/62";
const sectionClass = "mt-5 rounded-2xl border border-red-100/10 bg-black/24 p-4";
const actionClass =
  "rounded-xl border border-red-100/15 bg-red-950/50 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-red-50 transition hover:border-red-100/45 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-35";

function VendorRegistration({
  errors,
  form,
  onChange,
  onSubmit,
  status
}: {
  errors: string[];
  form: VendorDraft;
  onChange: (next: VendorDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  status: string;
}) {
  function setField(name: Exclude<keyof VendorDraft, "ktpUpload">, value: string) {
    onChange({ ...form, [name]: value });
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company / Individual name" value={form.vendorName} onChange={(value) => setField("vendorName", value)} />
        <Field label="Person in charge" value={form.picName} onChange={(value) => setField("picName", value)} />
        <Field label="PIC contact number" value={form.picContactNumber} onChange={(value) => setField("picContactNumber", value)} />
        <Field label="Email address" type="email" value={form.email} onChange={(value) => setField("email", value)} />
        <Field label="Bank account name" value={form.bankAccountName} onChange={(value) => setField("bankAccountName", value)} />
        <Field label="Bank name" value={form.bankName} onChange={(value) => setField("bankName", value)} />
        <Field label="Bank account number" value={form.bankAccountNumber} onChange={(value) => setField("bankAccountNumber", value)} />
        <Field label="SWIFT code" value={form.swiftCode} onChange={(value) => setField("swiftCode", value.toUpperCase())} />
        <TextArea label="Address as per bank account" value={form.bankAccountAddress} onChange={(value) => setField("bankAccountAddress", value)} />
        <TextArea label="Bank address" value={form.bankAddress} onChange={(value) => setField("bankAddress", value)} />
        <Field label="NPWP number" value={form.npwpNumber} onChange={(value) => setField("npwpNumber", value)} />
        <label className={labelClass}>
          Upload KTP
          <input
            className={inputClass}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onChange({
                ...form,
                ktpUpload: file ? { name: file.name, size: file.size, type: file.type || "Unknown" } : null
              });
            }}
            type="file"
          />
        </label>
      </div>
      <Status errors={errors} status={status} />
      <button className={actionClass} type="submit">Submit registration</button>
    </form>
  );
}

function LoginForm({ authStatus, onSignIn }: { authStatus: string; onSignIn: () => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-red-100/10 bg-black/28 p-5">
        <p className="text-sm uppercase tracking-[0.28em] text-red-100/50">GOODSTUPH Google Login</p>
        <h3 className="mt-3 text-2xl font-black">Internal access only</h3>
        <p className="mt-2 text-sm leading-6 text-red-50/68">
          Sign in with your GOODSTUPH Google account. Access is restricted to email addresses ending in
          {" "}
          <span className="font-bold text-red-100">@goodstuph.org</span>.
        </p>
      </div>
      {authStatus && <p className="rounded-xl border border-red-200/20 bg-red-950/40 p-3 text-sm text-red-100">{authStatus}</p>}
      <button className={actionClass} onClick={onSignIn} type="button">
        Continue with Google
      </button>
    </div>
  );
}

function VendorList({ vendors }: { vendors: Vendor[] }) {
  if (!vendors.length) return <EmptyState>No vendors registered yet.</EmptyState>;
  return (
    <div className="grid gap-3">
      {vendors.map((vendor) => (
        <article className="rounded-2xl border border-red-100/10 bg-black/28 p-4" key={vendor.id}>
          <h3 className="text-lg font-black">{vendor.vendorName}</h3>
          <dl className="mt-3 grid gap-2 text-sm text-red-50/72">
            <Detail label="PIC" value={vendor.picName} />
            <Detail label="Contact" value={`${vendor.picContactNumber} / ${vendor.email}`} />
            <Detail label="Bank" value={`${vendor.bankName} - ${vendor.bankAccountNumber}`} />
            <Detail label="Account name" value={vendor.bankAccountName} />
            <Detail label="SWIFT" value={vendor.swiftCode} />
          </dl>
        </article>
      ))}
    </div>
  );
}

function EstimateBuilder({
  clientHistory,
  estimate,
  errors,
  onAddExternal,
  onAddInternal,
  onChange,
  onLoad,
  onLoadClient,
  onSave,
  onUpdateExternal,
  onUpdateInternal,
  saved,
  session,
  status,
  totals
}: {
  clientHistory: Estimate[];
  estimate: Estimate;
  errors: string[];
  onAddExternal: () => void;
  onAddInternal: () => void;
  onChange: (next: Estimate) => void;
  onLoad: (estimate: Estimate) => void;
  onLoadClient: (clientName: string) => void;
  onSave: (status: EstimateStatus, xeroStatus?: string) => void;
  onUpdateExternal: (lineId: string, patch: Partial<ExternalLine>) => void;
  onUpdateInternal: (lineId: string, patch: Partial<InternalLine>) => void;
  saved: Estimate[];
  session: Session | null;
  status: string;
  totals: ReturnType<typeof estimateTotals>;
}) {
  const clientNames = Array.from(new Set(clientHistory.map((item) => item.clientName).filter(Boolean)));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          datalist="client-options"
          label="Client"
          onBlur={() => onLoadClient(estimate.clientName)}
          onChange={(value) => onChange({ ...estimate, clientName: value })}
          value={estimate.clientName}
        />
        <TextArea label="Client address" value={estimate.clientAddress} onChange={(value) => onChange({ ...estimate, clientAddress: value })} />
        <Field label="Attention" value={estimate.attentionName} onChange={(value) => onChange({ ...estimate, attentionName: value })} />
        <Field label="Contact number" value={estimate.contactNumber} onChange={(value) => onChange({ ...estimate, contactNumber: value })} />
        <Field label="Job number" value={estimate.jobNumber} onChange={(value) => onChange({ ...estimate, jobNumber: value })} />
        <Field label="Estimate / invoice number" value={estimate.estimateNumber} onChange={(value) => onChange({ ...estimate, estimateNumber: value })} />
        <Field label="Campaign period" value={estimate.campaignPeriod} onChange={(value) => onChange({ ...estimate, campaignPeriod: value })} />
        <Field label="Date" type="date" value={estimate.estimateDate} onChange={(value) => onChange({ ...estimate, estimateDate: value })} />
        <label className={labelClass}>
          Currency
          <select className={inputClass} value={estimate.currency} onChange={(event) => onChange({ ...estimate, currency: event.target.value })}>
            {currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>
        <Field label="Version" value={estimate.version} onChange={(value) => onChange({ ...estimate, version: value })} />
        <Field label="Project title" value={estimate.projectTitle} onChange={(value) => onChange({ ...estimate, projectTitle: value })} />
        <Field label="Terms of payment" value={estimate.paymentTerms} onChange={(value) => onChange({ ...estimate, paymentTerms: value })} />
        <Field label="Prepared by" value={estimate.preparedBy} onChange={(value) => onChange({ ...estimate, preparedBy: value })} />
      </div>
      <datalist id="client-options">{clientNames.map((name) => <option key={name} value={name} />)}</datalist>

      <LineSection title="External Cost" onAdd={onAddExternal}>
        {estimate.externalLines.map((line, index) => (
          <div className="grid gap-3 rounded-xl border border-red-100/10 bg-black/24 p-3" key={line.id}>
            <p className="text-xs uppercase tracking-[0.25em] text-red-100/50">Line {index + 1}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Item" value={line.item} onChange={(value) => onUpdateExternal(line.id, { item: value })} />
              <Field label="Supplier" value={line.supplierName} onChange={(value) => onUpdateExternal(line.id, { supplierName: value })} />
              <Field label="Invoice number" value={line.invoiceNumber} onChange={(value) => onUpdateExternal(line.id, { invoiceNumber: value })} />
              <Field label="Estimated cost" type="number" value={line.estimatedCost} onChange={(value) => onUpdateExternal(line.id, { estimatedCost: value })} />
              <Field label="Billed" type="number" value={line.billedAmount} onChange={(value) => onUpdateExternal(line.id, { billedAmount: value })} />
              <Field label="Actual" type="number" value={line.actualCost} onChange={(value) => onUpdateExternal(line.id, { actualCost: value })} />
              <TextArea label="Description" value={line.description} onChange={(value) => onUpdateExternal(line.id, { description: value })} />
              <TextArea label="Remarks" value={line.remarks} onChange={(value) => onUpdateExternal(line.id, { remarks: value })} />
            </div>
            <p className="text-sm text-red-50/70">Profit {money(externalProfit(line), estimate.currency)} / Margin {percent(externalMargin(line))}</p>
          </div>
        ))}
      </LineSection>

      <LineSection title="Internal Cost" onAdd={onAddInternal}>
        {estimate.internalLines.map((line, index) => (
          <div className="grid gap-3 rounded-xl border border-red-100/10 bg-black/24 p-3" key={line.id}>
            <p className="text-xs uppercase tracking-[0.25em] text-red-100/50">Line {index + 1}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Item" value={line.item} onChange={(value) => onUpdateInternal(line.id, { item: value })} />
              <Field label="Cost" type="number" value={line.cost} onChange={(value) => onUpdateInternal(line.id, { cost: value })} />
              <Field label="Units" type="number" value={line.units} onChange={(value) => onUpdateInternal(line.id, { units: value })} />
              <TextArea label="Description" value={line.description} onChange={(value) => onUpdateInternal(line.id, { description: value })} />
            </div>
            <p className="text-sm text-red-50/70">Billed {money(internalBilled(line), estimate.currency)}</p>
          </div>
        ))}
      </LineSection>

      <Summary
        items={[
          ["External billed", money(totals.external.billed, estimate.currency)],
          ["Internal billed", money(totals.internal.billed, estimate.currency)],
          ["Amount to be billed", money(totals.amountToBeBilled, estimate.currency)],
          ["Total profit", money(totals.totalProfit, estimate.currency)],
          ["Gross margin", percent(totals.grossMargin)],
          ["Status", estimate.status],
          ["Xero", estimate.xeroStatus]
        ]}
      />
      <Status errors={errors} status={status} />
      <div className="flex flex-wrap gap-3">
        <button className={actionClass} onClick={() => onChange(blankEstimate(session))} type="button">New</button>
        <button className={actionClass} onClick={() => onSave("Draft")} type="button">Save draft</button>
        <button className={actionClass} disabled={session?.role !== "admin"} onClick={() => onSave("Submitted for Approval")} type="button">Submit</button>
        <button className={actionClass} disabled={!["admin", "reviewer"].includes(session?.role || "") || estimate.status !== "Submitted for Approval"} onClick={() => onSave("Approved", "Ready for Xero")} type="button">Approve</button>
        <button className={actionClass} disabled={!["admin", "reviewer"].includes(session?.role || "") || estimate.status !== "Submitted for Approval"} onClick={() => onSave("Rejected", "Not ready")} type="button">Reject</button>
        <button className={actionClass} disabled={estimate.status !== "Approved"} onClick={() => onSave("Approved", "Mock exported")} type="button">Mark exported</button>
      </div>

      <SavedList items={saved} onLoad={onLoad} renderTitle={(item) => item.projectTitle || "Untitled estimate"} renderMeta={(item) => `${item.clientName || "No client"} / ${item.status} / ${money(estimateTotals(item).amountToBeBilled, item.currency)}`} />
    </div>
  );
}

function PaymentRequests({
  emailPreview,
  errors,
  estimate,
  estimates,
  onChange,
  onLoad,
  onNew,
  onSave,
  payment,
  payments,
  session,
  status,
  vendor,
  vendors
}: {
  emailPreview: string;
  errors: string[];
  estimate?: Estimate;
  estimates: Estimate[];
  onChange: (payment: PaymentRequest) => void;
  onLoad: (payment: PaymentRequest) => void;
  onNew: () => void;
  onSave: (status: PaymentStatus) => void;
  payment: PaymentRequest;
  payments: PaymentRequest[];
  session: Session | null;
  status: string;
  vendor?: Vendor;
  vendors: Vendor[];
}) {
  const amount = paymentAmount(payment);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Vendor name
          <select className={inputClass} value={payment.vendorId} onChange={(event) => onChange({ ...payment, vendorId: event.target.value })}>
            <option value="">Select...</option>
            {vendors.map((item) => <option key={item.id} value={item.id}>{item.vendorName}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          Job number / estimate
          <select
            className={inputClass}
            value={payment.estimateId}
            onChange={(event) => {
              const nextEstimate = estimates.find((item) => item.id === event.target.value);
              onChange({
                ...payment,
                estimateId: event.target.value,
                currency: nextEstimate?.currency || "SGD",
                attributionLineId: ""
              });
            }}
          >
            <option value="">Select...</option>
            {estimates.map((item) => <option key={item.id} value={item.id}>{estimateLabel(item)}</option>)}
          </select>
        </label>
        <Field label="Subtotal, excluding all tax" type="number" value={payment.subtotal} onChange={(value) => onChange({ ...payment, subtotal: value })} />
        <Field label="PPH21/23" type="number" value={payment.pph} onChange={(value) => onChange({ ...payment, pph: value })} />
        <Field label="PPN / VAT" type="number" value={payment.ppn} onChange={(value) => onChange({ ...payment, ppn: value })} />
        <Field label="Due date" type="date" value={payment.dueDate} onChange={(value) => onChange({ ...payment, dueDate: value })} />
        <Field label="Invoice number" value={payment.invoiceNumber} onChange={(value) => onChange({ ...payment, invoiceNumber: value })} />
        <label className={labelClass}>
          Attribute to external cost line
          <select className={inputClass} value={payment.attributionLineId} onChange={(event) => onChange({ ...payment, attributionLineId: event.target.value })}>
            <option value="">Select...</option>
            {(estimate?.externalLines || []).map((line, index) => (
              <option key={line.id} value={line.id}>{index + 1}. {line.supplierName || line.item || "External cost"} / {money(line.billedAmount || line.estimatedCost || 0, estimate?.currency || "SGD")}</option>
            ))}
          </select>
        </label>
        <TextArea label="Admin note / rejection reason" value={payment.reviewerNote} onChange={(value) => onChange({ ...payment, reviewerNote: value })} />
      </div>
      <Summary
        items={[
          ["Vendor", vendor?.vendorName || "Not selected"],
          ["Estimate", estimate ? estimateLabel(estimate) : "Not selected"],
          ["Subtotal", money(payment.subtotal, payment.currency)],
          ["PPH21/23", money(payment.pph, payment.currency)],
          ["PPN / VAT", money(payment.ppn, payment.currency)],
          ["Final payable", money(amount, payment.currency)]
        ]}
      />
      <Status errors={errors} status={status} />
      <div className="flex flex-wrap gap-3">
        <button className={actionClass} onClick={onNew} type="button">New</button>
        <button className={actionClass} onClick={() => onSave("Submitted")} type="button">Submit request</button>
        <button className={actionClass} disabled={session?.role !== "admin" || payment.status !== "Submitted" || !payment.id} onClick={() => onSave("Approved")} type="button">Approve</button>
        <button className={actionClass} disabled={session?.role !== "admin" || payment.status !== "Submitted" || !payment.id} onClick={() => onSave("Rejected")} type="button">Reject</button>
      </div>
      <SavedList items={payments} onLoad={onLoad} renderTitle={(item) => item.vendorName || "Unknown vendor"} renderMeta={(item) => `${item.status} / ${item.invoiceNumber} / ${money(item.amount, item.currency)}`} />
      <pre className="rounded-2xl border border-red-100/10 bg-black/35 p-4 text-xs leading-6 text-red-50/75">{emailPreview}</pre>
    </div>
  );
}

function Field({
  datalist,
  label,
  onBlur,
  onChange,
  type = "text",
  value
}: {
  datalist?: string;
  label: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input className={inputClass} list={datalist} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className={labelClass}>
      {label}
      <textarea className={inputClass} onChange={(event) => onChange(event.target.value)} rows={3} value={value} />
    </label>
  );
}

function Summary({ items }: { items: [string, string][] }) {
  return (
    <dl className={sectionClass + " grid gap-3 sm:grid-cols-2"}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-[0.22em] text-red-100/45">{label}</dt>
          <dd className="mt-1 text-sm font-semibold text-red-50/85">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Status({ errors, status }: { errors: string[]; status: string }) {
  return (
    <div className="space-y-2">
      {status && <p className="text-sm font-semibold text-red-100">{status}</p>}
      {errors.length > 0 && (
        <ul className="grid gap-1 text-sm text-red-200">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.22em] text-red-100/42">{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-red-100/10 bg-black/28 p-4 text-sm text-red-50/68">{children}</div>;
}

function LineSection({ children, onAdd, title }: { children: React.ReactNode; onAdd: () => void; title: string }) {
  return (
    <section className={sectionClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black">{title}</h3>
        <button className={actionClass} onClick={onAdd} type="button">Add</button>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function SavedList<T extends { id: string }>({
  items,
  onLoad,
  renderMeta,
  renderTitle
}: {
  items: T[];
  onLoad: (item: T) => void;
  renderMeta: (item: T) => string;
  renderTitle: (item: T) => string;
}) {
  if (!items.length) return <EmptyState>No saved records yet.</EmptyState>;
  return (
    <section className={sectionClass}>
      <h3 className="mb-3 text-lg font-black">Saved Records</h3>
      <div className="grid gap-3">
        {items.map((item) => (
          <article className="flex items-center justify-between gap-3 rounded-xl border border-red-100/10 bg-black/24 p-3" key={item.id}>
            <div>
              <h4 className="font-bold">{renderTitle(item)}</h4>
              <p className="mt-1 text-sm text-red-50/60">{renderMeta(item)}</p>
            </div>
            <button className={actionClass} onClick={() => onLoad(item)} type="button">Open</button>
          </article>
        ))}
      </div>
    </section>
  );
}

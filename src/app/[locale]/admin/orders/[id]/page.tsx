import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getAdminOrder } from "@/lib/admin/orders";
import { requireAdminPage } from "@/lib/auth/admin";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import type { OrderStatus } from "@/lib/supabase/types";
import { getDictionary } from "../../../dictionaries";
import { ManualActivateForm } from "../_components/manual-activate-form";
import { CancelOrderForm } from "../_components/cancel-order-form";
import { ScheduleEditorForm } from "../_components/schedule-editor-form";
import { RefundButton } from "@/app/[locale]/admin/_components/refund-button";

type PageParams = Promise<{ locale: string; id: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.orders.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return null;
  await requireAdminPage(locale);

  const order = await getAdminOrder(id, locale);
  if (!order) notFound();

  const dict = await getDictionary(locale);
  const t = dict.admin.orders;

  const today = new Date().toISOString().slice(0, 10);
  const displayName =
    [order.user.first_name, order.user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || order.user.phone;

  const unpaidInstallments = order.installments.filter((i) => i.paidAt === null);
  const canEditSchedule = order.status === "active" && unpaidInstallments.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/${locale}/admin/orders`}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          {t.detail.back}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {order.product.name}
          </h1>
          <StatusPill status={order.status} labels={t.detail.statusLabels} />
        </div>
        <p className="mt-1 font-mono text-[12px] text-muted-foreground">
          {order.reference}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <Card heading={t.detail.sectionCustomer}>
            <div className="flex items-center gap-4">
              {order.product.image ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background/40">
                  <Image
                    src={order.product.image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/admin/users/${order.user.id}`}
                  className="text-[15px] font-medium hover:underline"
                >
                  {displayName}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  +{order.user.phone}
                  {order.user.email ? ` · ${order.user.email}` : ""}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {formatDate(order.createdAt, locale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {order.activatedAt
                    ? ` · ${t.detail.labels.activatedAt} ${formatDate(order.activatedAt, locale, {
                        day: "2-digit",
                        month: "short",
                      })}`
                    : ""}
                </p>
              </div>
            </div>
          </Card>

          <Card heading={t.detail.sectionBreakdown}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={t.detail.labels.cashPrice}>
                {formatTzs(order.cashPriceTzs, locale)}
              </Field>
              <Field label={t.detail.labels.deposit}>
                {formatTzs(order.depositTzs, locale)}
              </Field>
              <Field label={t.detail.labels.financed}>
                {formatTzs(order.financedTzs, locale)}
              </Field>
              <Field label={t.detail.labels.serviceFee}>
                {formatTzs(order.serviceFeeTzs, locale)}
              </Field>
              <Field label={t.detail.labels.total}>
                {formatTzs(order.totalTzs, locale)}
              </Field>
              <Field label={t.detail.labels.monthly}>
                {formatTzs(order.monthlyTzs, locale)} ·{" "}
                {t.list.termLabel.replace("{n}", String(order.termMonths))}
              </Field>
            </dl>
          </Card>

          <Card heading={t.detail.sectionInstallments}>
            {order.installments.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                {t.detail.installmentsEmpty}
              </p>
            ) : (
              <ScheduleEditorForm
                orderId={order.id}
                locale={locale}
                editable={canEditSchedule}
                today={today}
                installments={order.installments}
              />
            )}
          </Card>

          <Card heading={t.detail.sectionPayments}>
            {order.payments.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                {t.detail.paymentsEmpty}
              </p>
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
                {order.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {t.detail.paymentKind[p.kind]}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDate(p.createdAt, locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {p.provider}
                        {p.evmarkRef ? ` · ${p.evmarkRef}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatTzs(p.amountTzs, locale)}</p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          p.status === "success"
                            ? "text-emerald-400"
                            : p.status === "failed"
                              ? "text-rose-400"
                              : "text-amber-400"
                        }`}
                      >
                        {t.detail.paymentStatus[p.status]}
                      </p>
                    </div>
                    {p.status === "success" && p.kind !== "refund" ? (
                      <RefundButton
                        paymentId={p.id}
                        maxAmountTzs={p.amountTzs}
                        locale={locale}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          {order.status === "pending" ? (
            <>
              <ManualActivateForm
                orderId={order.id}
                locale={locale}
                hasPendingDeposit={order.pendingDepositPaymentId !== null}
              />
              <CancelOrderForm orderId={order.id} locale={locale} />
            </>
          ) : null}

          <div className="rounded-3xl border border-border/60 bg-card p-6 text-[12px] text-muted-foreground">
            <p className="font-mono">{order.reference}</p>
            <p className="mt-1">
              {t.detail.labels.createdAt}:{" "}
              {formatDate(order.createdAt, locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            {order.activatedAt ? (
              <p>
                {t.detail.labels.activatedAt}:{" "}
                {formatDate(order.activatedAt, locale, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {heading}
      </h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-[14px]">{children}</dd>
    </div>
  );
}

function StatusPill({
  status,
  labels,
}: {
  status: OrderStatus;
  labels: { pending: string; active: string; completed: string; cancelled: string };
}) {
  const tone =
    status === "active"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "completed"
        ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
        : status === "cancelled"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${tone}`}
    >
      {labels[status]}
    </span>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getAdminUser } from "@/lib/admin/users";
import { requireAdminPage } from "@/lib/auth/admin";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import { getDictionary } from "../../../dictionaries";
import { CreditLimitForm } from "../_components/credit-limit-form";
import { AdminRoleForm } from "../_components/admin-role-form";

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
    title: dict.admin.users.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return null;

  const ctx = await requireAdminPage(locale);
  const user = await getAdminUser(id, locale);
  if (!user) notFound();

  const dict = await getDictionary(locale);
  const t = dict.admin.users;

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.phone;
  const joined = formatDate(user.created_at, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const orderStatusLabels = t.detail.orderStatus;
  const paymentStatusLabels = t.detail.paymentStatus;
  const paymentKindLabels = t.detail.paymentKind;
  const kycStatusLabels = t.detail.kycStatus;

  const isSelf = ctx.userId === user.id;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/${locale}/admin/users`}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          {t.detail.back}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {displayName}
          </h1>
          {user.is_root ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-300">
              {t.list.rootBadge}
            </span>
          ) : user.is_admin ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-300">
              {t.list.adminBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 font-mono text-[12px] text-muted-foreground">+{user.phone}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <Card heading={t.detail.sectionProfile}>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.detail.labels.name}>
                {displayName === user.phone ? (
                  <span className="text-muted-foreground">{t.detail.labels.noName}</span>
                ) : (
                  displayName
                )}
              </Field>
              <Field label={t.detail.labels.email}>
                {user.email ?? (
                  <span className="text-muted-foreground">{t.detail.labels.noEmail}</span>
                )}
              </Field>
              <Field label={t.detail.labels.kyc}>
                <KycPill status={user.kyc_status} labels={kycStatusLabels} />
              </Field>
              <Field label={t.detail.labels.joined}>{joined}</Field>
              <Field label={t.detail.labels.creditLimit}>
                {formatTzs(user.credit_limit_tzs, locale)}
              </Field>
              <Field label={t.detail.labels.creditPoints}>
                {user.credit_points.toLocaleString()}
              </Field>
            </dl>
          </Card>

          <Card heading={t.detail.sectionWallet}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label={t.detail.wallet.balance}>
                {formatTzs(user.wallet?.balance.balanceTzs ?? 0, locale)}
              </Field>
              <Field label={t.detail.wallet.totalPaid}>
                {formatTzs(user.wallet?.balance.totalPaidTzs ?? 0, locale)}
              </Field>
              <Field label={t.detail.wallet.totalOwed}>
                {formatTzs(user.wallet?.balance.totalOwedTzs ?? 0, locale)}
              </Field>
              <Field label={t.detail.wallet.nextDue}>
                {user.wallet?.balance.nextDueDate ? (
                  <span>
                    {formatTzs(user.wallet.balance.nextDueTzs, locale)}
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      ·{" "}
                      {formatDate(user.wallet.balance.nextDueDate, locale, {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t.detail.wallet.nextDueEmpty}
                  </span>
                )}
              </Field>
            </dl>
          </Card>

          <Card heading={t.detail.sectionOrders}>
            {user.orders.orders.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t.detail.ordersEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {user.orders.orders.slice(0, 10).map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">
                        {order.productName}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {order.reference} · {order.monthsPaid}/{order.termMonths}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-medium">
                        {formatTzs(order.principalTzs, locale)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {orderStatusLabels[
                          order.status as keyof typeof orderStatusLabels
                        ] ?? order.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card heading={t.detail.sectionPayments}>
            {user.payments.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t.detail.paymentsEmpty}</p>
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
                {user.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {paymentKindLabels[p.kind]}{" "}
                        {p.order ? (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            · {p.order.reference}
                          </span>
                        ) : null}
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
                              : "text-muted-foreground"
                        }`}
                      >
                        {paymentStatusLabels[p.status]}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card heading={t.detail.sectionKyc}>
            {user.kyc_history.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t.detail.kycEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {user.kyc_history.map((k) => (
                  <li key={k.id}>
                    <Link
                      href={`/${locale}/admin/kyc/${k.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 text-[13px] transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {k.legal_first_name} {k.legal_last_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(k.submitted_at, locale, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <KycPill status={k.status} labels={kycStatusLabels} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <CreditLimitForm
            userId={user.id}
            locale={locale}
            currentLimitTzs={user.credit_limit_tzs}
          />
          {ctx.isRoot && !isSelf && !user.is_root ? (
            <AdminRoleForm userId={user.id} locale={locale} isAdmin={user.is_admin} />
          ) : null}
          {!ctx.isRoot ? (
            <div className="rounded-3xl border border-border/60 bg-card p-6 text-[12px] text-muted-foreground">
              {t.adminRole.rootOnlyNote}
            </div>
          ) : isSelf ? (
            <div className="rounded-3xl border border-border/60 bg-card p-6 text-[12px] text-muted-foreground">
              {t.adminRole.selfLocked}
            </div>
          ) : user.is_root ? (
            <div className="rounded-3xl border border-border/60 bg-card p-6 text-[12px] text-muted-foreground">
              {t.adminRole.rootLocked}
            </div>
          ) : null}
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

function KycPill({
  status,
  labels,
}: {
  status: "none" | "pending" | "approved" | "rejected";
  labels: { none: string; pending: string; approved: string; rejected: string };
}) {
  const tone =
    status === "approved"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "pending"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : status === "rejected"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-border/60 text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${tone}`}
    >
      {labels[status]}
    </span>
  );
}

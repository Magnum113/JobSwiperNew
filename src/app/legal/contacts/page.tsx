import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SELLER, SERVICE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Реквизиты и контакты | JobSwiper",
  description: "Реквизиты продавца, контакты поддержки и сведения об ИП.",
  alternates: { canonical: "/legal/contacts" },
};

export default function ContactsPage() {
  return (
    <LegalPage
      title="Реквизиты и контакты"
      description="Сведения о продавце цифровых услуг JobSwiper, контакты поддержки и порядок обращений."
    >
      <LegalSection title="1. Продавец">
        <div className="overflow-hidden rounded-xl border border-border/70">
          <dl className="divide-y divide-border/70 text-sm">
            <div className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-muted-foreground">Наименование</dt>
              <dd>{SELLER.name}</dd>
            </div>
            <div className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-muted-foreground">ИНН</dt>
              <dd>{SELLER.inn}</dd>
            </div>
            <div className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-muted-foreground">ОГРНИП</dt>
              <dd>{SELLER.ogrnip}</dd>
            </div>
            <div className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-muted-foreground">Адрес</dt>
              <dd>{SELLER.address}</dd>
            </div>
            <div className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-muted-foreground">
                Налогообложение
              </dt>
              <dd>{SELLER.taxSystem}</dd>
            </div>
          </dl>
        </div>
      </LegalSection>

      <LegalSection title="2. Контакты поддержки">
        <LegalList
          items={[
            `Email: ${SELLER.email}`,
            `Сайт: ${SERVICE.siteUrl}`,
            `Время обработки обращений: ${SERVICE.supportHours}`,
          ]}
        />
        <p>
          Для вопросов по оплате укажите дату платежа, сумму, выбранный пакет и
          email аккаунта. Никогда не отправляйте полные данные банковской карты.
        </p>
      </LegalSection>

      <LegalSection title="3. Продаваемая услуга">
        <p>
          JobSwiper предоставляет цифровую услугу: разовые пакеты лимитов для
          использования функций сервиса, включая подбор вакансий, анализ
          соответствия резюме и подготовку сопроводительных писем с помощью ИИ.
        </p>
        <p>
          Услуга оказывается онлайн. Материальная доставка товара не
          осуществляется.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

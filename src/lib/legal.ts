export const SELLER = {
  name: "Индивидуальный предприниматель Кадимагомедов Магомедсайгид Алиевич",
  shortName: "ИП Кадимагомедов М. А.",
  inn: "053602598018",
  ogrnip: "325050000200836",
  address:
    "368260, Россия, Республика Дагестан, Хунзахский район, с. Геничутль, ул. Инквачилаева, д. 9",
  email: "smmshit@ya.ru",
  taxSystem: "УСН, объект налогообложения «доходы», ставка 6%",
} as const;

export const SERVICE = {
  siteUrl: "https://jobswiper.ru",
  name: "JobSwiper",
  productName: "пакет лимитов JobSwiper",
  validity: "12 месяцев с момента успешной оплаты",
  supportHours: "ежедневно с 10:00 до 19:00 по московскому времени",
} as const;

export const LEGAL_LINKS = [
  { href: "/legal/offer", label: "Оферта" },
  { href: "/legal/refund", label: "Возвраты" },
  { href: "/legal/privacy", label: "Конфиденциальность" },
  { href: "/legal/personal-data", label: "Персональные данные" },
  { href: "/legal/contacts", label: "Реквизиты" },
] as const;

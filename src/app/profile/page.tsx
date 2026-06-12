import type { Metadata } from "next";
import { SunMoon } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButtons } from "@/components/profile/auth-buttons";
import { PaymentStatusBridge } from "@/components/profile/payment-status-bridge";
import { ResumeForm } from "@/components/profile/resume-form";
import { UpgradeCard } from "@/components/profile/upgrade-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Личный кабинет",
  description: "Личный кабинет JobSwiper: аккаунт, резюме, лимиты и оплата.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-4xl">
      <PaymentStatusBridge />
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <BrandMark />
      </header>

      <div className="px-4 py-4">
        <div className="pb-4 pt-1">
          <h1 className="text-2xl font-bold tracking-tight">Личный кабинет</h1>
        </div>

        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
          <div className="lg:col-start-1 lg:row-start-1">
            <UpgradeCard />
          </div>

          <Card className="lg:col-start-1 lg:row-start-2">
            <CardHeader>
              <CardTitle>Аккаунт</CardTitle>
            </CardHeader>
            <CardContent>
              <AuthButtons />
            </CardContent>
          </Card>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3">
            <ResumeForm />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 lg:col-start-1 lg:row-start-3">
            <div className="flex items-center gap-2.5">
              <SunMoon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Оформление</p>
                <p className="text-xs text-muted-foreground">
                  Светлая или тёмная тема
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

import { SunMoon } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButtons } from "@/components/profile/auth-buttons";
import { HhResumeImport } from "@/components/profile/hh-resume-import";
import { ResumeForm } from "@/components/profile/resume-form";
import { UpgradeCard } from "@/components/profile/upgrade-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <BrandMark />
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="pt-1">
          <h1 className="text-2xl font-bold tracking-tight">Личный кабинет</h1>
        </div>

        <UpgradeCard />

        <Card>
          <CardHeader>
            <CardTitle>Аккаунт</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthButtons />
          </CardContent>
        </Card>

        <ResumeForm />
        <HhResumeImport />

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
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
  );
}

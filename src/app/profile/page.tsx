import { SunMoon } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButtons } from "@/components/profile/auth-buttons";
import { ResumeForm } from "@/components/profile/resume-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <BrandMark />
      </header>

      <div className="space-y-5 px-4 py-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Личный кабинет</h1>
          <p className="text-sm text-muted-foreground">
            Резюме и аккаунт. Данные сохраняются в облаке (Supabase).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Аккаунт</CardTitle>
            <CardDescription>
              Войдите, чтобы синхронизировать отклики между устройствами.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthButtons />
          </CardContent>
        </Card>

        <ResumeForm />

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

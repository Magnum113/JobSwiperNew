import { NextResponse } from "next/server";
import { extractResumeText, ExtractError } from "@/lib/resume-extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Файл слишком большой (максимум 8 МБ)" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const text = await extractResumeText({
      name: file.name,
      type: file.type,
      buffer,
    });

    if (text.length < 30) {
      return NextResponse.json(
        {
          error:
            "В файле почти нет текста. Возможно, это скан — вставьте текст резюме вручную.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text, name: file.name });
  } catch (err) {
    const status = err instanceof ExtractError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Не удалось обработать файл";
    return NextResponse.json({ error: message }, { status });
  }
}

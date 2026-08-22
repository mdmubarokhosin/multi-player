"use client";

import { useEffect, useState } from "react";

import { MailComponent } from "./_components/mail";
import { DEFAULT_MAIL_LAYOUT, MAIL_LAYOUT_COOKIE } from "./_components/mail-layout-config";
import { mails } from "./_components/data";

export default function MailPage() {
  const [defaultLayout, setDefaultLayout] = useState<number[]>([...DEFAULT_MAIL_LAYOUT]);

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${MAIL_LAYOUT_COOKIE}=`));
    if (match) {
      try {
        setDefaultLayout(JSON.parse(match.split("=")[1]));
      } catch {
        // use default
      }
    }
  }, []);

  return (
    <div className="h-dvh min-h-0 overflow-hidden">
      <MailComponent mails={mails} defaultLayout={defaultLayout} />
    </div>
  );
}

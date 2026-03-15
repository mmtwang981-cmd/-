import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Love Mail",
  description: "根据天气、新闻和人物语气生成晨间爱意，并按时发送邮件。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

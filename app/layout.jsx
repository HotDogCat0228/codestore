import './globals.css';

export const metadata = {
  title: 'CodeStore',
  description: '本地程式碼檔案管理系統',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="h-screen overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
        {children}
      </body>
    </html>
  );
}

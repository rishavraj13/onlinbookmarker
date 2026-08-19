/// <reference types="astro/client" />

interface AppUser {
  id: string;
  email?: string;
}

interface Window {
  currentUser: AppUser | null;
  lucide: any;
  html2pdf: any;
  docx: any;
  PptxGenJS: any;
}

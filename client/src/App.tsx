import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return <ThemeProvider defaultTheme="dark"><TooltipProvider><Home /><Toaster theme="dark" position="top-right" richColors /></TooltipProvider></ThemeProvider>;
}

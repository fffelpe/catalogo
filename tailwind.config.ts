import type { Config } from "tailwindcss";

// Tokens de design do Catálogo de Mídias — TV Cultura Jornalismo
// Conceito: acervo de fitas / arquivo de redação. Ver README para racional completo.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5EF", // fundo — papel de redação, não branco puro
        ink: "#171A16", // texto principal
        muted: "#6E6C62", // texto secundário / metadados
        cultura: {
          DEFAULT: "#0E7A54", // verde institucional (referência ao logo)
          dark: "#0A5E41",
        },
        signal: "#E2A33B", // âmbar — destaque, "ao vivo", tags ativas
        line: "#DDD9CC", // bordas e divisores
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        tape: "3px", // cantos quase retos — remete a etiqueta de fita, não a app
      },
    },
  },
  plugins: [],
};

export default config;

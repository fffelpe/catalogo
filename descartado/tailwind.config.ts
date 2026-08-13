import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Verde do logo/marca — usado só no logo e em pequenos destaques.
        cultura: "#17A374",
        // Cinza do campo de busca no Figma (Rectangle 1).
        searchbg: "#E4E4E4",
        line: "#B9B9B9",
        muted: "#5B5B5B",
      },
      fontFamily: {
        body: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

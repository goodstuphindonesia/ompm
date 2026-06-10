import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        ember: "0 20px 80px rgba(160, 12, 26, 0.34)"
      },
      fontFamily: {
        brush: [
          "KaiTi",
          "STKaiti",
          "Songti SC",
          "Noto Serif CJK SC",
          "serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;

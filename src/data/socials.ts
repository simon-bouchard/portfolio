export type Social = {
  label: string;
  href: string;
  handle?: string;
};

export const socials: Social[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/simon-bouchard-54580b339" },
  { label: "GitHub",   href: "https://github.com/simon-bouchard" },
  { label: "Kaggle",   href: "https://www.kaggle.com/simonbouchardk" },
  // add/remove as needed:
  { label: "Fast.ai Forums", href: "https://forums.fast.ai/u/simonb/summary" },
  // { label: "X (Twitter)", href: "https://x.com/<your-handle>" },
  // { label: "Hugging Face", href: "https://huggingface.co/<your-handle>" },
  // { label: "Google Scholar", href: "https://scholar.google.com/citations?user=<id>" },
];

